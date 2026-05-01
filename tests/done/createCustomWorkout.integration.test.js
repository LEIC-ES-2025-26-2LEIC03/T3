import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TemplateBuilder from '../../src/screens/TemplateBuilder';
import * as db from '../../src/utils/firestoreDb';
import { Alert } from 'react-native';
import { EXERCISES } from '../../src/data/exercises';

jest.mock('../../src/utils/firestoreDb', () => ({
  createTemplate: jest.fn(() => Promise.resolve()),
  updateTemplate: jest.fn(() => Promise.resolve()),
  fetchTemplates: jest.fn(() => Promise.resolve([])),
  fetchTemplateById: jest.fn(),
  templateNameExists: jest.fn(() => Promise.resolve(false)),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
}));

jest.spyOn(Alert, 'alert');

describe('createCustomWorkout Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a custom workout successfully when valid name and exercises are provided', async () => {
    const mockGoBack = jest.fn();
    const { getByText, getByPlaceholderText, queryByText } = render(
      <TemplateBuilder navigation={{ goBack: mockGoBack }} />
    );

    // 1. Enter Name
    fireEvent.changeText(getByPlaceholderText('e.g. Push Day A'), 'My Custom Workout');

    // 2. Add an exercise
    fireEvent.press(getByText('＋  Add Exercise'));

    // The ExercisePicker should open. Pick the first exercise in the EXERCISES array.
    const firstExerciseName = EXERCISES[0].name;
    
    // Wait for the picker to be visible and have the exercise
    await waitFor(() => {
      expect(getByText(firstExerciseName)).toBeTruthy();
    });

    // Press the exercise to select it
    fireEvent.press(getByText(firstExerciseName));

    // The picker should close and the exercise should be added to the list
    await waitFor(() => {
      // The exercise count should now be 1
      expect(getByText('1 selected')).toBeTruthy();
    });

    // 3. Save the template
    fireEvent.press(getByText('Save'));

    // Wait for the DB call
    await waitFor(() => {
      expect(db.createTemplate).toHaveBeenCalledWith(
        'test-uuid', // Default mocked user id
        expect.any(String), // generated ID
        'My Custom Workout',
        '', // empty tag
        [EXERCISES[0].id]
      );
    });

    // Ensure it navigates back on success
    expect(mockGoBack).toHaveBeenCalled();
  });
});
