import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import ExerciseHistoryScreen from '../../src/screens/ExerciseHistoryScreen';
import { fetchExerciseHistory } from '../../src/utils/firestoreDb';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback) => {
    const React = require('react');
    React.useEffect(() => callback(), [callback]);
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../src/utils/firebaseConfig', () => ({
  auth: { currentUser: { uid: 'user-001' } },
}));

jest.mock('../../src/utils/firestoreDb', () => ({
  fetchExerciseHistory: jest.fn(),
}));

describe('US-02 | Exercise progress/history integration tests', () => {
  const navigation = { goBack: jest.fn() };
  const route = {
    params: {
      exercise: { id: 'bench_press', name: 'Bench press', muscle: 'Chest' },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the selected exercise history and renders personal records', async () => {
    fetchExerciseHistory.mockResolvedValueOnce([
      {
        workoutId: 'w2',
        workoutName: 'Upper Day',
        date: '2026-05-02T10:00:00.000Z',
        sets: [
          { weight: 100, reps: 5, rpe: 8 },
          { weight: 90, reps: 8, rpe: 7 },
        ],
      },
      {
        workoutId: 'w1',
        workoutName: 'Push Day',
        date: '2026-04-28T10:00:00.000Z',
        sets: [{ weight: 80, reps: 10, rpe: 8 }],
      },
    ]);

    const { getByText } = render(
      <ExerciseHistoryScreen navigation={navigation} route={route} />
    );

    await waitFor(() => {
      expect(fetchExerciseHistory).toHaveBeenCalledWith('user-001', 'bench_press');
    });

    expect(getByText('Bench press')).toBeTruthy();
    expect(getByText('Upper Day')).toBeTruthy();
    expect(getByText('Push Day')).toBeTruthy();
    expect(getByText('100')).toBeTruthy();
    expect(getByText('Est. 1RM')).toBeTruthy();
    expect(getByText(/80 kg/)).toBeTruthy();
  });

  it('shows an empty progress state when no completed workouts include the exercise', async () => {
    fetchExerciseHistory.mockResolvedValueOnce([]);

    const { getByText } = render(
      <ExerciseHistoryScreen navigation={navigation} route={route} />
    );

    await waitFor(() => {
      expect(getByText('No history yet')).toBeTruthy();
    });
    expect(getByText(/Complete a workout with this exercise/i)).toBeTruthy();
  });

  it('navigates back from the progress screen header', async () => {
    fetchExerciseHistory.mockResolvedValueOnce([]);

    const { getByText } = render(
      <ExerciseHistoryScreen navigation={navigation} route={route} />
    );

    fireEvent.press(getByText('Back'));

    expect(navigation.goBack).toHaveBeenCalled();
  });
});
