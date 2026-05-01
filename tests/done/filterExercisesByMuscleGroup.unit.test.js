describe('filterExercisesByMuscleGroup — pure logic', () => {
  const exercises = [
    { id: 'bench_press',  name: 'Bench Press',     category: 'Push', muscle: 'Chest' },
    { id: 'incline',      name: 'Incline Press',    category: 'Push', muscle: 'Chest' },
    { id: 'squat',        name: 'Squat',            category: 'Legs', muscle: 'Quads' },
    { id: 'leg_press',    name: 'Leg Press',        category: 'Legs', muscle: 'Quads' },
    { id: 'pull_up',      name: 'Pull Up',          category: 'Pull', muscle: 'Back'  },
    { id: 'plank',        name: 'Plank',            category: 'Core', muscle: 'Core'  },
  ];
 
  function filterByMuscle(group) {
    return exercises.filter(e => e.muscle.toLowerCase() === group.toLowerCase());
  }
 
  test('returns all exercises matching a muscle group', () => {
    const result = filterByMuscle('Chest');
    expect(result).toHaveLength(2);
    result.forEach(e => expect(e.muscle).toBe('Chest'));
  });
 
  test('matching is case-insensitive', () => {
    expect(filterByMuscle('chest')).toHaveLength(2);
    expect(filterByMuscle('CHEST')).toHaveLength(2);
    expect(filterByMuscle('cHeSt')).toHaveLength(2);
  });
 
  test('returns empty array for unknown muscle group', () => {
    expect(filterByMuscle('Neck')).toHaveLength(0);
  });
 
  test('returns empty array for empty string', () => {
    expect(filterByMuscle('')).toHaveLength(0);
  });
 
  test('does not return exercises from a different muscle group', () => {
    const result = filterByMuscle('Quads');
    expect(result.some(e => e.muscle === 'Chest')).toBe(false);
  });
 
  test('returns all quads exercises', () => {
    const result = filterByMuscle('Quads');
    expect(result).toHaveLength(2);
    expect(result.map(e => e.id)).toContain('squat');
    expect(result.map(e => e.id)).toContain('leg_press');
  });
});
