describe('listMyWorkouts — pure logic', () => {
  const db = [
    { id: 'w1', user_id: 'user-001', name: 'Push Day', deleted_at: null },
    { id: 'w2', user_id: 'user-001', name: 'Pull Day', deleted_at: null },
    { id: 'w3', user_id: 'user-001', name: 'Deleted',  deleted_at: '2024-06-01T00:00:00.000Z' },
    { id: 'w4', user_id: 'user-002', name: 'Leg Day',  deleted_at: null },
  ];
 
  function listWorkouts(userId) {
    return db.filter(w => w.user_id === userId && !w.deleted_at);
  }
 
  test('returns only this user\'s non-deleted workouts', () => {
    const result = listWorkouts('user-001');
    expect(result).toHaveLength(2);
    result.forEach(w => expect(w.user_id).toBe('user-001'));
  });
 
  test('excludes soft-deleted workouts', () => {
    const result = listWorkouts('user-001');
    expect(result.some(w => w.id === 'w3')).toBe(false);
  });
 
  test('does not include other users\' workouts', () => {
    const result = listWorkouts('user-001');
    expect(result.some(w => w.user_id === 'user-002')).toBe(false);
  });
 
  test('returns empty array for user with no workouts', () => {
    expect(listWorkouts('user-003')).toHaveLength(0);
  });
 
  test('returns empty array for unknown user', () => {
    expect(listWorkouts('ghost')).toHaveLength(0);
  });
});
