import { TEMPLATES, buildExercisesFromTemplate, getMuscleLabel } from '../../src/data/templates';
import { EXERCISES } from '../../src/data/exercises';

// Mock ID generator to make snapshotting or asserting predictable if needed
jest.mock('../../src/utils/id', () => ({
  generateId: jest.fn(() => 'test-id')
}));

describe('accessPremadeWorkoutRoutines Unit Tests', () => {
  describe('TEMPLATES', () => {
    it('should provide a list of pre-made workout routines', () => {
      expect(Array.isArray(TEMPLATES)).toBe(true);
      expect(TEMPLATES.length).toBeGreaterThan(0);
      expect(TEMPLATES[0]).toHaveProperty('id');
      expect(TEMPLATES[0]).toHaveProperty('name');
      expect(TEMPLATES[0]).toHaveProperty('exercises');
    });

    it('should have valid exercise IDs in templates', () => {
      const allValidExerciseIds = new Set(EXERCISES.map(e => e.id));
      TEMPLATES.forEach(template => {
        template.exercises.forEach(exId => {
          expect(allValidExerciseIds.has(exId)).toBe(true);
        });
      });
    });
  });

  describe('buildExercisesFromTemplate', () => {
    it('should build full exercise objects from string IDs', () => {
      const built = buildExercisesFromTemplate(['bench_press', 'back_squat']);
      expect(built).toHaveLength(2);

      expect(built[0].exerciseId).toBe('bench_press');
      expect(built[0].name).toBe('Bench press');
      expect(built[0].sets).toHaveLength(1);
      expect(built[0].sets[0].id).toBe('test-id');

      expect(built[1].exerciseId).toBe('back_squat');
      expect(built[1].name).toBe('Back squat');
    });

    it('should filter out invalid exercise IDs', () => {
      const built = buildExercisesFromTemplate(['bench_press', 'invalid_exercise_id']);
      expect(built).toHaveLength(1);
      expect(built[0].exerciseId).toBe('bench_press');
    });
  });

  describe('getMuscleLabel', () => {
    it('should return a comma-separated list of muscle groups', () => {
      // bench_press (Chest), back_squat (Quads), romanian_deadlift (Glutes, Hamstrings)
      const label = getMuscleLabel(['bench_press', 'back_squat', 'romanian_deadlift']);
      expect(typeof label).toBe('string');
      expect(label).toContain('Chest');
      expect(label).toContain('Quads');
      expect(label).toContain('Hamstrings');
    });

    it('should return at most 3 muscle groups', () => {
      // 4 different muscles
      const label = getMuscleLabel(['bench_press', 'back_squat', 'deadlift', 'wide_grip_pull_up']);
      const parts = label.split(', ');
      expect(parts.length).toBeLessThanOrEqual(3);
    });

    it('should remove duplicates', () => {
      // bench_press (Chest), incline_bench_press (Chest)
      const label = getMuscleLabel(['bench_press', 'incline_bench_press']);
      expect(label).toBe('Chest');
    });
  });
});
