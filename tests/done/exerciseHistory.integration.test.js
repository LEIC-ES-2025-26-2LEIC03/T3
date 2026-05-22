import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import ExerciseHistoryScreen from '../../src/screens/ExerciseScreen';
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

jest.mock('../../src/data/instructions', () => ({
  EXERCISE_INSTRUCTIONS: {
    bench_press: {
      steps: ['Lie back on a flat bench.', 'Grip the barbell.'],
      tips: ['Keep your feet flat.']
    }
  }
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

  it('renders instructions in the About tab', async () => {
    fetchExerciseHistory.mockResolvedValueOnce([]);

    const { getByText } = render(
      <ExerciseHistoryScreen navigation={navigation} route={route} />
    );

    // Switch to About tab
    fireEvent.press(getByText('About'));

    await waitFor(() => {
      expect(getByText('Instructions')).toBeTruthy();
      expect(getByText('Lie back on a flat bench.')).toBeTruthy();
      expect(getByText('Grip the barbell.')).toBeTruthy();
      expect(getByText('Tips')).toBeTruthy();
      expect(getByText('Keep your feet flat.')).toBeTruthy();
    });
  });

  it('shows not enough data empty state in Graphics tab when history < 2', async () => {
    fetchExerciseHistory.mockResolvedValueOnce([
      { date: '2026-05-02T10:00:00.000Z', sets: [] } // Only 1 workout
    ]);

    const { getByText, queryByText } = render(
      <ExerciseHistoryScreen navigation={navigation} route={route} />
    );

    // Wait for history to load
    await waitFor(() => {
      expect(fetchExerciseHistory).toHaveBeenCalled();
    });

    fireEvent.press(getByText('Graphics'));

    expect(getByText('Not enough data')).toBeTruthy();
    expect(queryByText('Best Series (Est. 1RM)')).toBeNull();
  });

  it('renders charts in the Graphics tab when history >= 2', async () => {
    fetchExerciseHistory.mockResolvedValueOnce([
      { date: '2026-05-02T10:00:00.000Z', sets: [{ weight: 100, reps: 5 }] },
      { date: '2026-04-28T10:00:00.000Z', sets: [{ weight: 90, reps: 5 }] },
    ]);

    const { getByText } = render(
      <ExerciseHistoryScreen navigation={navigation} route={route} />
    );

    await waitFor(() => {
      expect(fetchExerciseHistory).toHaveBeenCalled();
    });

    fireEvent.press(getByText('Graphics'));

    // Should render chart titles
    expect(getByText('Best Series (Est. 1RM)')).toBeTruthy();
    expect(getByText('Best Series (Max Weight)')).toBeTruthy();
    expect(getByText('Total Volume')).toBeTruthy();
    expect(getByText('Best Series (Repetitions)')).toBeTruthy();
    
    // Y-axis labels should be rendered
    expect(getByText('100 kg')).toBeTruthy(); // max weight from data
  });
});
