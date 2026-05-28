import { getDocs } from 'firebase/firestore';
import { saveWorkout, fetchWorkouts } from '../../src/utils/firestoreDb';
import { saveWorkout as saveLocalWorkout, fetchWorkouts as fetchLocalWorkouts } from '../../src/utils/db';
import { syncPendingWorkouts } from '../../src/services/syncService';

jest.mock('../../src/utils/db', () => ({
  fetchTemplates: jest.fn(() => Promise.resolve([])),
  fetchTemplateById: jest.fn(() => Promise.resolve(null)),
  templateNameExists: jest.fn(() => Promise.resolve(false)),
  createTemplate: jest.fn(() => Promise.resolve()),
  updateTemplate: jest.fn(() => Promise.resolve()),
  deleteTemplate: jest.fn(() => Promise.resolve()),
  saveWorkout: jest.fn(() => Promise.resolve()),
  fetchWorkouts: jest.fn(() => Promise.resolve([])),
  deleteWorkout: jest.fn(() => Promise.resolve()),
  applyServerTemplates: jest.fn(() => Promise.resolve()),
  applyServerWorkouts: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../src/services/syncService', () => ({
  syncPendingWorkouts: jest.fn(() => Promise.resolve()),
}));

const workout = {
  id: 'offline-workout-1',
  name: 'Offline Push',
  startedAt: '2026-05-22T10:00:00.000Z',
  finishedAt: '2026-05-22T11:00:00.000Z',
  exercises: [
    {
      exerciseId: 'bench-press',
      name: 'Bench press',
      muscle: 'Chest',
      category: 'Chest',
      sets: [{ weight: 80, reps: 8 }],
    },
  ],
};

describe('US-88 offline workout unit behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saves a completed workout to SQLite before trying network sync', async () => {
    await saveWorkout('user-001', workout);

    expect(saveLocalWorkout).toHaveBeenCalledWith('user-001', workout);
    expect(syncPendingWorkouts).toHaveBeenCalledWith('user-001');
  });

  it('returns locally saved pending workouts without requiring Firestore', async () => {
    const pendingWorkout = {
      id: workout.id,
      name: workout.name,
      started_at: workout.startedAt,
      finished_at: workout.finishedAt,
      sync_status: 'pending',
      exercises: [],
    };
    fetchLocalWorkouts.mockResolvedValueOnce([pendingWorkout]);

    const result = await fetchWorkouts('user-001');

    expect(result).toEqual([pendingWorkout]);
    expect(getDocs).not.toHaveBeenCalled();
  });
});
