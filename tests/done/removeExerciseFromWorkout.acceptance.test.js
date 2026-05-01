// ─── Remove Exercise from Workout Acceptance Tests ───────────────────────────────

let workoutDb = {
  'workout-1': {
    id: 'workout-1',
    exercises: [{ id: 'ex1', name: 'Squat' }, { id: 'ex2', name: 'Bench Press' }]
  }
};

global.removeExerciseFromWorkout = async (workoutId, exerciseId) => {
  if (workoutDb[workoutId]) {
    workoutDb[workoutId].exercises = workoutDb[workoutId].exercises.filter(e => e.id !== exerciseId);
    return { success: true };
  }
  return { success: false, error: 'Workout not found' };
};
global.getWorkoutById = async (id) => workoutDb[id] || null;

describe('Remove Exercise from Workout', () => {
  test('should successfully remove an exercise from a workout', async () => {
    const workoutId = 'workout-1';
    const exerciseId = 'ex1';
    
    const result = await removeExerciseFromWorkout(workoutId, exerciseId);
    const updatedWorkout = await getWorkoutById(workoutId);
    
    expect(result.success).toBe(true);
    expect(updatedWorkout.exercises).toHaveLength(1);
    expect(updatedWorkout.exercises[0].id).toBe('ex2');
  });

  test('should return an error if the workout does not exist', async () => {
    const result = await removeExerciseFromWorkout('invalid-id', 'ex1');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Workout not found');
  });
});
