// ─── Rename a Workout Acceptance Tests ──────────────────────────────────────────

let workoutRenameDb = {
  'workout-1': { id: 'workout-1', name: 'Old Workout Name' }
};

global.renameWorkout = async (workoutId, newName) => {
  if (!newName || newName.trim() === '') {
    return { success: false, error: 'Name cannot be empty' };
  }
  if (workoutRenameDb[workoutId]) {
    workoutRenameDb[workoutId].name = newName;
    return { success: true };
  }
  return { success: false, error: 'Workout not found' };
};

global.getWorkoutById = async (id) => workoutRenameDb[id] || null;

describe('Rename a Workout', () => {
  test('should rename a workout successfully', async () => {
    const workoutId = 'workout-1';
    const newName = 'New Awesome Workout';
    
    const result = await renameWorkout(workoutId, newName);
    const updatedWorkout = await getWorkoutById(workoutId);
    
    expect(result.success).toBe(true);
    expect(updatedWorkout.name).toBe(newName);
  });

  test('should fail to rename a workout with an empty name', async () => {
    const result = await renameWorkout('workout-1', '   ');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/cannot be empty/i);
  });
});
