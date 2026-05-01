describe('removeExerciseFromWorkout — pure logic', () => {
  function removeExercise(workouts, workoutId, exerciseId) {
    const workout = workouts.find(w => w.id === workoutId);
    if (!workout) return { success: false, error: 'Workout not found' };
    const before = workout.exercises.length;
    workout.exercises = workout.exercises.filter(e => e.id !== exerciseId);
    const removed = workout.exercises.length < before;
    return removed
      ? { success: true }
      : { success: false, error: 'Exercise not found in workout' };
  }
 
  let db;
  beforeEach(() => {
    db = [
      {
        id: 'w1',
        exercises: [
          { id: 'ex1', name: 'Squat'       },
          { id: 'ex2', name: 'Bench Press' },
          { id: 'ex3', name: 'Deadlift'    },
        ],
      },
    ];
  });
 
  test('removes the target exercise from the list', () => {
    removeExercise(db, 'w1', 'ex1');
    expect(db[0].exercises.some(e => e.id === 'ex1')).toBe(false);
  });
 
  test('returns success when exercise is removed', () => {
    const result = removeExercise(db, 'w1', 'ex2');
    expect(result.success).toBe(true);
  });
 
  test('preserves the remaining exercises', () => {
    removeExercise(db, 'w1', 'ex1');
    expect(db[0].exercises).toHaveLength(2);
    expect(db[0].exercises.map(e => e.id)).toEqual(['ex2', 'ex3']);
  });
 
  test('returns not found for unknown workout', () => {
    const result = removeExercise(db, 'does-not-exist', 'ex1');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/workout not found/i);
  });
 
  test('returns not found for exercise not in workout', () => {
    const result = removeExercise(db, 'w1', 'ex-missing');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/exercise not found/i);
  });
 
  test('removing all exercises leaves an empty list', () => {
    removeExercise(db, 'w1', 'ex1');
    removeExercise(db, 'w1', 'ex2');
    removeExercise(db, 'w1', 'ex3');
    expect(db[0].exercises).toHaveLength(0);
  });
});
