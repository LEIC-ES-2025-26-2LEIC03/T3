describe('reorderExercisesInTemplate — pure logic', () => {
  function reorder(templates, templateId, newOrder) {
    const template = templates.find(t => t.id === templateId);
    if (!template) return { success: false, error: 'Template not found' };
 
    const reordered = newOrder.map((exId, index) => {
      const ex = template.exercises.find(e => e.id === exId);
      return ex ? { ...ex, position: index } : null;
    }).filter(Boolean);
 
    // Reject if any requested id wasn't found
    if (reordered.length !== newOrder.length) {
      return { success: false, error: 'One or more exercise IDs not found' };
    }
 
    template.exercises = reordered;
    return { success: true };
  }
 
  let db;
  beforeEach(() => {
    db = [
      {
        id: 'template-1',
        exercises: [
          { id: 'ex1', name: 'Squat',       position: 0 },
          { id: 'ex2', name: 'Bench Press', position: 1 },
          { id: 'ex3', name: 'Deadlift',    position: 2 },
        ],
      },
    ];
  });
 
  test('reorders exercises to the requested sequence', () => {
    reorder(db, 'template-1', ['ex3', 'ex1', 'ex2']);
    expect(db[0].exercises[0].id).toBe('ex3');
    expect(db[0].exercises[1].id).toBe('ex1');
    expect(db[0].exercises[2].id).toBe('ex2');
  });
 
  test('updates position values to match the new order', () => {
    reorder(db, 'template-1', ['ex3', 'ex1', 'ex2']);
    expect(db[0].exercises[0].position).toBe(0);
    expect(db[0].exercises[1].position).toBe(1);
    expect(db[0].exercises[2].position).toBe(2);
  });
 
  test('returns success on a valid reorder', () => {
    const result = reorder(db, 'template-1', ['ex2', 'ex3', 'ex1']);
    expect(result.success).toBe(true);
  });
 
  test('preserves exercise names through the reorder', () => {
    reorder(db, 'template-1', ['ex3', 'ex1', 'ex2']);
    expect(db[0].exercises[0].name).toBe('Deadlift');
  });
 
  test('returns not found for unknown template', () => {
    const result = reorder(db, 'does-not-exist', ['ex1', 'ex2', 'ex3']);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });
 
  test('returns error when order contains an unknown exercise id', () => {
    const result = reorder(db, 'template-1', ['ex1', 'ex-ghost', 'ex3']);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });
 
  test('same-order reorder is a no-op that still succeeds', () => {
    const result = reorder(db, 'template-1', ['ex1', 'ex2', 'ex3']);
    expect(result.success).toBe(true);
    expect(db[0].exercises[0].id).toBe('ex1');
  });
});
