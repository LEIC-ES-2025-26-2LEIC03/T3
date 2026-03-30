import React from 'react-native';
import { render, fireEvent, screen } from '@testing-library/react-native';
import '@testing-library/react-native/extend-expect';

import WorkoutScreen from '../screens/WorkoutScreen';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

const renderWorkoutScreen = () => render(<WorkoutScreen />);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('User Story 1 - Log Workout', () => {

  it('AT-1A-01: user can add Bench Press exercise to workout list', () => {
    renderWorkoutScreen();

    fireEvent.press(screen.getByText('Add Exercise'));
    fireEvent.press(screen.getByText('Bench Press'));

    expect(screen.getByText('Bench Press')).toBeTruthy();
  });

});