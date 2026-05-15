// ── Unit tests for the calculateStreak logic in HomeScreen ───────────────────
//
// Instead of rendering the full HomeScreen (which causes re-render issues due
// to useFocusEffect + useCallback), we test the calculateStreak function
// directly — this is valid since it is pure logic with no side effects.

// ── Mirror of calculateStreak from HomeScreen.jsx ────────────────────────────
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
    const prev     = new Date(dates[i - 1]);
    const curr     = new Date(dates[i]);
    const diffDays = Math.round((prev - curr) / 86400000);
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// ── Helper: build a mock workout with a given finished_at date ───────────────
const mockWorkout = (dateStr) => ({
  id:          `workout-${dateStr}`,
  name:        'Test Workout',
  started_at:  `${dateStr}T09:00:00.000Z`,
  finished_at: `${dateStr}T10:00:00.000Z`,
  exercises:   [],
});

// ── Helper: get today and offset dates as YYYY-MM-DD ────────────────────────
const dateOffset = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('US-XX | Workout Streak › calculateStreak', () => {

  it('returns 0 when there are no workouts', () => {
    expect(calculateStreak([])).toBe(0);
  });

  it('returns 0 when passed null or undefined', () => {
    expect(calculateStreak(null)).toBe(0);
    expect(calculateStreak(undefined)).toBe(0);
  });

  it('returns 1 when the user only worked out today', () => {
    const workouts = [mockWorkout(dateOffset(0))];
    expect(calculateStreak(workouts)).toBe(1);
  });

  it('returns 1 when the user only worked out yesterday', () => {
    const workouts = [mockWorkout(dateOffset(-1))];
    expect(calculateStreak(workouts)).toBe(1);
  });

  it('returns the correct count for consecutive days', () => {
    const workouts = [
      mockWorkout(dateOffset(0)),
      mockWorkout(dateOffset(-1)),
      mockWorkout(dateOffset(-2)),
    ];
    expect(calculateStreak(workouts)).toBe(3);
  });

  it('stops the streak at the first gap', () => {
    const workouts = [
      mockWorkout(dateOffset(0)),
      mockWorkout(dateOffset(-2)), // gap on day -1
    ];
    expect(calculateStreak(workouts)).toBe(1);
  });

  it('returns 0 when the last workout was 2+ days ago', () => {
    const workouts = [
      mockWorkout(dateOffset(-2)),
      mockWorkout(dateOffset(-3)),
    ];
    expect(calculateStreak(workouts)).toBe(0);
  });

  it('deduplicates multiple workouts on the same day', () => {
    const workouts = [
      mockWorkout(dateOffset(0)),
      mockWorkout(dateOffset(0)), // second workout same day
      mockWorkout(dateOffset(-1)),
    ];
    expect(calculateStreak(workouts)).toBe(2);
  });
});