describe('editWorkout — pure logic', () => {
  function validateUpdate(updates) {
    if (updates.name !== undefined && updates.name.trim() === '') {
      return { valid: false, error: 'Name cannot be empty' };
    }
    if (updates.exercises) {
      for (const ex of updates.exercises) {
        if (ex.reps < 0) return { valid: false, error: 'reps must be positive' };
        if (ex.sets < 0) return { valid: false, error: 'sets must be positive' };
        if (ex.weight !== undefined && ex.weight < 0) {
          return { valid: false, error: 'weight must be non-negative' };
        }
      }
    }
    return { valid: true };
  }
 
  function applyUpdate(workouts, id, updates) {
    const validation = validateUpdate(updates);
    if (!validation.valid) return { success: false, error: validation.error };
    const idx = workouts.findIndex(w => w.id === id);
    if (idx === -1) return { success: false, error: 'Workout not found' };
    workouts[idx] = { ...workouts[idx], ...updates, updated_at: new Date().toISOString() };
    return { success: true };
  }
 
  let db;
  beforeEach(() => {
    db = [
      {
        id: 'w1', user_id: 'user-001', name: 'Old Name',
        exercises: [{ id: 'ex1', name: 'Squat', sets: 3, reps: 5, weight: 100 }],
        updated_at: '2024-01-01T00:00:00.000Z',
      },
    ];
  });
 
  test('updates workout name successfully', () => {
    const result = applyUpdate(db, 'w1', { name: 'New Name' });
    expect(result.success).toBe(true);
    expect(db[0].name).toBe('New Name');
  });
 
  test('stamps updated_at on a successful edit', () => {
    const before = db[0].updated_at;
    applyUpdate(db, 'w1', { name: 'Changed' });
    expect(db[0].updated_at).not.toBe(before);
  });
 
  test('replaces exercise list on update', () => {
    const newExercises = [
      { id: 'ex2', name: 'Bench Press', sets: 4, reps: 8, weight: 80 },
    ];
    applyUpdate(db, 'w1', { exercises: newExercises });
    expect(db[0].exercises).toHaveLength(1);
    expect(db[0].exercises[0].name).toBe('Bench Press');
  });
 
  test('rejects negative reps', () => {
    const result = applyUpdate(db, 'w1', {
      exercises: [{ id: 'ex1', name: 'Squat', sets: 3, reps: -1, weight: 100 }],
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/reps.*positive|positive.*reps/i);
  });
 
  test('rejects negative sets', () => {
    const result = applyUpdate(db, 'w1', {
      exercises: [{ id: 'ex1', name: 'Squat', sets: -3, reps: 5, weight: 100 }],
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/sets.*positive/i);
  });
 
  test('rejects negative weight', () => {
    const result = applyUpdate(db, 'w1', {
      exercises: [{ id: 'ex1', name: 'Squat', sets: 3, reps: 5, weight: -10 }],
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/weight.*non-negative/i);
  });
 
  test('rejects empty name', () => {
    const result = applyUpdate(db, 'w1', { name: '   ' });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/cannot be empty/i);
  });
 
  test('returns not found for unknown id', () => {
    const result = applyUpdate(db, 'does-not-exist', { name: 'X' });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });
});
