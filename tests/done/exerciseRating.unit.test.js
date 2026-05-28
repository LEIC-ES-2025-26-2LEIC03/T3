// ── Unit tests: exercise rating pure logic ────────────────────────────────────
//
// These tests cover the validation and data-building logic for the rating
// feature without mounting any UI or touching Firebase.

// ── Helpers (mirrors the logic in WorkoutLogger / saveExerciseRating) ─────────

function validateRating(rating) {
  if (rating === null || rating === undefined || rating === 0) {
    return { success: false, error: 'Please select a rating before submitting.' };
  }
  if (!Number.isInteger(rating)) {
    return { success: false, error: 'Rating must be a whole number.' };
  }
  if (rating < 1 || rating > 5) {
    return { success: false, error: 'Rating must be between 1 and 5.' };
  }
  return { success: true };
}

function buildRatingPayload({ exerciseId, exerciseName, workoutId, rating, comment = '' }) {
  if (!exerciseId || !exerciseName || !workoutId) return null;
  return {
    exerciseId,
    exerciseName,
    workoutId,
    rating,
    comment: comment.trim() || null,
  };
}

function deduplicateExercises(exercises) {
  return exercises.filter(
    (ex, idx, arr) => arr.findIndex(e => e.exerciseId === ex.exerciseId) === idx
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('exerciseRating — pure logic', () => {

  describe('validateRating', () => {

    test('accepts a rating of 1', () => {
      const result = validateRating(1);
      expect(result.success).toBe(true);
    });

    test('accepts a rating of 5', () => {
      const result = validateRating(5);
      expect(result.success).toBe(true);
    });

    test('accepts a rating of 3', () => {
      const result = validateRating(3);
      expect(result.success).toBe(true);
    });

    test('rejects a rating of 0', () => {
      const result = validateRating(0);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/select a rating/i);
    });

    test('rejects a null rating', () => {
      const result = validateRating(null);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/select a rating/i);
    });

    test('rejects a rating greater than 5', () => {
      const result = validateRating(6);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/between 1 and 5/i);
    });

    test('rejects a non-integer rating', () => {
      const result = validateRating(3.5);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/whole number/i);
    });

  });

  describe('buildRatingPayload', () => {

    test('builds a correct payload with all fields', () => {
      const payload = buildRatingPayload({
        exerciseId: 'bench-press',
        exerciseName: 'Bench press',
        workoutId: 'workout-001',
        rating: 4,
        comment: 'Felt strong today',
      });
      expect(payload).toEqual({
        exerciseId: 'bench-press',
        exerciseName: 'Bench press',
        workoutId: 'workout-001',
        rating: 4,
        comment: 'Felt strong today',
      });
    });

    test('stores null for comment when it is empty', () => {
      const payload = buildRatingPayload({
        exerciseId: 'bench-press',
        exerciseName: 'Bench press',
        workoutId: 'workout-001',
        rating: 3,
        comment: '',
      });
      expect(payload.comment).toBeNull();
    });

    test('trims whitespace from comment', () => {
      const payload = buildRatingPayload({
        exerciseId: 'bench-press',
        exerciseName: 'Bench press',
        workoutId: 'workout-001',
        rating: 3,
        comment: '   great session   ',
      });
      expect(payload.comment).toBe('great session');
    });

    test('returns null when exerciseId is missing', () => {
      const payload = buildRatingPayload({
        exerciseId: '',
        exerciseName: 'Bench press',
        workoutId: 'workout-001',
        rating: 3,
      });
      expect(payload).toBeNull();
    });

    test('returns null when workoutId is missing', () => {
      const payload = buildRatingPayload({
        exerciseId: 'bench-press',
        exerciseName: 'Bench press',
        workoutId: '',
        rating: 3,
      });
      expect(payload).toBeNull();
    });

  });

  describe('deduplicateExercises', () => {

    test('returns a single entry when the same exercise appears twice', () => {
      const exercises = [
        { id: 'a', exerciseId: 'bench-press', name: 'Bench press' },
        { id: 'b', exerciseId: 'bench-press', name: 'Bench press' },
      ];
      const result = deduplicateExercises(exercises);
      expect(result).toHaveLength(1);
      expect(result[0].exerciseId).toBe('bench-press');
    });

    test('keeps all entries when every exercise is unique', () => {
      const exercises = [
        { id: 'a', exerciseId: 'bench-press', name: 'Bench press' },
        { id: 'b', exerciseId: 'squat',       name: 'Squat' },
        { id: 'c', exerciseId: 'deadlift',    name: 'Deadlift' },
      ];
      const result = deduplicateExercises(exercises);
      expect(result).toHaveLength(3);
    });

    test('returns an empty array when given an empty list', () => {
      expect(deduplicateExercises([])).toEqual([]);
    });

    test('keeps the first occurrence when there are duplicates', () => {
      const exercises = [
        { id: 'first', exerciseId: 'squat', name: 'Squat' },
        { id: 'second', exerciseId: 'squat', name: 'Squat' },
      ];
      const result = deduplicateExercises(exercises);
      expect(result[0].id).toBe('first');
    });

  });

});
