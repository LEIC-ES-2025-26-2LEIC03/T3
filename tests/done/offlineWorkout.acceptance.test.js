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

describe('US-88 and US-89 offline workout acceptance tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('US-88: a gym-goer can finish a workout while offline and keep it in history', async () => {
    const workout = {
      id: 'offline-session-1',
      name: 'Basement Gym',
      startedAt: '2026-05-22T12:00:00.000Z',
      finishedAt: '2026-05-22T13:00:00.000Z',
      exercises: [],
    };
    const pendingHistoryRow = {
      id: workout.id,
      name: workout.name,
      started_at: workout.startedAt,
      finished_at: workout.finishedAt,
      sync_status: 'pending',
      exercises: [],
    };
    fetchLocalWorkouts.mockResolvedValueOnce([pendingHistoryRow]);

    await saveWorkout('user-001', workout);
    const history = await fetchWorkouts('user-001');

    expect(saveLocalWorkout).toHaveBeenCalledWith('user-001', workout);
    expect(history).toContainEqual(pendingHistoryRow);
  });

  it('US-89: an offline session is queued for automatic sync on reconnect', async () => {
    const workout = {
      id: 'offline-session-2',
      name: 'No Signal Pull',
      startedAt: '2026-05-22T14:00:00.000Z',
      finishedAt: '2026-05-22T15:00:00.000Z',
      exercises: [],
    };

    await saveWorkout('user-001', workout);

    expect(syncPendingWorkouts).toHaveBeenCalledWith('user-001');
  });
});
