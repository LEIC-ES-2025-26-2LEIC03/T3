import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
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

describe('US-02 | View Progress Over Time acceptance tests', () => {
  const props = {
    navigation: { goBack: jest.fn() },
    route: { params: { exercise: { id: 'bench_press', name: 'Bench press', muscle: 'Chest' } } },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows personal records and session history for a selected exercise', async () => {
    fetchExerciseHistory.mockResolvedValueOnce([
      {
        workoutId: 'w1',
        workoutName: 'Push Day',
        date: '2026-05-01T10:00:00.000Z',
        sets: [{ weight: 90, reps: 8, rpe: 8 }],
      },
    ]);

    const { getByText } = render(<ExerciseHistoryScreen {...props} />);

    await waitFor(() => expect(getByText('Personal Records')).toBeTruthy());
    expect(getByText('Best Weight')).toBeTruthy();
    expect(getByText('Est. 1RM')).toBeTruthy();
    expect(getByText('Push Day')).toBeTruthy();
  });

  it('shows a clear empty state when the selected exercise has no history yet', async () => {
    fetchExerciseHistory.mockResolvedValueOnce([]);

    const { getByText } = render(<ExerciseHistoryScreen {...props} />);

    await waitFor(() => {
      expect(getByText('No history yet')).toBeTruthy();
      expect(getByText(/your history will appear here/i)).toBeTruthy();
    });
  });
});

