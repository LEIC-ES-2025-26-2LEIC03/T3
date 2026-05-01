import { deleteWorkout } from '../../src/utils/firestoreDb';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(() => 'mock-doc-ref'),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  serverTimestamp: jest.fn(() => 'mock-timestamp'),
}));

jest.mock('../../src/utils/firebaseConfig', () => ({
  db: 'mock-db',
}));

describe('deleteWorkout Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls updateDoc with deletedAt serverTimestamp', async () => {
    const userId = 'user-123';
    const workoutId = 'workout-456';

    await deleteWorkout(userId, workoutId);

    // Verify doc reference was created correctly
    expect(doc).toHaveBeenCalledWith('mock-db', 'users', userId, 'workouts', workoutId);

    // Verify updateDoc was called with the doc reference and soft-delete fields
    expect(updateDoc).toHaveBeenCalledWith('mock-doc-ref', {
      deletedAt: 'mock-timestamp',
      updatedAt: 'mock-timestamp',
    });
  });
});
