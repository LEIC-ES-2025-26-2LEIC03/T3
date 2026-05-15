import React from 'react-native';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import '@testing-library/react-native/extend-expect';

import WorkoutLogger from '../../src/screens/WorkoutLogger';

// Mock saveWorkout globally
global.saveWorkout = jest.fn(() => Promise.resolve());

jest.mock('react-native-get-random-values', () => {});
jest.mock('uuid', () => ({ v4: () => '123456789' }));

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => ({
    execAsync: jest.fn(),
    runAsync: jest.fn(),
    getFirstAsync: jest.fn(),
    getAllAsync: jest.fn(),
  })),
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockReplace = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    replace: mockReplace,
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

const renderWorkoutLogger = () => render(<WorkoutLogger navigation={{ navigate: mockNavigate, replace: mockReplace }} />);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('User Story 1 - Log a Workout Session', () => {

  describe('Scenario 1A - Normal Flow', () => {

    it('AT-1A-01: added exercise appears in the workout list', () => {
      renderWorkoutLogger();

      fireEvent.press(screen.getByText('＋  Add Exercise'));
      fireEvent.press(screen.getByText('Bench press'));

      expect(screen.getByText('Bench press')).toBeTruthy();
    });

    it('AT-1A-02: set with weight and reps is stored in local state', () => {
      renderWorkoutLogger();
      fireEvent.press(screen.getByText('＋  Add Exercise'));
      fireEvent.press(screen.getByText('Bench press'));

      const inputs = screen.getAllByPlaceholderText('0');
      fireEvent.changeText(inputs[0], '80'); // weight
      fireEvent.changeText(inputs[1], '8'); // reps

      expect(screen.getByDisplayValue('80')).toBeTruthy();
      expect(screen.getByDisplayValue('8')).toBeTruthy();
    });


  });

  describe('Scenario 1B — Exceptional Flow', () => {

    it('AT-1B-01: finishing workout with no exercises does not save it', async () => {
        renderWorkoutLogger();

        fireEvent.press(screen.getByText('Finish'));

        // Since saveWorkout is not called (no exercises), navigation should not happen
        expect(mockReplace).not.toHaveBeenCalled();
    });

    it('AT-1B-02: an error message is displayed when finishing with no exercises', async () => {
        renderWorkoutLogger();

        fireEvent.press(screen.getByText('Finish'));

        expect(
        await screen.findByText('Please add at least one exercise before finishing.')
        ).toBeTruthy();
    });

    it('AT-1B-03: user remains on the workout screen after the validation error', async () => {
        renderWorkoutLogger();

        fireEvent.press(screen.getByText('Finish'));

        await screen.findByText('Please add at least one exercise before finishing.');

        expect(screen.getByText('Finish')).toBeTruthy();
        expect(screen.getByText('＋  Add Exercise')).toBeTruthy();
    });

  });

});
