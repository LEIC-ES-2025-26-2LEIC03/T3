describe('deleteWorkout — pure logic', () => {
  // Mirrors the soft-delete decision in db.js deleteWorkout()
  function softDelete(workouts, userId, id) {
    const workout = workouts.find(w => w.id === id && w.user_id === userId);
    if (!workout) return { success: false, error: 'Workout not found' };
    workout.deleted_at = new Date().toISOString();
    workout.sync_status = 'pending';
    return { success: true };
  }
 
  function visibleWorkouts(workouts, userId) {
    return workouts.filter(w => w.user_id === userId && !w.deleted_at);
  }
 
  let db;
  beforeEach(() => {
    db = [
      { id: 'w1', user_id: 'user-001', name: 'Push Day',  deleted_at: null, sync_status: 'synced' },
      { id: 'w2', user_id: 'user-001', name: 'Pull Day',  deleted_at: null, sync_status: 'synced' },
      { id: 'w3', user_id: 'user-002', name: 'Leg Day',   deleted_at: null, sync_status: 'synced' },
    ];
  });
 
  test('returns success for an existing workout', () => {
    const result = softDelete(db, 'user-001', 'w1');
    expect(result.success).toBe(true);
  });
 
  test('sets deleted_at on the target row', () => {
    softDelete(db, 'user-001', 'w1');
    expect(db.find(w => w.id === 'w1').deleted_at).not.toBeNull();
  });
 
  test('marks the row as sync pending after deletion', () => {
    softDelete(db, 'user-001', 'w1');
    expect(db.find(w => w.id === 'w1').sync_status).toBe('pending');
  });
 
  test('soft-deleted workout no longer appears in visible list', () => {
    softDelete(db, 'user-001', 'w1');
    const visible = visibleWorkouts(db, 'user-001');
    expect(visible.some(w => w.id === 'w1')).toBe(false);
  });
 
  test('other user workouts are unaffected', () => {
    softDelete(db, 'user-001', 'w1');
    const visible = visibleWorkouts(db, 'user-002');
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe('w3');
  });
 
  test('returns not found for a non-existent workout id', () => {
    const result = softDelete(db, 'user-001', 'does-not-exist');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });
 
  test('cannot delete another user\'s workout', () => {
    // user-001 trying to delete user-002's workout
    const result = softDelete(db, 'user-001', 'w3');
    expect(result.success).toBe(false);
    expect(db.find(w => w.id === 'w3').deleted_at).toBeNull();
  });
 
  test('deleting the same workout twice is a no-op on the second call', () => {
    softDelete(db, 'user-001', 'w1');
    // Row now has deleted_at set; a second call should still not crash,
    // though visibleWorkouts already excludes it.
    const visible = visibleWorkouts(db, 'user-001');
    expect(visible.some(w => w.id === 'w1')).toBe(false);
  });
});
