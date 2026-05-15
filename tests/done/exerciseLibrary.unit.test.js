import { EXERCISES, MUSCLES } from '../../src/data/exercises';

function filterLibrary(exercises, search = '', muscle = 'All') {
  return exercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    const matchesMuscle = muscle === 'All' || ex.muscle.includes(muscle);
    return matchesSearch && matchesMuscle;
  });
}

describe('US-04 | Exercise Library unit tests', () => {
  it('ships a non-empty built-in exercise catalogue with expected fields', () => {
    expect(EXERCISES.length).toBeGreaterThan(0);
    expect(EXERCISES[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
        category: expect.any(String),
        muscle: expect.any(String),
      })
    );
  });

  it('declares muscle filters that exist in the catalogue', () => {
    const catalogueMuscles = new Set(EXERCISES.flatMap(ex => ex.muscle.split(', ')));

    MUSCLES.forEach(muscle => {
      expect(catalogueMuscles.has(muscle)).toBe(true);
    });
  });

  it('filters exercises by case-insensitive search', () => {
    const results = filterLibrary(EXERCISES, 'bench press');

    expect(results.length).toBeGreaterThan(0);
    results.forEach(ex => expect(ex.name.toLowerCase()).toContain('bench press'));
  });

  it('filters exercises by muscle group while preserving multi-muscle matches', () => {
    const results = filterLibrary(EXERCISES, '', 'Triceps');

    expect(results.length).toBeGreaterThan(0);
    expect(results.some(ex => ex.muscle.includes('Chest, Triceps'))).toBe(true);
    results.forEach(ex => expect(ex.muscle).toContain('Triceps'));
  });

  it('combines search and muscle filters', () => {
    const results = filterLibrary(EXERCISES, 'press', 'Shoulders');

    expect(results.length).toBeGreaterThan(0);
    results.forEach(ex => {
      expect(ex.name.toLowerCase()).toContain('press');
      expect(ex.muscle).toContain('Shoulders');
    });
  });
});

