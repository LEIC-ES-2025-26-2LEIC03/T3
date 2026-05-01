import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TemplateBuilder from '../../src/screens/TemplateBuilder';
import * as firestoreDb from '../../src/utils/firestoreDb';

jest.mock('../../src/utils/firestoreDb', () => ({
  fetchTemplates: jest.fn(),
  updateTemplate: jest.fn(() => Promise.resolve()),
  templateNameExists: jest.fn(() => Promise.resolve(false)),
}));

const mockTemplate = {
  id: 'template-1',
  name: 'Ordered Workout',
  tag: '',
  exercises: [
    { id: 'ex1', name: 'Exercise 1' },
    { id: 'ex2', name: 'Exercise 2' },
  ],
};

describe('reorderExercisesInTemplate Integration Tests', () => {
  it('successfully reorders exercises in a template and saves', async () => {
    firestoreDb.fetchTemplates.mockResolvedValue([mockTemplate]);

    const { getByText, getAllByText } = render(
      <TemplateBuilder 
        navigation={{ goBack: jest.fn() }} 
        route={{ params: { templateId: 'template-1' } }} 
      />
    );

    // Wait for load
    await waitFor(() => {
      expect(getByText('Exercise 1')).toBeTruthy();
      expect(getByText('Exercise 2')).toBeTruthy();
    });

    // Move Exercise 2 UP (the second down arrow is disabled, let's use the second up arrow)
    // In our UI, Exercise 1 has ▲(disabled) and ▼. Exercise 2 has ▲ and ▼(disabled).
    // Let's find the ▲ button for Exercise 2.
    const upButtons = getAllByText('▲');
    fireEvent.press(upButtons[1]); // Exercise 2's up button

    // Save
    fireEvent.press(getByText('Save'));

    // Verify updateTemplate call with new order: [ex2, ex1]
    await waitFor(() => {
      expect(firestoreDb.updateTemplate).toHaveBeenCalledWith(
        'test-uuid',
        'template-1',
        'Ordered Workout',
        '',
        ['ex2', 'ex1']
      );
    });
  });
});
