import NetInfo from '@react-native-community/netinfo';
import { getPendingSyncQueue, markSynced, markConflict } from '../utils/db';

// ─── Configuration ────────────────────────────────────────────────────────────

// How many times to retry a failed item before giving up and marking conflict
const MAX_ATTEMPTS = 3;

// Swap this base URL for your real API once the backend exists.
// The sync engine is the ONLY place in the app that touches the network for
// data — screens only ever read/write SQLite.
const API_BASE = 'https://your-api.com'; // TODO: move to env config

// ─── Sync engine ─────────────────────────────────────────────────────────────

let _isSyncing = false;

/**
 * Drain the local sync queue for a given user.
 *
 * Flow:
 *   1. Check connectivity — bail immediately if offline.
 *   2. Load all pending queue entries (oldest first).
 *   3. For each entry, POST to the server.
 *   4. On success  → markSynced()   (removes from queue, stamps synced_at)
 *   5. On failure  → markConflict() (increments attempts, stores error)
 *      If attempts >= MAX_ATTEMPTS the entry stays in the queue with
 *      sync_status = 'conflict' so the UI can surface it.
 *
 * This is safe to call multiple times concurrently — the _isSyncing guard
 * ensures only one drain runs at a time.
 */
export async function syncPendingWorkouts(userId) {
  if (_isSyncing) return;

  const net = await NetInfo.fetch();
  if (!net.isConnected) return;

  _isSyncing = true;

  try {
    const queue = await getPendingSyncQueue(userId);
    if (queue.length === 0) return;

    for (const entry of queue) {
      // Skip items that have already failed too many times
      if (entry.attempts >= MAX_ATTEMPTS) continue;

      try {
        const payload = entry.payload ? JSON.parse(entry.payload) : null;

        await pushToServer(entry.table_name, entry.operation, payload, userId);

        await markSynced(userId, entry.table_name, entry.row_id, entry.id);
      } catch (err) {
        await markConflict(entry.id, err?.message ?? 'Unknown error');
      }
    }
  } finally {
    _isSyncing = false;
  }
}

/**
 * Subscribe to network changes and sync whenever the device comes online.
 * Call this once at app startup (e.g. inside App.jsx or a top-level effect).
 * Returns an unsubscribe function — call it when the component unmounts.
 *
 * Usage:
 *   useEffect(() => {
 *     const unsub = startSyncOnReconnect(userId);
 *     return unsub;
 *   }, [userId]);
 */
export function startSyncOnReconnect(userId) {
  const unsub = NetInfo.addEventListener(state => {
    if (state.isConnected) {
      syncPendingWorkouts(userId);
    }
  });
  return unsub;
}

// ─── Server communication ─────────────────────────────────────────────────────

/**
 * Push a single queue entry to the server.
 *
 * The server is expected to implement two endpoints:
 *
 *   PUT  /sync/:table/:rowId   — upsert a row (last-write-wins on updated_at)
 *   DELETE /sync/:table/:rowId — soft-delete acknowledgement
 *
 * Both return 200 on success, 409 on conflict (server has a newer version).
 * Any other status is treated as a retryable error.
 *
 * TODO: add auth headers once accounts are implemented.
 *       e.g. Authorization: Bearer <session.access_token>
 */
async function pushToServer(tableName, operation, payload, userId) {
  const url = `${API_BASE}/sync/${tableName}/${payload?.id ?? 'unknown'}`;

  const method = operation === 'delete' ? 'DELETE' : 'PUT';

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      // 'Authorization': `Bearer ${await getAccessToken()}`,
      'X-User-Id': userId,
    },
    body: method !== 'DELETE' ? JSON.stringify(payload) : undefined,
  });

  if (res.status === 409) {
    // Server has a newer version — not a retryable error, mark as conflict
    const body = await res.json().catch(() => ({}));
    throw new ConflictError(body.message ?? 'Server has a newer version');
  }

  if (!res.ok) {
    throw new Error(`Server returned ${res.status}`);
  }
}

// ─── Custom error types ───────────────────────────────────────────────────────

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
  }
}
