import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import WorkoutLogger from '../../src/screens/WorkoutLogger';
import * as firestoreDb from '../../src/utils/firestoreDb';
import { EXERCISES } from '../../src/data/exercises';
import { Alert } from 'react-native';

jest.mock('../../src/utils/firestoreDb', () => ({
  saveWorkout: jest.fn(() => Promise.resolve()),
}));

jest.spyOn(Alert, 'alert');

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    replace: mockReplace,
  }),
}));

describe('logWorkout Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saves a workout when an exercise with a set is completed', async () => {
    const { getByText, getAllByPlaceholderText, queryByText } = render(
      <WorkoutLogger navigation={{ navigate: mockNavigate, replace: mockReplace }} />
    );

    // 1. Add an exercise
    fireEvent.press(getByText('＋  Add Exercise'));
    
    // Pick the first exercise
    const firstExerciseName = EXERCISES[0].name;
    await waitFor(() => expect(getByText(firstExerciseName)).toBeTruthy());
    fireEvent.press(getByText(firstExerciseName));

    // Wait for the exercise to be added to the list
    await waitFor(() => {
      // Find the inputs for the added exercise
      const inputs = getAllByPlaceholderText('0');
      expect(inputs.length).toBeGreaterThanOrEqual(2);
    });

    // 2. Fill in the set (weight and reps)
    const inputs = getAllByPlaceholderText('0');
    fireEvent.changeText(inputs[0], '100'); // Weight
    fireEvent.changeText(inputs[1], '10'); // Reps

    // 3. Finish the workout
    fireEvent.press(getByText('Finish'));

    // 4. Verify saveWorkout was called with correct payload
    await waitFor(() => {
      expect(firestoreDb.saveWorkout).toHaveBeenCalled();
    });

    const callArgs = firestoreDb.saveWorkout.mock.calls[0];
    expect(callArgs[0]).toBe('test-uuid');
    expect(callArgs[1].exercises.length).toBe(1);
    expect(callArgs[1].exercises[0].exerciseId).toBe(EXERCISES[0].id);
    expect(Number(callArgs[1].exercises[0].sets[0].weight)).toBe(100);
    expect(Number(callArgs[1].exercises[0].sets[0].reps)).toBe(10);
  });
});
