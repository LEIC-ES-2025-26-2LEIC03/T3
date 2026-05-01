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
  name: 'Old Workout',
  tag: '',
  exercises: [
    { id: 'ex1', name: 'Bench Press' },
    { id: 'ex2', name: 'Squat' },
  ],
};

describe('removeExerciseFromWorkout Integration Tests', () => {
  it('successfully removes an exercise from a template and saves', async () => {
    firestoreDb.fetchTemplates.mockResolvedValue([mockTemplate]);

    const { getByText, queryByText, getAllByText } = render(
      <TemplateBuilder 
        navigation={{ goBack: jest.fn() }} 
        route={{ params: { templateId: 'template-1' } }} 
      />
    );

    // Wait for load
    await waitFor(() => {
      expect(getByText('Bench Press')).toBeTruthy();
      expect(getByText('Squat')).toBeTruthy();
    });

    // Remove Bench Press (first '✕')
    const removeButtons = getAllByText('✕');
    fireEvent.press(removeButtons[0]);

    // Verify UI update
    await waitFor(() => {
      expect(queryByText('Bench Press')).toBeNull();
      expect(getByText('Squat')).toBeTruthy();
    });

    // Save
    fireEvent.press(getByText('Save'));

    // Verify updateTemplate call
    await waitFor(() => {
      expect(firestoreDb.updateTemplate).toHaveBeenCalledWith(
        'test-uuid',
        'template-1',
        'Old Workout',
        '',
        ['ex2']
      );
    });
  });
});
