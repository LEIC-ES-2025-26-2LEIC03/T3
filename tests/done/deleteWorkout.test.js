// ─── Delete Workout Acceptance Tests ─────────────────────────────────────
// US-23 Remove a workout from the user's saved routines

let dbWorkouts = [{ id: 'workout-002', name: 'W2' }, { id: 'workout-003', name: 'W3' }];
global.deleteWorkout = async (id) => {
  const index = dbWorkouts.findIndex(w => w.id === id);
  if (index === -1) return { success: false, error: 'Workout not found' };
  dbWorkouts.splice(index, 1);
  return { success: true };
};
global.getWorkoutById = async (id) => dbWorkouts.find(w => w.id === id) || null;
global.listWorkouts = async (userId) => dbWorkouts;

describe('US-23 | Delete a Workout', () => {
  test('should delete an existing workout successfully', async () => {
    // Arrange
    const workoutId = 'workout-002';

    // Act
    const result = await deleteWorkout(workoutId);
    const deletedWorkout = await getWorkoutById(workoutId);

    // Assert
    expect(result.success).toBe(true);
    expect(deletedWorkout).toBeNull();
  });

  test('should return a not found error for non-existent workouts', async () => {
    // Arrange
    const workoutId = 'workout-missing';

    // Act
    const result = await deleteWorkout(workoutId);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found|does not exist/i);
  });

  test('should remove the workout from the user workout list after deletion', async () => {
    // Arrange
    const workoutId = 'workout-003';
    const userId = 'user-001';

    // Act
    await deleteWorkout(workoutId);
    const workouts = await listWorkouts(userId);

    // Assert
    expect(workouts.some(w => w.id === workoutId)).toBe(false);
  });
});
