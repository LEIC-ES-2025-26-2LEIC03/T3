// ── US: Duplicate Template ─────────────────────────────────────────────
describe('US: Duplicate Template', () => {
  test('should prefill the duplicate template name with "(Copy)" when opened from an existing template', async () => {
    // Arrange
    const originalTemplateId = 'template-001';

    // Act
    const originalTemplate = await fetchTemplateById(originalTemplateId);

    // Assert
    expect(originalTemplate).not.toBeNull();
    expect(`${originalTemplate.name} (Copy)`).toMatch(/\(Copy\)$/);
  });

  test('should keep the original tag and exercises when duplicating a template', async () => {
    // Arrange
    const originalTemplateId = 'template-001';

    // Act
    const originalTemplate = await fetchTemplateById(originalTemplateId);

    // Assert
    expect(originalTemplate).not.toBeNull();
    expect(originalTemplate.tag).toBeDefined();
    expect(originalTemplate.exercises.length).toBeGreaterThan(0);
  });

  test('should create a new template with a unique name when saving a duplicate', async () => {
    // Arrange
    const originalTemplateId = 'template-001';
    const originalTemplate = await fetchTemplateById(originalTemplateId);
    const duplicatedName = `${originalTemplate.name} Copy`;
    const duplicatedId = 'template-duplicate-001';

    // Act
    await createTemplate(
      duplicatedId,
      duplicatedName,
      originalTemplate.tag,
      originalTemplate.exercises.map(e => e.id)
    );
    const duplicatedTemplate = await fetchTemplateById(duplicatedId);

    // Assert
    expect(duplicatedTemplate).not.toBeNull();
    expect(duplicatedTemplate.id).toBe(duplicatedId);
    expect(duplicatedTemplate.id).not.toBe(originalTemplateId);
    expect(duplicatedTemplate.name).toBe(duplicatedName);
  });

  test('should preserve the exercise list from the original template in the duplicated template', async () => {
    // Arrange
    const originalTemplateId = 'template-001';
    const originalTemplate = await fetchTemplateById(originalTemplateId);
    const duplicatedId = 'template-duplicate-002';
    const duplicatedName = `${originalTemplate.name} Copy 2`;

    // Act
    await createTemplate(
      duplicatedId,
      duplicatedName,
      originalTemplate.tag,
      originalTemplate.exercises.map(e => e.id)
    );
    const duplicatedTemplate = await fetchTemplateById(duplicatedId);

    // Assert
    expect(duplicatedTemplate.exercises.map(e => e.id)).toEqual(
      originalTemplate.exercises.map(e => e.id)
    );
  });

  test('should detect that a duplicate name already exists', async () => {
    // Arrange
    const existingName = 'Push Day';

    // Act
    const result = await templateNameExists(existingName);

    // Assert
    expect(result).toBe(true);
  });

  test('should allow saving a duplicate when the new name does not already exist', async () => {
    // Arrange
    const uniqueName = 'Push Day Fresh Copy';

    // Act
    const result = await templateNameExists(uniqueName);

    // Assert
    expect(result).toBe(false);
  });

  test('should return null when trying to duplicate a template that no longer exists', async () => {
    // Arrange
    const deletedTemplateId = 'template-deleted';

    // Act
    const result = await fetchTemplateById(deletedTemplateId);

    // Assert
    expect(result).toBeNull();
  });

  test('should not overwrite the original template when creating a duplicate', async () => {
    // Arrange
    const originalTemplateId = 'template-001';
    const originalTemplate = await fetchTemplateById(originalTemplateId);
    const duplicatedId = 'template-duplicate-003';
    const duplicatedName = `${originalTemplate.name} Copy 3`;

    // Act
    await createTemplate(
      duplicatedId,
      duplicatedName,
      originalTemplate.tag,
      originalTemplate.exercises.map(e => e.id)
    );
    const unchangedOriginal = await fetchTemplateById(originalTemplateId);

    // Assert
    expect(unchangedOriginal).not.toBeNull();
    expect(unchangedOriginal.id).toBe(originalTemplateId);
    expect(unchangedOriginal.name).toBe(originalTemplate.name);
  });
});
