import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TemplateBuilder from '../../src/screens/TemplateBuilder';
import { EXERCISES } from '../../src/data/exercises';

// Mock firestoreDb
jest.mock('../../src/utils/firestoreDb', () => ({
  fetchTemplates: jest.fn(() => Promise.resolve([])),
  templateNameExists: jest.fn(() => Promise.resolve(false)),
}));

// Mock safe area
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
}));

describe('filterExercisesByMuscleGroup Integration Tests', () => {
  it('filters exercises by category in the ExercisePicker', async () => {
    const { getByText, queryByText, getAllByText, getByTestId } = render(
      <TemplateBuilder navigation={{ goBack: jest.fn() }} route={{ params: {} }} />
    );

    // Open Picker
    fireEvent.press(getByText('＋  Add Exercise'));

    // Wait for picker to appear and show all (by default)
    await waitFor(() => {
      expect(getByText('Bench Press')).toBeTruthy();
    });

    // Press the Push filter chip
    fireEvent.press(getByTestId('category-chip-Push'));

    // Verify ex1 is visible, ex2 is NOT
    await waitFor(() => {
      expect(queryByText('Bench Press')).toBeTruthy();
      expect(queryByText('Deadlift')).toBeNull();
    }, { timeout: 2000 });

    // Switch to Pull
    fireEvent.press(getByTestId('category-chip-Pull'));

    await waitFor(() => {
      expect(queryByText('Deadlift')).toBeTruthy();
      expect(queryByText('Bench Press')).toBeNull();
    }, { timeout: 2000 });
  });

  it('filters exercises by search text in the ExercisePicker', async () => {
    const { getByText, getByPlaceholderText, queryByText } = render(
      <TemplateBuilder navigation={{ goBack: jest.fn() }} route={{ params: {} }} />
    );

    // Open Picker
    fireEvent.press(getByText('＋  Add Exercise'));

    await waitFor(() => expect(getByText(EXERCISES[0].name)).toBeTruthy());

    const searchInput = getByPlaceholderText('Search exercises...');
    const targetExercise = EXERCISES[0];
    const otherExercise = EXERCISES.find(e => !e.name.toLowerCase().includes(targetExercise.name.toLowerCase()));

    if (!otherExercise) return;

    // Search for the specific name
    fireEvent.changeText(searchInput, targetExercise.name);

    await waitFor(() => {
      expect(queryByText(targetExercise.name)).toBeTruthy();
      expect(queryByText(otherExercise.name)).toBeNull();
    });
  });
});
