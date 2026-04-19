// ─── Delete Workout Acceptance Tests ─────────────────────────────────────
// US-23 Remove a workout from the user's saved routines


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
