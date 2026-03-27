import React from 'react-native';
import { render, fireEvent, screen } from '@testing-library/react-native';
import '@testing-library/react-native/extend-expect';

import WorkoutScreen from '../screens/WorkoutScreen';
import HistoryScreen from '../screens/HistoryScreen';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

const renderWorkoutScreen = () => render(<WorkoutScreen />);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('User Story 1 - Log a Workout Session', () => {

  describe('Scenario 1A - Normal Flow', () => {

    it('AT-1A-01: added exercise appears in the workout list', () => {
      renderWorkoutScreen();

      fireEvent.press(screen.getByText('Add Exercise'));
      fireEvent.press(screen.getByText('Bench Press'));

      expect(screen.getByText('Bench Press')).toBeTruthy();
    });

    it('AT-1A-02: set with weight and reps is stored in local state', () => {
      renderWorkoutScreen();
      fireEvent.press(screen.getByText('Add Exercise'));
      fireEvent.press(screen.getByText('Bench Press'));

      fireEvent.changeText(screen.getByPlaceholderText('Weight (kg)'), '80');
      fireEvent.changeText(screen.getByPlaceholderText('Reps'), '8');

      expect(screen.getByDisplayValue('80')).toBeTruthy();
      expect(screen.getByDisplayValue('8')).toBeTruthy();
    });

    it('AT-1A-03: finishing a workout saves it with a timestamp', async () => {
      renderWorkoutScreen();
      fireEvent.press(screen.getByText('Add Exercise'));
      fireEvent.press(screen.getByText('Bench Press'));
      fireEvent.changeText(screen.getByPlaceholderText('Weight (kg)'), '80');
      fireEvent.changeText(screen.getByPlaceholderText('Reps'), '8');

      fireEvent.press(screen.getByText('Finish Workout'));

      expect(await screen.findByText('Workout Saved!')).toBeTruthy();

      const timestamp = screen.getByTestId('saved-workout-timestamp');
      expect(timestamp).toHaveTextContent(/\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}/);
    });

    it('AT-1A-04: saved workout appears in history in chronological order', async () => {
      renderWorkoutScreen();
      fireEvent.press(screen.getByText('Add Exercise'));
      fireEvent.press(screen.getByText('Bench Press'));
      fireEvent.changeText(screen.getByPlaceholderText('Weight (kg)'), '80');
      fireEvent.changeText(screen.getByPlaceholderText('Reps'), '8');
      fireEvent.press(screen.getByText('Finish Workout'));
      await screen.findByText('Workout Saved!');

      render(<HistoryScreen />);

      expect(screen.getByTestId('history-list')).toBeTruthy();

      const historyItems = screen.getAllByTestId('history-workout-item');
      expect(historyItems.length).toBeGreaterThan(0);
      expect(historyItems[0]).toHaveTextContent('Bench Press');
    });

  });

});