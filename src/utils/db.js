import * as SQLite from 'expo-sqlite';
import { EXERCISES } from '../data/exercises';
import { generateId } from './id';

// ─── DB singleton ────────────────────────────────────────────────────────────
// One connection for the lifetime of the app. WAL mode means reads never block
// writes, which matters once a background sync thread is writing concurrently.

let _db = null;

export async function getDb() {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('w8.db');
  await migrate(_db);
  return _db;
}

// ─── Migrations ──────────────────────────────────────────────────────────────
//
// Rules:
//   • Never edit a migration that has already shipped — add a new one instead.
//   • Every migration must be idempotent (IF NOT EXISTS / OR IGNORE).
//   • Always insert into _migrations LAST so a crash mid-migration leaves the
//     version counter behind and the migration re-runs on next launch.

async function migrate(db) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY
    );
  `);

  const row = await db.getFirstAsync(`SELECT MAX(version) AS v FROM _migrations`);
  const currentVersion = row?.v ?? 0;

  // ── v2: accounts + offline-first sync ───────────────────────────────────
  //
  // Key design decisions:
  //
  //  1. user_id on every user-owned table.
  //     Rows are scoped to a user so the same local DB can safely cache data
  //     from a future multi-account scenario, and the sync layer always knows
  //     whose data it is dealing with.
  //
  //  2. updated_at on every mutable table.
  //     The sync engine compares `updated_at > last_synced_at` to find dirty
  //     rows. Without this, the only option is a full re-download on every sync.
  //
  //  3. deleted_at (soft deletes) instead of hard DELETE.
  //     If a user deletes a template on phone A while offline, and phone B syncs
  //     later, the server needs a tombstone to know the deletion happened.
  //     Hard-deleted rows leave no trace, so they would simply reappear after
  //     the next sync. All reads filter WHERE deleted_at IS NULL.
  //
  //  4. synced_at per row.
  //     Tracks when a row was last successfully pushed to the server. The sync
  //     engine queues rows where synced_at IS NULL OR synced_at < updated_at.
  //
  //  5. sync_status enum: 'pending' | 'synced' | 'conflict'.
  //     Gives the UI something to render (e.g. a cloud-pending indicator) and
  //     lets the conflict-resolution layer mark rows that need human attention.
  //
  //  6. workout_sets gains rpe + notes columns.
  //     They were tracked in JS state but never persisted to SQLite, so they
  //     were lost on app restart. Fixed here.
  //
  //  7. Indexes on (user_id, updated_at) for every synced table.
  //     The sync query "give me all rows for user X changed after timestamp T"
  //     is the single most frequent query once sync is running. Without this
  //     index it becomes a full-table scan.

  if (currentVersion < 2) {
    await db.execAsync(`
      -- ── Core exercise catalogue (shared, not user-scoped) ──────────────────
      CREATE TABLE IF NOT EXISTS exercises (
        id         TEXT PRIMARY KEY,
        name       TEXT NOT NULL,
        category   TEXT NOT NULL,
        muscle     TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      -- ── User profiles ───────────────────────────────────────────────────────
      -- One row per authenticated user. user_id matches the auth provider's UID
      -- (e.g. Supabase auth.users.id / Firebase UID) so joins are trivial.
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id              TEXT PRIMARY KEY,
        units                TEXT NOT NULL DEFAULT 'kg',
        height_cm            REAL,
        weight_kg            REAL,
        body_fat_percentage  REAL,
        fitness_goals        TEXT,
        created_at           TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at           TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        synced_at            TEXT,
        sync_status          TEXT NOT NULL DEFAULT 'pending'
      );

      -- ── Workout templates ───────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS templates (
        id          TEXT PRIMARY KEY,
        user_id     TEXT NOT NULL,
        name        TEXT NOT NULL,
        tag         TEXT NOT NULL DEFAULT '',
        created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        deleted_at  TEXT,
        synced_at   TEXT,
        sync_status TEXT NOT NULL DEFAULT 'pending'
      );

      CREATE TABLE IF NOT EXISTS template_exercises (
        id          TEXT PRIMARY KEY,
        template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL REFERENCES exercises(id),
        position    INTEGER NOT NULL DEFAULT 0
        -- Intentionally no sync columns: template_exercises are always
        -- replaced wholesale when their parent template changes, so the
        -- parent's updated_at / sync_status covers them.
      );

      -- ── Completed workouts ──────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS workouts (
        id          TEXT PRIMARY KEY,
        user_id     TEXT NOT NULL,
        name        TEXT NOT NULL,
        started_at  TEXT NOT NULL,
        finished_at TEXT,
        notes       TEXT,
        created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        deleted_at  TEXT,
        synced_at   TEXT,
        sync_status TEXT NOT NULL DEFAULT 'pending'
      );

      CREATE TABLE IF NOT EXISTS workout_exercises (
        id          TEXT PRIMARY KEY,
        workout_id  TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL,
        name        TEXT NOT NULL,
        muscle      TEXT NOT NULL,
        category    TEXT NOT NULL,
        position    INTEGER NOT NULL DEFAULT 0
        -- Same rationale as template_exercises: child rows are always
        -- replaced with their parent, so no independent sync columns needed.
      );

      CREATE TABLE IF NOT EXISTS workout_sets (
        id                  TEXT PRIMARY KEY,
        workout_exercise_id TEXT NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
        weight              REAL NOT NULL DEFAULT 0,
        reps                INTEGER NOT NULL DEFAULT 0,
        rpe                 REAL,
        notes               TEXT,
        position            INTEGER NOT NULL DEFAULT 0
      );

      -- ── Sync queue ──────────────────────────────────────────────────────────
      -- An explicit outbox that the sync engine drains. Decouples data writes
      -- from network activity: the app writes locally and returns immediately;
      -- a background task processes this queue when online.
      --
      -- operation: 'upsert' | 'delete'
      -- payload:   full JSON snapshot of the row at write time (for upserts).
      --            On conflict, the server compares payload.updated_at with the
      --            server row's updated_at and keeps the newer one.
      CREATE TABLE IF NOT EXISTS sync_queue (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        row_id     TEXT NOT NULL,
        operation  TEXT NOT NULL DEFAULT 'upsert',
        payload    TEXT,
        user_id    TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        attempts   INTEGER NOT NULL DEFAULT 0,
        last_error TEXT
      );

      -- ── Indexes ─────────────────────────────────────────────────────────────

      -- Template lookups by user (main screen load)
      CREATE INDEX IF NOT EXISTS idx_templates_user_updated
        ON templates(user_id, updated_at)
        WHERE deleted_at IS NULL;

      -- Template exercise order
      CREATE INDEX IF NOT EXISTS idx_template_exercises_template
        ON template_exercises(template_id, position);

      -- Workout history by user
      CREATE INDEX IF NOT EXISTS idx_workouts_user_finished
        ON workouts(user_id, finished_at DESC)
        WHERE deleted_at IS NULL;

      -- Workout child rows
      CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout
        ON workout_exercises(workout_id, position);

      CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise
        ON workout_sets(workout_exercise_id, position);

      -- Sync engine: find all unsynced rows for a user fast
      CREATE INDEX IF NOT EXISTS idx_templates_sync
        ON templates(user_id, sync_status)
        WHERE sync_status != 'synced';

      CREATE INDEX IF NOT EXISTS idx_workouts_sync
        ON workouts(user_id, sync_status)
        WHERE sync_status != 'synced';

      -- Sync queue drain order
      CREATE INDEX IF NOT EXISTS idx_sync_queue_user
        ON sync_queue(user_id, id);
    `);

    // Seed the shared exercise catalogue
    await db.withTransactionAsync(async () => {
      for (const ex of EXERCISES) {
        await db.runAsync(
          `INSERT OR IGNORE INTO exercises (id, name, category, muscle)
           VALUES (?, ?, ?, ?)`,
          [ex.id, ex.name, ex.category, ex.muscle]
        );
      }
    });

    await db.runAsync(`INSERT OR REPLACE INTO _migrations (version) VALUES (2)`);
  }

  
  // ── Sync static catalogue ───────────────────────────────────────────────
  if (currentVersion < 5) {
    await db.withTransactionAsync(async () => {
      for (const ex of EXERCISES) {
        await db.runAsync(
          `INSERT INTO exercises (id, name, category, muscle)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             name = excluded.name,
             category = excluded.category,
             muscle = excluded.muscle`,
          [ex.id, ex.name, ex.category, ex.muscle]
        );
      }
    });
    await db.runAsync(`INSERT OR REPLACE INTO _migrations (version) VALUES (5)`);
  }

  // ── Update exercise names & additions ───────────────────────────────────
  if (currentVersion < 6) {
    await db.withTransactionAsync(async () => {
      for (const ex of EXERCISES) {
        await db.runAsync(
          `INSERT INTO exercises (id, name, category, muscle)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             name = excluded.name,
             category = excluded.category,
             muscle = excluded.muscle`,
          [ex.id, ex.name, ex.category, ex.muscle]
        );
      }
    });
    await db.runAsync(`INSERT OR REPLACE INTO _migrations (version) VALUES (6)`);
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const now = () => new Date().toISOString();

// markSynced table name whitelist (SQL injection prevention).
// tableName comes from the sync_queue row which is written by app code, but
// whitelisting here ensures a corrupt or malicious queue entry can never
// execute arbitrary SQL through the dynamic UPDATE statement in markSynced().
const SYNCABLE_TABLES = new Set(['templates', 'workouts', 'user_profiles']);

/**
 * Enqueue a row for sync and mark it pending.
 * Called inside the same transaction as the data write so they succeed or fail
 * together — the queue is never out of step with the local data.
 */
async function enqueue(db, tableName, rowId, operation, payload, userId) {
  await db.runAsync(
    `INSERT INTO sync_queue (table_name, row_id, operation, payload, user_id)
     VALUES (?, ?, ?, ?, ?)`,
    [tableName, rowId, operation, payload ? JSON.stringify(payload) : null, userId]
  );
}

// ─── User profile ─────────────────────────────────────────────────────────────

export async function getProfile(userId) {
  const db = await getDb();
  const row = await db.getFirstAsync(
    `SELECT * FROM user_profiles WHERE user_id = ?`,
    [userId]
  );
  return row ?? { user_id: userId };
}

export async function upsertProfile(userId, fields) {
  const db = await getDb();
  const ts = now();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO user_profiles
         (user_id, units, height_cm, weight_kg, body_fat_percentage, fitness_goals,
          updated_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
       ON CONFLICT(user_id) DO UPDATE SET
         units               = excluded.units,
         height_cm           = excluded.height_cm,
         weight_kg           = excluded.weight_kg,
         body_fat_percentage = excluded.body_fat_percentage,
         fitness_goals       = excluded.fitness_goals,
         updated_at          = excluded.updated_at,
         sync_status         = 'pending'`,
      [
        userId,
        fields.units ?? 'kg',
        fields.heightCm ?? null,
        fields.weightKg ?? null,
        fields.bodyFatPercentage ?? null,
        fields.fitnessGoals ?? null,
        ts,
      ]
    );

    const profile = await db.getFirstAsync(
      `SELECT * FROM user_profiles WHERE user_id = ?`, [userId]
    );
    await enqueue(db, 'user_profiles', userId, 'upsert', profile, userId);
  });
}

// ─── Templates ────────────────────────────────────────────────────────────────

/**
 * Returns all non-deleted templates for a user, with their full exercise list.
 * Only ever reads rows where deleted_at IS NULL — soft-deleted rows are
 * invisible to the app but remain in the DB until the sync engine confirms the
 * server has acknowledged the deletion.
 */
export async function fetchTemplates(userId) {
  const db = await getDb();

  const templates = await db.getAllAsync(
    `SELECT * FROM templates
     WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY updated_at DESC`,
    [userId]
  );

  if (templates.length === 0){
    return [];
  }

  // Build a safe IN list of quoted IDs — these are our own UUIDs so no
  // injection risk, but we still avoid the placeholder limit on large lists.
  const idList = templates.map(t => `'${t.id}'`).join(',');

  const exerciseRows = await db.getAllAsync(
    `SELECT te.template_id, e.id, e.name, e.category, e.muscle
     FROM template_exercises te
     JOIN exercises e ON e.id = te.exercise_id
     WHERE te.template_id IN (${idList})
     ORDER BY te.template_id, te.position`
  );
 
  // Group exercise rows under their parent template in one pass
  const exercisesByTemplate = new Map(templates.map(t => [t.id, []]));
  for (const row of exerciseRows) {
    const { template_id, ...exercise } = row;
    exercisesByTemplate.get(template_id)?.push(exercise);
  }
 
  for (const t of templates) {
    const rows    = exercisesByTemplate.get(t.id) ?? [];
    t.exercises   = rows;
    t.exerciseIds = rows.map(r => r.id);
  }
 
  return templates;
}

export async function fetchTemplateById(userId, templateId) {
  const db = await getDb();

  const t = await db.getFirstAsync(
    `SELECT * FROM templates
     WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
    [templateId, userId]
  );
  if (!t) return null;

  const rows = await db.getAllAsync(
    `SELECT e.id, e.name, e.category, e.muscle
     FROM template_exercises te
     JOIN exercises e ON e.id = te.exercise_id
     WHERE te.template_id = ?
     ORDER BY te.position`,
    [t.id]
  );
  t.exercises   = rows;
  t.exerciseIds = rows.map(r => r.id);
  return t;
}

export async function templateNameExists(userId, name, excludeId = null) {
  const db = await getDb();
  const trimmed = name.trim();
  if (!trimmed) return false;

  const row = await db.getFirstAsync(
    `SELECT id FROM templates
     WHERE user_id = ? AND LOWER(name) = LOWER(?) AND deleted_at IS NULL
       AND (? IS NULL OR id != ?)
     LIMIT 1`,
    [userId, trimmed, excludeId, excludeId]
  );
  return !!row;
}

export async function createTemplate(userId, id, name, tag, exerciseIds) {
  const db = await getDb();
  const ts = now();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO templates (id, user_id, name, tag, created_at, updated_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [id, userId, name.trim(), (tag ?? '').trim(), ts, ts]
    );

    for (let i = 0; i < exerciseIds.length; i++) {
      await db.runAsync(
        `INSERT INTO template_exercises (id, template_id, exercise_id, position)
         VALUES (?, ?, ?, ?)`,
        [generateId(), id, exerciseIds[i], i]
      );
    }

    const template = await db.getFirstAsync(
      `SELECT * FROM templates WHERE id = ?`, [id]
    );
    await enqueue(db, 'templates', id, 'upsert', { ...template, exerciseIds }, userId);
  });
}

export async function updateTemplate(userId, id, name, tag, exerciseIds) {
  const db = await getDb();
  const ts = now();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE templates
       SET name = ?, tag = ?, updated_at = ?, sync_status = 'pending'
       WHERE id = ? AND user_id = ?`,
      [name.trim(), (tag ?? '').trim(), ts, id, userId]
    );

    await db.runAsync(
      `DELETE FROM template_exercises WHERE template_id = ?`, [id]
    );

    for (let i = 0; i < exerciseIds.length; i++) {
      await db.runAsync(
        `INSERT INTO template_exercises (id, template_id, exercise_id, position)
         VALUES (?, ?, ?, ?)`,
        [generateId(), id, exerciseIds[i], i]
      );
    }

    const template = await db.getFirstAsync(
      `SELECT * FROM templates WHERE id = ?`, [id]
    );
    await enqueue(db, 'templates', id, 'upsert', { ...template, exerciseIds }, userId);
  });
}

/**
 * Soft-delete: sets deleted_at instead of removing the row.
 * The sync engine will push a 'delete' operation to the server, and once
 * confirmed, a cleanup job can hard-delete old tombstones (e.g. > 30 days).
 */
export async function deleteTemplate(userId, id) {
  const db = await getDb();
  const ts = now();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE templates
       SET deleted_at = ?, updated_at = ?, sync_status = 'pending'
       WHERE id = ? AND user_id = ?`,
      [ts, ts, id, userId]
    );

    await enqueue(db, 'templates', id, 'delete', null, userId);
  });
}

// ─── Workouts ─────────────────────────────────────────────────────────────────

export async function saveWorkout(userId, workout) {
  const db = await getDb();
  const ts = now();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO workouts
         (id, user_id, name, started_at, finished_at, notes,
          created_at, updated_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        workout.id, userId, workout.name,
        workout.startedAt, workout.finishedAt,
        workout.notes ?? null,
        ts, ts,
      ]
    );

    for (let i = 0; i < workout.exercises.length; i++) {
      const ex    = workout.exercises[i];
      const wexId = generateId();

      await db.runAsync(
        `INSERT INTO workout_exercises
           (id, workout_id, exercise_id, name, muscle, category, position)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [wexId, workout.id, ex.exerciseId, ex.name, ex.muscle, ex.category, i]
      );

      for (let j = 0; j < ex.sets.length; j++) {
        const s = ex.sets[j];
        await db.runAsync(
          `INSERT INTO workout_sets
             (id, workout_exercise_id, weight, reps, rpe, notes, position)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            generateId(), wexId,
            s.weight, s.reps,
            s.rpe   ?? null,
            s.notes ?? null,
            j,
          ]
        );
      }
    }

    // Enqueue a denormalised snapshot so the sync engine can push the entire
    // workout in one API call without re-querying.
    await enqueue(db, 'workouts', workout.id, 'upsert', { ...workout, userId }, userId);
  });
}

export async function fetchWorkouts(userId) {
  const db = await getDb();

  const workouts = await db.getAllAsync(
    `SELECT * FROM workouts
     WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY finished_at DESC`,
    [userId]
  );

  if (workouts.length === 0){
    return [];
  }

  const idList = workouts.map(w => `'${w.id}'`).join(',');
 
  const rows = await db.getAllAsync(
    `SELECT
       we.id          AS wex_id,
       we.workout_id,
       we.exercise_id,
       we.name        AS ex_name,
       we.muscle,
       we.category,
       we.position    AS ex_position,
       ws.id          AS set_id,
       ws.weight,
       ws.reps,
       ws.rpe,
       ws.notes       AS set_notes,
       ws.position    AS set_position
     FROM workout_exercises we
     LEFT JOIN workout_sets ws ON ws.workout_exercise_id = we.id
     WHERE we.workout_id IN (${idList})
     ORDER BY we.workout_id, we.position, ws.position`
  );
 
  // Build lookup maps so we only iterate the row list once
  const workoutMap = new Map(workouts.map(w => [w.id, { ...w, exercises: [] }]));
  const exMap      = new Map();
 
  for (const row of rows) {
    const workout = workoutMap.get(row.workout_id);
    if (!workout) continue;
 
    if (!exMap.has(row.wex_id)) {
      const ex = {
        id:         row.wex_id,
        exerciseId: row.exercise_id,
        name:       row.ex_name,
        muscle:     row.muscle,
        category:   row.category,
        sets:       [],
      };
      exMap.set(row.wex_id, ex);
      workout.exercises.push(ex);
    }
 
    if (row.set_id) {
      exMap.get(row.wex_id).sets.push({
        id:     row.set_id,
        weight: row.weight,
        reps:   row.reps,
        rpe:    row.rpe,
        notes:  row.set_notes,
      });
    }
  }
 
  return [...workoutMap.values()];
}

/**
 * Soft-delete a workout. History is precious — never hard-delete until the
 * server has confirmed receipt of the tombstone.
 */
export async function deleteWorkout(userId, id) {
  const db = await getDb();
  const ts = now();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE workouts
       SET deleted_at = ?, updated_at = ?, sync_status = 'pending'
       WHERE id = ? AND user_id = ?`,
      [ts, ts, id, userId]
    );

    await enqueue(db, 'workouts', id, 'delete', null, userId);
  });
}

// ─── Sync engine interface ────────────────────────────────────────────────────
//
// These functions are the surface the future sync service will call.
// The app itself never calls them — only the background sync task does.

/**
 * Returns all queued operations for a user, oldest first.
 * The sync service pops these, sends them to the server, then calls
 * markSynced() or markConflict() depending on the server response.
 */
export async function getPendingSyncQueue(userId, maxAttempts = 5) {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT * FROM sync_queue
     WHERE user_id = ? AND attempts < ?
     ORDER BY id ASC`,
    [userId, maxAttempts]
  );
}

/**
 * Called after the server confirms it received and accepted a row.
 */
export async function markSynced(userId, tableName, rowId, queueId) {
  // Guard: only known tables may be updated this way
  if (!SYNCABLE_TABLES.has(tableName)) {
    throw new Error(`markSynced: unknown table "${tableName}" — rejected to prevent SQL injection`);
  }

  const db = await getDb();
  const ts = now();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE ${tableName}
       SET synced_at = ?, sync_status = 'synced'
       WHERE id = ? AND user_id = ?`,
      [ts, rowId, userId]
    );

    await db.runAsync(`DELETE FROM sync_queue WHERE id = ?`, [queueId]);
  });
}

/**
 * Called when the server rejects a row (e.g. a newer version exists).
 * Marks the row as 'conflict' so the UI can surface it to the user.
 */
export async function markConflict(queueId, errorMessage) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE sync_queue
     SET attempts = attempts + 1, last_error = ?
     WHERE id = ?`,
    [errorMessage, queueId]
  );
}

/**
 * Applies a batch of rows received from the server (e.g. after login on a new
 * device, or after a pull sync). Rows are written with sync_status = 'synced'
 * because they came from the server — no need to push them back.
 *
 * Uses INSERT OR REPLACE so this is safe to call repeatedly (idempotent).
 * Child rows (template_exercises, workout_sets) are replaced wholesale with
 * their parent, matching the write path above.
 */
export async function applyServerTemplates(templates) {
  const db = await getDb();

  await db.withTransactionAsync(async () => {
    for (const t of templates) {
      await db.runAsync(
        `INSERT OR REPLACE INTO templates
           (id, user_id, name, tag, created_at, updated_at,
            deleted_at, synced_at, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
        [t.id, t.user_id, t.name, t.tag, t.created_at,
         t.updated_at, t.deleted_at ?? null, now()]
      );

      if (!t.deleted_at) {
        await db.runAsync(
          `DELETE FROM template_exercises WHERE template_id = ?`, [t.id]
        );
        for (let i = 0; i < (t.exercise_ids ?? []).length; i++) {
          await db.runAsync(
            `INSERT INTO template_exercises (id, template_id, exercise_id, position)
             VALUES (?, ?, ?, ?)`,
            [generateId(), t.id, t.exercise_ids[i], i]
          );
        }
      }
    }
  });
}

export async function applyServerWorkouts(workouts) {
  const db = await getDb();

  await db.withTransactionAsync(async () => {
    for (const w of workouts) {
      await db.runAsync(
        `INSERT OR REPLACE INTO workouts
           (id, user_id, name, started_at, finished_at, notes,
            created_at, updated_at, deleted_at, synced_at, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
        [w.id, w.user_id, w.name, w.started_at, w.finished_at,
         w.notes ?? null, w.created_at, w.updated_at,
         w.deleted_at ?? null, now()]
      );

      if (!w.deleted_at) {
        await db.runAsync(
          `DELETE FROM workout_exercises WHERE workout_id = ?`, [w.id]
        );

        for (let i = 0; i < (w.exercises ?? []).length; i++) {
          const ex    = w.exercises[i];
          const wexId = generateId();

          await db.runAsync(
            `INSERT INTO workout_exercises
               (id, workout_id, exercise_id, name, muscle, category, position)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [wexId, w.id, ex.exercise_id, ex.name, ex.muscle, ex.category, i]
          );

          for (let j = 0; j < (ex.sets ?? []).length; j++) {
            const s = ex.sets[j];
            await db.runAsync(
              `INSERT INTO workout_sets
                 (id, workout_exercise_id, weight, reps, rpe, notes, position)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [generateId(), wexId, s.weight, s.reps,
               s.rpe ?? null, s.notes ?? null, j]
            );
          }
        }
      }
    }
  });
}

// ─── Shared utility (used by WorkoutLogger) ───────────────────────────────────

export function buildExercisesFromTemplate(exercises) {
  return exercises.map(def => ({
    id:         generateId(),
    exerciseId: def.id,
    name:       def.name,
    muscle:     def.muscle,
    category:   def.category,
    sets: [{ id: generateId(), weight: '', reps: '', rpe: null, notes: '' }],
  }));
}
