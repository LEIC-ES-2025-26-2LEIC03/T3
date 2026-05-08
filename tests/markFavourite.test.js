import * as firestoreDb from '../../src/utils/firestoreDb';
import { EXERCISES } from '../../src/data/exercises';
 
// ── Favourites: Mark an Exercise as Favourite ─────────────────────────────────
 
describe('US-79 | Mark Exercise as Favourite', () => {
 
  // ── Fetch favourites ────────────────────────────────────────────────────────
  describe('Fetching favourites', () => {
    test('should return an empty set when the user has no favourites', async () => {
      // Arrange
      const userId = 'test-user-001';
 
      // Act
      const result = await firestoreDb.fetchFavourites(userId);
 
      // Assert
      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
    });
 
    test('should return the correct set of favourited exercise IDs after toggling', async () => {
      // Arrange
      const userId = 'test-user-001';
      const exercise = EXERCISES[0];
 
      // Act
      await firestoreDb.toggleFavourite(userId, exercise);
      const result = await firestoreDb.fetchFavourites(userId);
 
      // Assert
      expect(result.has(exercise.id)).toBe(true);
    });
  });
 
  // ── Toggle favourite ────────────────────────────────────────────────────────
  describe('Toggling a favourite', () => {
    test('should mark an exercise as favourite and return true', async () => {
      // Arrange
      const userId = 'test-user-002';
      const exercise = EXERCISES[0];
 
      // Act
      const result = await firestoreDb.toggleFavourite(userId, exercise);
 
      // Assert
      expect(result).toBe(true);
    });
 
    test('should remove an exercise from favourites when toggled again and return false', async () => {
      // Arrange
      const userId = 'test-user-003';
      const exercise = EXERCISES[0];
 
      // Act — toggle on then off
      await firestoreDb.toggleFavourite(userId, exercise);
      const result = await firestoreDb.toggleFavourite(userId, exercise);
 
      // Assert
      expect(result).toBe(false);
    });
 
    test('should not affect other exercises when toggling one', async () => {
      // Arrange
      const userId = 'test-user-004';
      const exerciseA = EXERCISES[0];
      const exerciseB = EXERCISES[1];
 
      // Act
      await firestoreDb.toggleFavourite(userId, exerciseA);
      const result = await firestoreDb.fetchFavourites(userId);
 
      // Assert
      expect(result.has(exerciseA.id)).toBe(true);
      expect(result.has(exerciseB.id)).toBe(false);
    });
 
    test('should allow multiple exercises to be favourited independently', async () => {
      // Arrange
      const userId = 'test-user-005';
      const exerciseA = EXERCISES[0];
      const exerciseB = EXERCISES[1];
 
      // Act
      await firestoreDb.toggleFavourite(userId, exerciseA);
      await firestoreDb.toggleFavourite(userId, exerciseB);
      const result = await firestoreDb.fetchFavourites(userId);
 
      // Assert
      expect(result.has(exerciseA.id)).toBe(true);
      expect(result.has(exerciseB.id)).toBe(true);
    });
  });
});
