// ─── Start Free Workout Acceptance Tests ─────────────────────────────────
// US-26 Start a free workout session without a template

describe('US-26 | Start a Free Workout Session', () => {
  test('should create a free workout session without a template', async () => {
    // Arrange
    const userId = 'user-001';

    // Act
    const session = await startFreeWorkoutSession(userId);

    // Assert
    expect(session).toBeDefined();
    expect(session.id).toBeDefined();
    expect(session.type).toBe('free');
    expect(session.templateId).toBeNull();
    expect(Array.isArray(session.exercises)).toBe(true);
  });

  test('should initialize the session with an empty exercise list', async () => {
    // Arrange
    const userId = 'user-001';

    // Act
    const session = await startFreeWorkoutSession(userId);

    // Assert
    expect(session.exercises).toEqual([]);
  });

  test('should allow adding exercises to the free workout session after creation', async () => {
    // Arrange
    const userId = 'user-001';
    const session = await startFreeWorkoutSession(userId);
    const newExercise = { id: 'ex1', name: 'Dumbbell Curl', sets: 3, reps: 12 };

    // Act
    const addResult = await addExerciseToSession(session.id, newExercise);
    const updatedSession = await getSession(session.id);

    // Assert
    expect(addResult.success).toBe(true);
    expect(updatedSession.exercises).toHaveLength(1);
    expect(updatedSession.exercises[0].name).toBe('Dumbbell Curl');
  });
});
