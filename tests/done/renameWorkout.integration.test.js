import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TemplateBuilder from '../../src/screens/TemplateBuilder';
import * as firestoreDb from '../../src/utils/firestoreDb';

jest.mock('../../src/utils/firestoreDb', () => ({
  fetchTemplates: jest.fn(),
  updateTemplate: jest.fn(() => Promise.resolve()),
  templateNameExists: jest.fn(() => Promise.resolve(false)),
}));

const mockGoBack = jest.fn();

const mockTemplate = {
  id: 'template-1',
  name: 'Old Workout',
  tag: '',
  exercises: [{ id: 'ex1', name: 'Bench Press' }],
};

describe('renameWorkout Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    firestoreDb.fetchTemplates.mockResolvedValue([mockTemplate]);
  });

  it('updates the name of an existing template', async () => {
    const { getByText, getByDisplayValue } = render(
      <TemplateBuilder 
        navigation={{ goBack: mockGoBack }} 
        route={{ params: { templateId: 'template-1' } }} 
      />
    );

    await waitFor(() => {
      expect(getByDisplayValue('Old Workout')).toBeTruthy();
    });

    const nameInput = getByDisplayValue('Old Workout');
    fireEvent.changeText(nameInput, 'New Awesome Name');

    fireEvent.press(getByText('Save'));

    await waitFor(() => {
      expect(firestoreDb.updateTemplate).toHaveBeenCalledWith(
        'test-uuid',
        'template-1',
        'New Awesome Name',
        '',
        ['ex1']
      );
    });
  });
});
