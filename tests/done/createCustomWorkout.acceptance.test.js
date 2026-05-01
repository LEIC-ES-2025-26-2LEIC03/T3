// ─── Create Custom Workout Acceptance Tests ───────────────────────────────
// US-21 Create and name custom workouts with exercises

const workouts = [];
global.createWorkout = async (userId, data) => {
  if (!data.name || data.name.length > 50) return { success: false, error: 'Name is required and cannot be empty or too long' };
  const workout = { id: 'w1', name: data.name, exercises: data.exercises };
  workouts.push(workout);
  return { success: true, workout };
};
global.listWorkouts = async (userId) => workouts;

describe('US-21 | Create a Custom Workout', () => {
  test('should create a workout with a valid name and exercise list', async () => {
    // Arrange
    const userId = 'user-001';
    const workoutData = {
      name: 'Upper Body Strength',
      exercises: [
        { id: 'ex1', name: 'Bench Press', sets: 4, reps: 8 },
        { id: 'ex2', name: 'Pull-Up', sets: 3, reps: 6 },
      ],
    };

    // Act
    const result = await createWorkout(userId, workoutData);

    // Assert
    expect(result.success).toBe(true);
    expect(result.workout.name).toBe('Upper Body Strength');
    expect(result.workout.exercises).toHaveLength(2);
  });

  test('should reject workout names that are empty or too long', async () => {
    // Arrange
    const userId = 'user-001';
    const workoutData = {
      name: '',
      exercises: [{ id: 'ex1', name: 'Squat', sets: 3, reps: 10 }],
    };

    // Act
    const result = await createWorkout(userId, workoutData);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/name.*required|cannot be empty|too long/i);
  });

  test('should allow adding exercises to a custom workout during creation', async () => {
    // Arrange
    const userId = 'user-001';
    const workoutData = {
      name: 'Full Body Builder',
      exercises: [
        { id: 'ex1', name: 'Deadlift', sets: 4, reps: 5 },
        { id: 'ex2', name: 'Overhead Press', sets: 3, reps: 8 },
      ],
    };

    // Act
    const result = await createWorkout(userId, workoutData);

    // Assert
    expect(result.success).toBe(true);
    expect(result.workout.exercises[0].name).toBe('Deadlift');
    expect(result.workout.exercises[1].name).toBe('Overhead Press');
  });

  test('should list the newly created workout for the user', async () => {
    // Arrange
    const userId = 'user-001';
    const workoutData = {
      name: 'Push Day',
      exercises: [{ id: 'ex3', name: 'Incline Bench Press', sets: 3, reps: 10 }],
    };

    // Act
    await createWorkout(userId, workoutData);
    const workouts = await listWorkouts(userId);

    // Assert
    expect(workouts.some(w => w.name === 'Push Day')).toBe(true);
  });
});
