describe('logWorkout — pure logic', () => {
  function validateWorkout(workout) {
    if (!workout.exercises || workout.exercises.length === 0) {
      return { success: false, error: 'Please add at least one exercise before finishing.' };
    }

    // Check if at least one valid set exists
    let hasValidSet = false;
    for (const ex of workout.exercises) {
      if (ex.sets && ex.sets.length > 0) {
        hasValidSet = true;
        break;
      }
    }

    if (!hasValidSet) {
      return { success: false, error: 'Please log at least one set.' };
    }

    return { success: true };
  }

  test('rejects workout with no exercises', () => {
    const workout = { exercises: [] };
    const result = validateWorkout(workout);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/at least one exercise/i);
  });

  test('rejects workout with exercises but no sets', () => {
    const workout = {
      exercises: [{ id: 'ex1', sets: [] }]
    };
    const result = validateWorkout(workout);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/at least one set/i);
  });

  test('accepts workout with at least one exercise and one set', () => {
    const workout = {
      exercises: [{ id: 'ex1', sets: [{ weight: 100, reps: 5 }] }]
    };
    const result = validateWorkout(workout);
    expect(result.success).toBe(true);
  });
});
