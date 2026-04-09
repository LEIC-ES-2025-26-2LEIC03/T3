import React from 'react-native';
import { render, fireEvent, screen } from '@testing-library/react-native';
import '@testing-library/react-native/extend-expect';

import ProgressScreen from '../screens/ProgressScreen';

const mockWorkoutHistory = [
  {
    id: '1',
    date: '2024-01-15',
    exercise: 'Bench Press',
    sets: [
      { weight: 85, reps: 8 },
      { weight: 85, reps: 7 },
    ],
  },
  {
    id: '2',
    date: '2024-02-10',
    exercise: 'Bench Press',
    sets: [
      { weight: 90, reps: 6 },
      { weight: 90, reps: 5 },
    ],
  },
  {
    id: '3',
    date: '2024-03-05',
    exercise: 'Bench Press',
    sets: [
      { weight: 95, reps: 6 },
      { weight: 90, reps: 8 },
    ],
  },
];

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() =>
    Promise.resolve(JSON.stringify(mockWorkoutHistory))
  ),
  removeItem: jest.fn(() => Promise.resolve()),
}));

const renderProgressScreen = (exercise = 'Bench Press') =>
  render(<ProgressScreen exercise={exercise} />);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('User Story 2 — View Progress Over Time', () => {

  describe('Scenario 2A — Normal Flow', () => {

    it('AT-2A-01: all sessions for the selected exercise are displayed', async () => {
      renderProgressScreen();

      const sessionItems = await screen.findAllByTestId('session-item');
      expect(sessionItems.length).toBe(mockWorkoutHistory.length);
    });

    it('AT-2A-02: each session shows its date and sets', async () => {
      renderProgressScreen();

      expect(await screen.findByText('Jan 15, 2024')).toBeTruthy();
      expect(screen.getByText('85 kg × 8')).toBeTruthy();
      expect(screen.getByText('85 kg × 7')).toBeTruthy();

      expect(screen.getByText('Feb 10, 2024')).toBeTruthy();
      expect(screen.getByText('90 kg × 6')).toBeTruthy();

      expect(screen.getByText('Mar 5, 2024')).toBeTruthy();
      expect(screen.getByText('95 kg × 6')).toBeTruthy();
    });

    it('AT-2A-03: sessions are displayed in reverse chronological order', async () => {
      renderProgressScreen();

      const sessionItems = await screen.findAllByTestId('session-item');

      const firstDate = sessionItems[0].props.accessibilityLabel ?? sessionItems[0].children?.[0];
      const lastDate = sessionItems[sessionItems.length - 1].props.accessibilityLabel ?? sessionItems[sessionItems.length - 1].children?.[0];

      const dates = await screen.findAllByTestId('session-date');
      const dateStrings = dates.map(d => d.props.children);

      expect(new Date(dateStrings[0]).getTime()).toBeGreaterThan(
        new Date(dateStrings[dateStrings.length - 1]).getTime()
      );
    });

    it('AT-2A-04: a progress chart is rendered when data exists', async () => {
      renderProgressScreen();

      expect(await screen.findByTestId('progress-chart')).toBeTruthy();
    });

    it('AT-2A-05: personal records section shows best weight, volume, and estimated 1RM', async () => {
      renderProgressScreen();

      expect(await screen.findByTestId('pr-best-weight')).toHaveTextContent('95');
      expect(screen.getByTestId('pr-best-volume')).toBeTruthy();
      expect(screen.getByTestId('pr-best-1rm')).toBeTruthy();
    });

    it('AT-2A-06: filter buttons are rendered and tapping one updates the chart', async () => {
      renderProgressScreen();

      const filterButtons = await screen.findAllByTestId('filter-button');
      expect(filterButtons.length).toBeGreaterThan(0);

      fireEvent.press(screen.getByText('1M'));

      expect(await screen.findByTestId('progress-chart')).toBeTruthy();
    });

  });

  describe('Scenario 2B — Exceptional Flow', () => {

    beforeEach(() => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([]));
    });

    it('AT-2B-01: no chart is rendered when the exercise has no history', async () => {
      renderProgressScreen();

      await screen.findByTestId('empty-state');

      expect(screen.queryByTestId('progress-chart')).toBeNull();
    });

    it('AT-2B-02: an empty-state message is displayed when there is no history', async () => {
      renderProgressScreen();

      expect(
        await screen.findByText(
          'No data available yet. Start logging workouts to see progress.'
        )
      ).toBeTruthy();
    });

  });

});