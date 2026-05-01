describe('startFreeWorkout — pure logic', () => {
  let idCounter = 0;
  const generateId = () => `session-${++idCounter}`;
 
  function createFreeSession(userId) {
    if (!userId) return { success: false, error: 'userId is required' };
    return {
      success: true,
      session: {
        id:         generateId(),
        user_id:    userId,
        type:       'free',
        templateId: null,
        exercises:  [],
        started_at: new Date().toISOString(),
      },
    };
  }
 
  function addExerciseToSession(session, exercise) {
    if (!exercise?.id)   return { success: false, error: 'Exercise id is required' };
    if (!exercise?.name) return { success: false, error: 'Exercise name is required' };
    session.exercises.push({ ...exercise, sets: exercise.sets ?? [] });
    return { success: true };
  }
 
  beforeEach(() => { idCounter = 0; });
 
  test('creates a session with type "free"', () => {
    const { session } = createFreeSession('user-001');
    expect(session.type).toBe('free');
  });
 
  test('session has no template association', () => {
    const { session } = createFreeSession('user-001');
    expect(session.templateId).toBeNull();
  });
 
  test('session starts with an empty exercise list', () => {
    const { session } = createFreeSession('user-001');
    expect(session.exercises).toEqual([]);
  });
 
  test('session has a generated id', () => {
    const { session } = createFreeSession('user-001');
    expect(session.id).toBeDefined();
    expect(typeof session.id).toBe('string');
  });
 
  test('session records the user id', () => {
    const { session } = createFreeSession('user-001');
    expect(session.user_id).toBe('user-001');
  });
 
  test('session has a started_at timestamp', () => {
    const { session } = createFreeSession('user-001');
    expect(session.started_at).toBeDefined();
    expect(() => new Date(session.started_at)).not.toThrow();
  });
 
  test('two sessions get different ids', () => {
    const a = createFreeSession('user-001').session;
    const b = createFreeSession('user-001').session;
    expect(a.id).not.toBe(b.id);
  });
 
  test('fails without a userId', () => {
    const result = createFreeSession(null);
    expect(result.success).toBe(false);
  });
 
  test('adding an exercise increases the exercise count', () => {
    const { session } = createFreeSession('user-001');
    addExerciseToSession(session, { id: 'ex1', name: 'Squat' });
    expect(session.exercises).toHaveLength(1);
  });
 
  test('added exercise is stored with correct name', () => {
    const { session } = createFreeSession('user-001');
    addExerciseToSession(session, { id: 'ex1', name: 'Deadlift' });
    expect(session.exercises[0].name).toBe('Deadlift');
  });
 
  test('adding exercise without id returns error', () => {
    const { session } = createFreeSession('user-001');
    const result = addExerciseToSession(session, { name: 'Squat' });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/id.*required/i);
  });
 
  test('adding exercise without name returns error', () => {
    const { session } = createFreeSession('user-001');
    const result = addExerciseToSession(session, { id: 'ex1' });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/name.*required/i);
  });
 
  test('multiple exercises can be added sequentially', () => {
    const { session } = createFreeSession('user-001');
    addExerciseToSession(session, { id: 'ex1', name: 'Squat'   });
    addExerciseToSession(session, { id: 'ex2', name: 'Bench'   });
    addExerciseToSession(session, { id: 'ex3', name: 'Deadlift' });
    expect(session.exercises).toHaveLength(3);
  });
});
