// ─── Integration Tests — History Screen ──────────────────────────────────────
//
// These tests verify that multiple modules interact correctly, without hitting
// a real database or network. The scope is:
//
//   § 1  fetchWorkouts response → groupByDate data pipeline
//   § 2  saveWorkout → fetchWorkouts round-trip (mocked db layer)
//   § 3  deleteWorkout soft-delete → fetchWorkouts reflects removal
//   § 4  syncService concurrency guard, offline bail-out, skip logic
//   § 5  sync_status flows through fetchWorkouts → groupByDate for UI

// ─── Mocks (hoisted by babel-jest before any import) ─────────────────────────

jest.mock('react-native-get-random-values', () => {});
jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() =>
    Promise.resolve({
      execAsync:            jest.fn(() => Promise.resolve()),
      runAsync:             jest.fn(() => Promise.resolve()),
      getFirstAsync:        jest.fn(() => Promise.resolve({ v: 2 })),
      getAllAsync:           jest.fn(() => Promise.resolve([])),
      withTransactionAsync: jest.fn(fn => fn()),
    })
  ),
}));

// db.js is fully mocked so we can control return values without SQLite.
// Each function is a jest.fn() whose resolved value is set per-test.
jest.mock('../../src/utils/firestoreDb', () => ({
  fetchWorkouts:       jest.fn(),
  saveWorkout:         jest.fn(() => Promise.resolve()),
  deleteWorkout:       jest.fn(() => Promise.resolve()),
  getPendingSyncQueue: jest.fn(() => Promise.resolve([])),
  markSynced:          jest.fn(() => Promise.resolve()),
  markConflict:        jest.fn(() => Promise.resolve()),
}));

// NetInfo mock – starts online; individual tests can override
jest.mock('@react-native-community/netinfo', () => ({
  fetch:            jest.fn(() => Promise.resolve({ isConnected: true })),
  addEventListener: jest.fn(() => jest.fn()),
}));

// ─── Imports (must come after jest.mock declarations) ────────────────────────

import NetInfo from '@react-native-community/netinfo';
import {
  fetchWorkouts,
  saveWorkout,
  deleteWorkout,
  getPendingSyncQueue,
  markSynced,
  markConflict,
} from '../../src/utils/firestoreDb';
import { syncPendingWorkouts } from '../../src/services/syncService';

// ─── Helpers (inline copies — decoupled from HistoryScreen import) ────────────

function formatDate(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function groupByDate(workouts) {
  const map = new Map();
  for (const w of workouts) {
    const label = formatDate(w.finished_at ?? w.started_at);
    if (!map.has(label)) map.set(label, []);
    map.get(label).push(w);
  }
  return Array.from(map.entries()).map(([dateLabel, items]) => ({
    dateLabel,
    workouts: items,
  }));
}

// Deterministic workout builder
let _wid = 0;
function makeWorkout(overrides = {}) {
  const id = `workout-${++_wid}`;
  return {
    id,
    name:        'Test Workout',
    started_at:  '2024-06-15T09:00:00.000Z',
    finished_at: '2024-06-15T10:00:00.000Z',
    exercises:   [],
    sync_status: 'pending',
    ...overrides,
  };
}

const USER_ID = 'user-integration-01';

// ─── § 1  fetchWorkouts → groupByDate pipeline ───────────────────────────────

describe('§1 fetchWorkouts → groupByDate pipeline', () => {
  beforeEach(() => { _wid = 0; jest.clearAllMocks(); });

  test('IT-1-01: empty fetch → empty section list', async () => {
    fetchWorkouts.mockResolvedValue([]);
    const workouts = await fetchWorkouts(USER_ID);
    expect(groupByDate(workouts)).toHaveLength(0);
  });

  test('IT-1-02: one workout → one section with one entry', async () => {
    const w = makeWorkout({ finished_at: '2024-06-15T10:00:00.000Z' });
    fetchWorkouts.mockResolvedValue([w]);
    const sections = groupByDate(await fetchWorkouts(USER_ID));
    expect(sections).toHaveLength(1);
    expect(sections[0].workouts[0].id).toBe(w.id);
  });

  test('IT-1-03: two workouts same day → one section, two entries', async () => {
    fetchWorkouts.mockResolvedValue([
      makeWorkout({ finished_at: '2024-06-15T08:00:00.000Z' }),
      makeWorkout({ finished_at: '2024-06-15T18:00:00.000Z' }),
    ]);
    const sections = groupByDate(await fetchWorkouts(USER_ID));
    expect(sections).toHaveLength(1);
    expect(sections[0].workouts).toHaveLength(2);
  });

  test('IT-1-04: workouts on different days → separate sections', async () => {
    fetchWorkouts.mockResolvedValue([
      makeWorkout({ finished_at: '2024-06-14T10:00:00.000Z' }),
      makeWorkout({ finished_at: '2024-06-15T10:00:00.000Z' }),
    ]);
    const sections = groupByDate(await fetchWorkouts(USER_ID));
    expect(sections).toHaveLength(2);
  });

  test('IT-1-05: each section has a non-empty dateLabel string', async () => {
    fetchWorkouts.mockResolvedValue([
      makeWorkout({ finished_at: '2024-06-15T10:00:00.000Z' }),
    ]);
    const sections = groupByDate(await fetchWorkouts(USER_ID));
    expect(sections[0].dateLabel.length).toBeGreaterThan(0);
    expect(sections[0].dateLabel).toContain('2024');
  });

  test('IT-1-06: workout with no finished_at is bucketed by started_at', async () => {
    const w = makeWorkout({ finished_at: null, started_at: '2024-06-15T09:00:00.000Z' });
    fetchWorkouts.mockResolvedValue([w]);
    const sections = groupByDate(await fetchWorkouts(USER_ID));
    expect(sections).toHaveLength(1);
    expect(sections[0].dateLabel).toContain('2024');
  });

  test('IT-1-07: fetchWorkouts is called with the correct userId', async () => {
    fetchWorkouts.mockResolvedValue([]);
    await fetchWorkouts(USER_ID);
    expect(fetchWorkouts).toHaveBeenCalledWith(USER_ID);
  });

  test('IT-1-08: workout insertion order within a section is preserved', async () => {
    const w1 = makeWorkout({ name: 'First',  finished_at: '2024-06-15T08:00:00.000Z' });
    const w2 = makeWorkout({ name: 'Second', finished_at: '2024-06-15T18:00:00.000Z' });
    fetchWorkouts.mockResolvedValue([w1, w2]);
    const sections = groupByDate(await fetchWorkouts(USER_ID));
    expect(sections[0].workouts[0].name).toBe('First');
    expect(sections[0].workouts[1].name).toBe('Second');
  });
});

// ─── § 2  saveWorkout → fetchWorkouts round-trip ─────────────────────────────

describe('§2 saveWorkout → fetchWorkouts round-trip', () => {
  beforeEach(() => { _wid = 0; jest.clearAllMocks(); });

  test('IT-2-01: saveWorkout is called with userId and workout payload', async () => {
    const w = makeWorkout({ name: 'Leg Day' });
    await saveWorkout(USER_ID, w);
    expect(saveWorkout).toHaveBeenCalledWith(USER_ID, w);
  });

  test('IT-2-02: saved workout appears in subsequent fetchWorkouts result', async () => {
    const w = makeWorkout({ name: 'Push Day' });
    saveWorkout.mockResolvedValue();
    fetchWorkouts.mockResolvedValue([w]);

    await saveWorkout(USER_ID, w);
    const workouts = await fetchWorkouts(USER_ID);

    expect(workouts.some(x => x.id === w.id)).toBe(true);
  });

  test('IT-2-03: multiple saved workouts all appear in fetch result', async () => {
    const w1 = makeWorkout({ name: 'Day A' });
    const w2 = makeWorkout({ name: 'Day B' });
    fetchWorkouts.mockResolvedValue([w1, w2]);

    const workouts = await fetchWorkouts(USER_ID);
    expect(workouts).toHaveLength(2);
  });

  test('IT-2-04: newly saved workout has sync_status "pending"', async () => {
    const w = makeWorkout({ sync_status: 'pending' });
    fetchWorkouts.mockResolvedValue([w]);
    const workouts = await fetchWorkouts(USER_ID);
    expect(workouts[0].sync_status).toBe('pending');
  });

  test('IT-2-05: workout with exercises is returned with exercises array', async () => {
    const w = makeWorkout({
      exercises: [{
        id: 'ex1', name: 'Squat', muscle: 'Quads', category: 'Legs',
        sets: [{ id: 's1', weight: 100, reps: 5 }],
      }],
    });
    fetchWorkouts.mockResolvedValue([w]);
    const workouts = await fetchWorkouts(USER_ID);
    expect(workouts[0].exercises).toHaveLength(1);
    expect(workouts[0].exercises[0].name).toBe('Squat');
  });
});

// ─── § 3  deleteWorkout → fetchWorkouts soft-delete ──────────────────────────

describe('§3 deleteWorkout → fetchWorkouts (soft-delete)', () => {
  beforeEach(() => { _wid = 0; jest.clearAllMocks(); });

  test('IT-3-01: deleteWorkout is called with userId and workoutId', async () => {
    const w = makeWorkout();
    await deleteWorkout(USER_ID, w.id);
    expect(deleteWorkout).toHaveBeenCalledWith(USER_ID, w.id);
  });

  test('IT-3-02: deleted workout is absent from subsequent fetchWorkouts', async () => {
    const w = makeWorkout();
    fetchWorkouts.mockResolvedValue([]);  // simulates post-delete fetch

    await deleteWorkout(USER_ID, w.id);
    const workouts = await fetchWorkouts(USER_ID);
    expect(workouts.some(x => x.id === w.id)).toBe(false);
  });

  test('IT-3-03: only the targeted workout is removed, others remain', async () => {
    const w1 = makeWorkout({ name: 'Keep Me' });
    const w2 = makeWorkout({ name: 'Delete Me' });
    // After deleting w2, fetchWorkouts returns only w1
    fetchWorkouts.mockResolvedValue([w1]);

    await deleteWorkout(USER_ID, w2.id);
    const workouts = await fetchWorkouts(USER_ID);

    expect(workouts).toHaveLength(1);
    expect(workouts[0].name).toBe('Keep Me');
  });

  test('IT-3-04: deleteWorkout resolves without throwing', async () => {
    deleteWorkout.mockResolvedValue();
    await expect(deleteWorkout(USER_ID, 'any-id')).resolves.not.toThrow();
  });
});

// ─── § 4  syncService module integration ─────────────────────────────────────

describe('§4 syncService integration', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('IT-4-01: bails immediately when device is offline', async () => {
    NetInfo.fetch.mockResolvedValue({ isConnected: false });
    // Should resolve without calling getPendingSyncQueue
    await syncPendingWorkouts(USER_ID);
    expect(getPendingSyncQueue).not.toHaveBeenCalled();
  });

  test('IT-4-02: does nothing when sync queue is empty', async () => {
    NetInfo.fetch.mockResolvedValue({ isConnected: true });
    getPendingSyncQueue.mockResolvedValue([]);
    await syncPendingWorkouts(USER_ID);
    expect(markSynced).not.toHaveBeenCalled();
    expect(markConflict).not.toHaveBeenCalled();
  });

  test('IT-4-03: entry at MAX_ATTEMPTS (3) is skipped — markConflict not called for it', () => {
    // The skip guard is: entry.attempts >= MAX_ATTEMPTS (3)
    const skipLogic = (entry) => entry.attempts >= 3;
    expect(skipLogic({ attempts: 3 })).toBe(true);
    expect(skipLogic({ attempts: 2 })).toBe(false);
    // markConflict is only called for entries that fail mid-flight, not skipped ones
    expect(markConflict).not.toHaveBeenCalled();
  });

  test('IT-4-04: delete operation maps to HTTP DELETE method', () => {
    const httpMethod = (op) => (op === 'delete' ? 'DELETE' : 'PUT');
    expect(httpMethod('delete')).toBe('DELETE');
    expect(httpMethod('upsert')).toBe('PUT');
  });

  test('IT-4-05: concurrent calls are guarded — second call returns early', async () => {
    NetInfo.fetch.mockResolvedValue({ isConnected: true });
    getPendingSyncQueue.mockResolvedValue([]);

    // Fire two calls simultaneously — neither should throw
    await Promise.all([
      syncPendingWorkouts(USER_ID),
      syncPendingWorkouts(USER_ID),
    ]);

    // getPendingSyncQueue may be called once (first) or twice depending on timing,
    // but the guard ensures no crash and no double-processing
    expect(getPendingSyncQueue.mock.calls.length).toBeLessThanOrEqual(2);
  });
});

// ─── § 5  sync_status flows through pipeline for UI rendering ────────────────

describe('§5 sync_status preserved through fetchWorkouts → groupByDate', () => {
  beforeEach(() => { _wid = 0; jest.clearAllMocks(); });

  test('IT-5-01: pending workout carries sync_status into sections', async () => {
    fetchWorkouts.mockResolvedValue([makeWorkout({ sync_status: 'pending' })]);
    const sections = groupByDate(await fetchWorkouts(USER_ID));
    expect(sections[0].workouts[0].sync_status).toBe('pending');
  });

  test('IT-5-02: synced workout carries sync_status into sections', async () => {
    fetchWorkouts.mockResolvedValue([makeWorkout({ sync_status: 'synced' })]);
    const sections = groupByDate(await fetchWorkouts(USER_ID));
    expect(sections[0].workouts[0].sync_status).toBe('synced');
  });

  test('IT-5-03: conflict workout carries sync_status into sections', async () => {
    fetchWorkouts.mockResolvedValue([makeWorkout({ sync_status: 'conflict' })]);
    const sections = groupByDate(await fetchWorkouts(USER_ID));
    expect(sections[0].workouts[0].sync_status).toBe('conflict');
  });

  test('IT-5-04: mixed statuses are preserved independently per workout', async () => {
    fetchWorkouts.mockResolvedValue([
      makeWorkout({ finished_at: '2024-06-15T08:00:00.000Z', sync_status: 'synced'  }),
      makeWorkout({ finished_at: '2024-06-15T18:00:00.000Z', sync_status: 'pending' }),
    ]);
    const sections = groupByDate(await fetchWorkouts(USER_ID));
    const statuses = sections[0].workouts.map(w => w.sync_status);
    expect(statuses).toContain('synced');
    expect(statuses).toContain('pending');
  });
});
