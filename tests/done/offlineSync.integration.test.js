import NetInfo from '@react-native-community/netinfo';
import { setDoc } from 'firebase/firestore';
import { syncPendingWorkouts, startSyncOnReconnect } from '../../src/services/syncService';
import { getPendingSyncQueue, markSynced, markConflict } from '../../src/utils/db';
import { getPendingOfflineOps, markOfflineOpSynced, markOfflineOpFailed } from '../../src/utils/offlineStore';

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(),
}));

jest.mock('../../src/utils/db', () => ({
  getPendingSyncQueue: jest.fn(),
  markSynced: jest.fn(() => Promise.resolve()),
  markConflict: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../src/utils/offlineStore', () => ({
  getPendingOfflineOps: jest.fn(),
  markOfflineOpSynced: jest.fn(() => Promise.resolve()),
  markOfflineOpFailed: jest.fn(() => Promise.resolve()),
}));

const queuedWorkout = {
  id: 7,
  table_name: 'workouts',
  row_id: 'workout-queued-1',
  operation: 'upsert',
  attempts: 0,
  payload: JSON.stringify({
    id: 'workout-queued-1',
    name: 'Queued Legs',
    startedAt: '2026-05-22T10:00:00.000Z',
    finishedAt: '2026-05-22T11:00:00.000Z',
    exercises: [
      {
        exerciseId: 'squat',
        name: 'Squat',
        muscle: 'Quads',
        category: 'Quads',
        sets: [{ weight: 100, reps: 5 }],
      },
    ],
  }),
};

const queuedTemplate = {
  id: 8,
  table_name: 'templates',
  row_id: 'template-queued-1',
  operation: 'upsert',
  attempts: 0,
  payload: JSON.stringify({
    id: 'template-queued-1',
    name: 'Queued Push',
    tag: 'Push',
    exerciseIds: ['bench-press'],
  }),
};

describe('US-89 reconnect sync integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    NetInfo.fetch.mockResolvedValue({ isConnected: true });
    getPendingSyncQueue.mockResolvedValue([queuedWorkout]);
    getPendingOfflineOps.mockResolvedValue([]);
  });

  it('drains queued offline workouts into Firestore and marks them synced', async () => {
    await syncPendingWorkouts('user-001');

    expect(setDoc).toHaveBeenCalled();
    expect(markSynced).toHaveBeenCalledWith(
      'user-001',
      'workouts',
      'workout-queued-1',
      7
    );
    expect(markConflict).not.toHaveBeenCalled();
  });

  it('syncs custom exercise instructions and tips from offline queue', async () => {
    getPendingOfflineOps.mockResolvedValueOnce([
      {
        id: 'offline-custom-1',
        tableName: 'custom_exercises',
        rowId: 'custom-row',
        operation: 'upsert',
        payload: {
          name: 'Backpack row',
          muscle: 'Back',
          steps: ['Step 1'],
          tips: ['Tip 1'],
        },
        attempts: 0,
      },
    ]);

    await syncPendingWorkouts('user-001');

    expect(setDoc.mock.calls).toEqual(
      expect.arrayContaining([
        expect.arrayContaining([
          undefined,
          expect.objectContaining({
            name: 'Backpack row',
            muscle: 'Back',
            steps: ['Step 1'],
            tips: ['Tip 1'],
          }),
          { merge: true },
        ]),
      ])
    );
    expect(markOfflineOpSynced).toHaveBeenCalledWith('user-001', 'offline-custom-1');
  });

  it('syncs queued templates back to Firestore', async () => {
    getPendingSyncQueue.mockResolvedValueOnce([queuedTemplate]);

    await syncPendingWorkouts('user-001');

    expect(setDoc.mock.calls).toEqual(
      expect.arrayContaining([
        expect.arrayContaining([
          undefined,
          expect.objectContaining({
            name: 'Queued Push',
            tag: 'Push',
            exerciseIds: ['bench-press'],
          }),
          { merge: true },
        ]),
      ])
    );
    expect(markSynced).toHaveBeenCalledWith('user-001', 'templates', 'template-queued-1', 8);
  });

  it('does not drain the queue while offline', async () => {
    NetInfo.fetch.mockResolvedValueOnce({ isConnected: false });

    await syncPendingWorkouts('user-001');

    expect(getPendingSyncQueue).not.toHaveBeenCalled();
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('starts a sync when network connectivity returns', () => {
    let listener;
    NetInfo.addEventListener.mockImplementation(callback => {
      listener = callback;
      return jest.fn();
    });

    startSyncOnReconnect('user-001');
    listener({ isConnected: true });

    expect(NetInfo.addEventListener).toHaveBeenCalled();
  });
});
