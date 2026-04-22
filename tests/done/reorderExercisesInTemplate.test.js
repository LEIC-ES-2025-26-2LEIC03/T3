// ─── Reorder Exercises within a Template Acceptance Tests ────────────────────────

let templateDb = {
  'template-1': {
    id: 'template-1',
    exercises: [
      { id: 'ex1', order: 1, name: 'Squat' },
      { id: 'ex2', order: 2, name: 'Bench Press' },
      { id: 'ex3', order: 3, name: 'Deadlift' }
    ]
  }
};

global.reorderExercisesInTemplate = async (templateId, newOrder) => {
  if (templateDb[templateId]) {
    const newExercises = [];
    newOrder.forEach((exId, index) => {
      const exercise = templateDb[templateId].exercises.find(e => e.id === exId);
      if (exercise) {
        newExercises.push({ ...exercise, order: index + 1 });
      }
    });
    templateDb[templateId].exercises = newExercises;
    return { success: true };
  }
  return { success: false, error: 'Template not found' };
};

global.getTemplateById = async (id) => templateDb[id] || null;

describe('Reorder Exercises within a Template', () => {
  test('should update the order of exercises successfully', async () => {
    const templateId = 'template-1';
    const newOrder = ['ex3', 'ex1', 'ex2'];
    
    const result = await reorderExercisesInTemplate(templateId, newOrder);
    const updatedTemplate = await getTemplateById(templateId);
    
    expect(result.success).toBe(true);
    expect(updatedTemplate.exercises[0].id).toBe('ex3');
    expect(updatedTemplate.exercises[1].id).toBe('ex1');
    expect(updatedTemplate.exercises[2].id).toBe('ex2');
    expect(updatedTemplate.exercises[0].order).toBe(1);
  });
});
