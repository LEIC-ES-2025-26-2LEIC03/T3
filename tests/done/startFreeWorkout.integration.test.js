import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import WorkoutLogger from '../../src/screens/WorkoutLogger';
import * as firestoreDb from '../../src/utils/firestoreDb';
import { EXERCISES } from '../../src/data/exercises';

jest.mock('../../src/utils/firestoreDb', () => ({
  saveWorkout: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
}));

describe('startFreeWorkout Integration Tests', () => {
  it('successfully starts and saves a free workout', async () => {
    const mockNavigate = jest.fn();
    const { getByText, getAllByPlaceholderText } = render(
      <WorkoutLogger navigation={{ navigate: mockNavigate }} route={{ params: {} }} />
    );

    // Should show "No exercises yet"
    expect(getByText(/No exercises yet/)).toBeTruthy();

    // Add an exercise
    fireEvent.press(getByText('＋  Add Exercise'));
    await waitFor(() => expect(getByText(EXERCISES[0].name)).toBeTruthy());
    fireEvent.press(getByText(EXERCISES[0].name));

    // Wait for exercise to be added
    await waitFor(() => {
      expect(getByText(/1 exercise/)).toBeTruthy();
    });

    // Enter some data (weight/reps)
    const inputs = getAllByPlaceholderText('0');
    fireEvent.changeText(inputs[0], '50'); // weight
    fireEvent.changeText(inputs[1], '10'); // reps

    // Finish
    fireEvent.press(getByText('Finish'));

    // Verify saveWorkout call
    await waitFor(() => {
      expect(firestoreDb.saveWorkout).toHaveBeenCalledWith(
        'test-uuid',
        expect.objectContaining({
          name: 'My Workout',
          exercises: expect.arrayContaining([
            expect.objectContaining({
              name: EXERCISES[0].name,
              sets: expect.arrayContaining([
                expect.objectContaining({ weight: 50, reps: 10 })
              ])
            })
          ])
        })
      );
    });

    // Skip the rating modal for the added exercise
    await waitFor(() => {
      expect(getByText('Skip')).toBeTruthy();
    });
    fireEvent.press(getByText('Skip'));

    expect(mockNavigate).toHaveBeenCalledWith('HistoryTab');
  });
});
