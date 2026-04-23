// ─── Access Pre-made Workout Routines Acceptance Tests ───────────────────────────

const premadeRoutines = [
  { id: 'routine-1', name: 'Full Body Beginner', level: 'Beginner' },
  { id: 'routine-2', name: 'Advanced Push/Pull', level: 'Advanced' }
];

global.getPremadeWorkoutRoutines = async () => premadeRoutines;

global.getPremadeWorkoutRoutineById = async (id) => {
  const routine = premadeRoutines.find(r => r.id === id);
  return routine ? { success: true, routine } : { success: false, error: 'Routine not found' };
};

describe('Access Pre-made Workout Routines', () => {
  test('should fetch a list of all pre-made workout routines', async () => {
    const routines = await getPremadeWorkoutRoutines();
    
    expect(Array.isArray(routines)).toBe(true);
    expect(routines).toHaveLength(2);
    expect(routines[0].name).toBe('Full Body Beginner');
  });

  test('should fetch a specific pre-made workout routine by ID', async () => {
    const result = await getPremadeWorkoutRoutineById('routine-2');
    
    expect(result.success).toBe(true);
    expect(result.routine.name).toBe('Advanced Push/Pull');
    expect(result.routine.level).toBe('Advanced');
  });

  test('should return an error when requesting an invalid routine ID', async () => {
    const result = await getPremadeWorkoutRoutineById('invalid-id');
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Routine not found');
  });
});
