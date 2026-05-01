describe('renameWorkout — pure logic', () => {
  function rename(workouts, workoutId, newName) {
    if (!newName || newName.trim() === '') {
      return { success: false, error: 'Name cannot be empty' };
    }
    const workout = workouts.find(w => w.id === workoutId);
    if (!workout) return { success: false, error: 'Workout not found' };
    workout.name = newName.trim();
    return { success: true };
  }
 
  let db;
  beforeEach(() => {
    db = [{ id: 'w1', name: 'Old Name' }];
  });
 
  test('renames the workout successfully', () => {
    rename(db, 'w1', 'New Name');
    expect(db[0].name).toBe('New Name');
  });
 
  test('returns success on valid rename', () => {
    expect(rename(db, 'w1', 'New Name').success).toBe(true);
  });
 
  test('trims whitespace from the new name', () => {
    rename(db, 'w1', '  Trimmed Name  ');
    expect(db[0].name).toBe('Trimmed Name');
  });
 
  test('rejects an empty string', () => {
    const result = rename(db, 'w1', '');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/cannot be empty/i);
  });
 
  test('rejects a whitespace-only string', () => {
    const result = rename(db, 'w1', '   ');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/cannot be empty/i);
  });
 
  test('rejects null', () => {
    const result = rename(db, 'w1', null);
    expect(result.success).toBe(false);
  });
 
  test('returns not found for unknown workout', () => {
    const result = rename(db, 'does-not-exist', 'New Name');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });
});
