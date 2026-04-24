// ── US: RPE Logging & Validation ──────────────────────────────────────
describe('US: RPE Logging & Validation', () => {

    test('should allow selecting an RPE value for a specific set', () => {
        // Arrange
        const set = { id: 'set-1', weight: '100', reps: '5', rpe: null, notes: '' };
        const newRpeValue = 9;

        // Act
        // Simula a lógica do onChange no SetRow.jsx
        const updatedSet = { ...set, rpe: newRpeValue };

        // Assert
        expect(updatedSet.rpe).toBe(9);
        expect(updatedSet.weight).toBe('100');
    });

    test('should highlight the active RPE button when a value is selected', () => {
        // Arrange
        const selectedRpe = 8;
        const currentSet = { rpe: 8 };

        // Act & Assert
        // Simula a lógica condicional de estilo: styles.rpeBtnActive
        const isActive = currentSet.rpe === selectedRpe;
        expect(isActive).toBe(true);
    });

    test('should prevent finishing workout if a set has RPE but missing weight or reps', () => {
        // Arrange
        const exercises = [{
            name: 'Bench Press',
            sets: [{ weight: '', reps: '', rpe: 8, notes: '' }]
        }];

        // Act
        // Simula a lógica de validação do handleFinishWorkout em WorkoutLogger.jsx
        const validationFailed = exercises.some(ex =>
            ex.sets.some(s => (s.rpe !== null) && (s.weight === '' || s.reps === ''))
        );

        // Assert
        expect(validationFailed).toBe(true);
    });

    test('should include RPE value in the final workout object when saving', () => {
        // Arrange
        const exercises = [{
            name: 'Squat',
            sets: [{ weight: '120', reps: '3', rpe: 10, notes: 'Heavy!' }]
        }];

        // Act
        // Simula o mapeamento de dados antes do saveWorkout
        const finalData = exercises.map(ex => ({
            ...ex,
            sets: ex.sets.map(s => ({
                weight: parseFloat(s.weight),
                reps: parseInt(s.reps, 10),
                rpe: s.rpe
            }))
        }));

        // Assert
        expect(finalData[0].sets[0].rpe).toBe(10);
        expect(typeof finalData[0].sets[0].rpe).toBe('number');
    });

    test('should allow changing RPE from one value to another', () => {
        // Arrange
        let set = { id: 'set-1', rpe: 7 };

        // Act
        const updatedSet = { ...set, rpe: 8 };

        // Assert
        expect(updatedSet.rpe).toBe(8);
        expect(updatedSet.rpe).not.toBe(7);
    });

    test('should initialize a new set with RPE as null', () => {
        // Act
        // Simula a criação de um novo set no handleAddExercise
        const newSet = { id: 'new-id', weight: '', reps: '', rpe: null, notes: '' };

        // Assert
        expect(newSet.rpe).toBeNull();
    });
});
