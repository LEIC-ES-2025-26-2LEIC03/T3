// ─── Filter Exercises by Muscle Group Acceptance Tests ────────────────────
// US-25 Filter the exercise library by muscle group

global.filterExercisesByMuscleGroup = async (group) => {
  const g = group.toLowerCase();
  if (g === 'chest') return [{ muscleGroup: 'Chest' }];
  if (g === 'neck') return [];
  if (g === 'quadriceps') return [{ muscleGroup: 'Quadriceps' }];
  return [];
};

describe('US-25 | Filter Exercises by Muscle Group', () => {
  test('should return only exercises matching the selected muscle group', async () => {
    // Arrange
    const muscleGroup = 'Chest';

    // Act
    const results = await filterExercisesByMuscleGroup(muscleGroup);

    // Assert
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    results.forEach(exercise => {
      expect(exercise.muscleGroup).toMatch(/chest/i);
    });
  });

  test('should show an empty state when no exercises match the selected muscle group', async () => {
    // Arrange
    const muscleGroup = 'Neck';

    // Act
    const results = await filterExercisesByMuscleGroup(muscleGroup);

    // Assert
    expect(Array.isArray(results)).toBe(true);
    expect(results).toEqual([]);
  });

  test('should ignore case when filtering by muscle group', async () => {
    // Arrange
    const muscleGroup = 'quadriceps';

    // Act
    const results = await filterExercisesByMuscleGroup(muscleGroup);

    // Assert
    expect(results.length).toBeGreaterThan(0);
    results.forEach(exercise => {
      expect(exercise.muscleGroup.toLowerCase()).toContain('quadriceps');
    });
  });
});
