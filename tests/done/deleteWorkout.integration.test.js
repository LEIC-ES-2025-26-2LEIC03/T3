import { deleteWorkout } from '../../src/utils/firestoreDb';
import { deleteWorkout as deleteLocalWorkout } from '../../src/utils/db';
import { syncPendingWorkouts } from '../../src/services/syncService';

jest.mock('../../src/utils/firebaseConfig', () => ({
  db: 'mock-db',
}));

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

describe('deleteWorkout Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('soft-deletes locally and queues reconnect sync', async () => {
    const userId = 'user-123';
    const workoutId = 'workout-456';

    await deleteWorkout(userId, workoutId);

    expect(deleteLocalWorkout).toHaveBeenCalledWith(userId, workoutId);
    expect(syncPendingWorkouts).toHaveBeenCalledWith(userId);
  });
});
