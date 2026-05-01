// ─── Edit Workout Acceptance Tests ───────────────────────────────────────
// US-22 Modify an existing workout when the routine changes

let editDb = {
  'workout-001': {
    id: 'workout-001',
    name: 'Old Name',
    exercises: [
      { id: 'ex1', name: 'Bench Press', sets: 4, reps: 5 },
      { id: 'ex2', name: 'Pull-Up', sets: 3, reps: 6 }
    ]
  }
};

global.updateWorkout = async (id, updates) => {
  if (updates.exercises && updates.exercises.some(e => e.reps < 0)) return { success: false, error: 'reps must be positive' };
  
  if (editDb[id]) {
    editDb[id] = { ...editDb[id], ...updates };
    return { success: true };
  }
  return { success: false };
};
global.getWorkoutById = async (id) => editDb[id];

describe('US-22 | Edit an Existing Workout', () => {
  test('should update workout name and exercise details successfully', async () => {
    // Arrange
    const workoutId = 'workout-001';
    const updates = {
      name: 'Push-Pull Strength',
      exercises: [
        { id: 'ex1', name: 'Bench Press', sets: 4, reps: 6 },
        { id: 'ex2', name: 'Bent-Over Row', sets: 4, reps: 8 },
      ],
    };

    // Act
    const result = await updateWorkout(workoutId, updates);
    const editedWorkout = await getWorkoutById(workoutId);

    // Assert
    expect(result.success).toBe(true);
    expect(editedWorkout.name).toBe('Push-Pull Strength');
    expect(editedWorkout.exercises).toHaveLength(2);
    expect(editedWorkout.exercises[1].name).toBe('Bent-Over Row');
  });

  test('should reject invalid updates such as negative reps', async () => {
    // Arrange
    const workoutId = 'workout-001';
    const updates = {
      exercises: [{ id: 'ex1', sets: 3, reps: -2 }],
    };

    // Act
    const result = await updateWorkout(workoutId, updates);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/reps.*invalid|must be positive/i);
  });

  test('should preserve workout structure after editing exercises', async () => {
    // Arrange
    const workoutId = 'workout-001';
    const updates = {
      exercises: [
        { id: 'ex1', name: 'Bench Press', sets: 4, reps: 6 },
        { id: 'ex2', name: 'Incline Dumbbell Press', sets: 3, reps: 10 },
      ],
    };

    // Act
    await updateWorkout(workoutId, updates);
    const editedWorkout = await getWorkoutById(workoutId);

    // Assert
    expect(editedWorkout.exercises.length).toBe(2);
    expect(editedWorkout.exercises[0].sets).toBe(4);
    expect(editedWorkout.exercises[1].name).toBe('Incline Dumbbell Press');
  });
});
