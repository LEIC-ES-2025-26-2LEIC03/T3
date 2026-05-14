import * as firestoreDb from '../../src/utils/firestoreDb';

// ── Helper: build a mock workout with a given finished_at date ──────────────
const mockWorkout = (dateStr) => ({
  id:          `workout-${dateStr}`,
  name:        'Test Workout',
  started_at:  `${dateStr}T09:00:00.000Z`,
  finished_at: `${dateStr}T10:00:00.000Z`,
  exercises:   [],
  sync_status: 'synced',
});

// ── Helper: get today and offset dates as YYYY-MM-DD ───────────────────────
const dateOffset = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

// ── Streak calculation (mirrors the logic in HomeScreen.jsx) ────────────────
function calculateStreak(workouts) {
  if (!workouts || workouts.length === 0) return 0;

  const dates = [
    ...new Set(
      workouts
        .map(w => {
          const d = new Date(w.finished_at ?? w.started_at);
          return d.toISOString().split('T')[0];
        })
        .filter(Boolean)
    ),
  ].sort((a, b) => b.localeCompare(a));

  const todayStr     = new Date().toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (dates[0] !== todayStr && dates[0] !== yesterdayStr) return 0;

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev    = new Date(dates[i - 1]);
    const curr    = new Date(dates[i]);
    const diffDays = Math.round((prev - curr) / 86400000);
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// ─── Acceptance tests ─────────────────────────────────────────────────────────

describe('US-XX | Workout Streak', () => {

  describe('No workout history', () => {
    test('should return a streak of 0 when the user has no workouts', () => {
      // Arrange
      const workouts = [];

      // Act
      const result = calculateStreak(workouts);

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('Active streak', () => {
    test('should return a streak of 1 when the user only worked out today', () => {
      // Arrange
      const workouts = [mockWorkout(dateOffset(0))];

      // Act
      const result = calculateStreak(workouts);

      // Assert
      expect(result).toBe(1);
    });

    test('should return a streak of 1 when the user only worked out yesterday', () => {
      // Arrange
      const workouts = [mockWorkout(dateOffset(-1))];

      // Act
      const result = calculateStreak(workouts);

      // Assert
      expect(result).toBe(1);
    });

    test('should return the correct streak for multiple consecutive days', () => {
      // Arrange
      const workouts = [
        mockWorkout(dateOffset(0)),
        mockWorkout(dateOffset(-1)),
        mockWorkout(dateOffset(-2)),
        mockWorkout(dateOffset(-3)),
      ];

      // Act
      const result = calculateStreak(workouts);

      // Assert
      expect(result).toBe(4);
    });

    test('should count only one entry per day even if multiple workouts were logged', () => {
      // Arrange
      const workouts = [
        mockWorkout(dateOffset(0)),
        mockWorkout(dateOffset(0)),  // second workout same day
        mockWorkout(dateOffset(-1)),
      ];

      // Act
      const result = calculateStreak(workouts);

      // Assert
      expect(result).toBe(2);
    });
  });

  describe('Broken streak', () => {
    test('should reset the streak to 0 when the last workout was 2 or more days ago', () => {
      // Arrange
      const workouts = [
        mockWorkout(dateOffset(-2)),
        mockWorkout(dateOffset(-3)),
      ];

      // Act
      const result = calculateStreak(workouts);

      // Assert
      expect(result).toBe(0);
    });

    test('should stop counting at the first gap in consecutive days', () => {
      // Arrange
      const workouts = [
        mockWorkout(dateOffset(0)),
        mockWorkout(dateOffset(-1)),
        mockWorkout(dateOffset(-3)), // gap on day -2
        mockWorkout(dateOffset(-4)),
      ];

      // Act
      const result = calculateStreak(workouts);

      // Assert
      expect(result).toBe(2);
    });
  });
});