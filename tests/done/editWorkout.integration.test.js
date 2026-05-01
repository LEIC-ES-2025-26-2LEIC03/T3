import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TemplateBuilder from '../../src/screens/TemplateBuilder';
import * as firestoreDb from '../../src/utils/firestoreDb';
import { Alert } from 'react-native';
import { EXERCISES } from '../../src/data/exercises';

jest.mock('../../src/utils/firestoreDb', () => ({
  fetchTemplates: jest.fn(),
  updateTemplate: jest.fn(() => Promise.resolve()),
  templateNameExists: jest.fn(() => Promise.resolve(false)),
}));

jest.spyOn(Alert, 'alert');

const mockGoBack = jest.fn();

const mockTemplate = {
  id: 'template-1',
  name: 'Old Workout',
  tag: 'Push',
  exercises: [EXERCISES[0]],
};

describe('editWorkout Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    firestoreDb.fetchTemplates.mockResolvedValue([mockTemplate]);
  });

  it('loads an existing template and saves updates', async () => {
    const { getByText, getByDisplayValue, queryByText } = render(
      <TemplateBuilder 
        navigation={{ goBack: mockGoBack }} 
        route={{ params: { templateId: 'template-1' } }} 
      />
    );

    // Wait for template to load
    await waitFor(() => {
      expect(getByDisplayValue('Old Workout')).toBeTruthy();
      expect(getByText(EXERCISES[0].name)).toBeTruthy();
    });

    // Edit Name
    const nameInput = getByDisplayValue('Old Workout');
    fireEvent.changeText(nameInput, 'Updated Workout');

    // Remove exercise (simulate editing exercises)
    fireEvent.press(getByText('✕'));
    
    await waitFor(() => {
      expect(queryByText(EXERCISES[0].name)).toBeNull();
    });

    // Add another exercise
    fireEvent.press(getByText('＋  Add Exercise'));
    await waitFor(() => expect(getByText(EXERCISES[1].name)).toBeTruthy());
    fireEvent.press(getByText(EXERCISES[1].name));

    // Wait for the exercise to be added
    await waitFor(() => expect(getByText(EXERCISES[1].name)).toBeTruthy());

    // Save
    fireEvent.press(getByText('Save'));

    // Verify updateTemplate was called
    await waitFor(() => {
      expect(firestoreDb.updateTemplate).toHaveBeenCalledWith(
        'test-uuid', // userId is 'test-uuid' because auth is mocked in tests/__mocks__/firebaseMock.js
        'template-1',
        'Updated Workout',
        'Push',
        [EXERCISES[1].id]
      );
    });

    expect(mockGoBack).toHaveBeenCalled();
  });
});
