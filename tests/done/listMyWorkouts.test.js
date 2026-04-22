// ─── See a List of My Workouts Acceptance Tests ─────────────────────────────────

const myWorkoutsDb = {
  'user-1': [
    { id: 'w1', name: 'Morning Run' },
    { id: 'w2', name: 'Leg Day' }
  ],
  'user-2': []
};

global.listMyWorkouts = async (userId) => {
  return myWorkoutsDb[userId] || [];
};

describe('See a List of My Workouts', () => {
  test('should return a list of workouts for a user with existing workouts', async () => {
    const userId = 'user-1';
    const workouts = await listMyWorkouts(userId);
    
    expect(Array.isArray(workouts)).toBe(true);
    expect(workouts).toHaveLength(2);
    expect(workouts[0].name).toBe('Morning Run');
    expect(workouts[1].name).toBe('Leg Day');
  });

  test('should return an empty list for a user with no workouts', async () => {
    const userId = 'user-2';
    const workouts = await listMyWorkouts(userId);
    
    expect(Array.isArray(workouts)).toBe(true);
    expect(workouts).toHaveLength(0);
  });

  test('should return an empty list for a non-existent user', async () => {
    const userId = 'non-existent-user';
    const workouts = await listMyWorkouts(userId);
    
    expect(Array.isArray(workouts)).toBe(true);
    expect(workouts).toHaveLength(0);
  });
});
