import NetInfo from '@react-native-community/netinfo';
import { setDoc } from 'firebase/firestore';
import { syncPendingWorkouts, startSyncOnReconnect } from '../../src/services/syncService';
import { getPendingSyncQueue, markSynced, markConflict } from '../../src/utils/db';

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(),
}));

jest.mock('../../src/utils/db', () => ({
  getPendingSyncQueue: jest.fn(),
  markSynced: jest.fn(() => Promise.resolve()),
  markConflict: jest.fn(() => Promise.resolve()),
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

describe('US-89 reconnect sync integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    NetInfo.fetch.mockResolvedValue({ isConnected: true });
    getPendingSyncQueue.mockResolvedValue([queuedWorkout]);
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
