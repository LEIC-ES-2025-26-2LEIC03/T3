import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import ExerciseScreen from '../../src/screens/ExerciseScreen';
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

describe('US-02 | Exercise Graphics and About Tabs Acceptance Tests', () => {
  const navigation = { goBack: jest.fn() };
  const route = {
    params: {
      exercise: { id: 'bench_press', name: 'Bench press', muscle: 'Chest' },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows a user to view exercise instructions in the About tab and charts in the Graphics tab', async () => {
    // Simulate user having 2 past workouts with Bench Press
    fetchExerciseHistory.mockResolvedValueOnce([
      { date: '2026-05-02T10:00:00.000Z', sets: [{ weight: 100, reps: 5 }] },
      { date: '2026-04-28T10:00:00.000Z', sets: [{ weight: 90, reps: 5 }] },
    ]);

    // 1. User navigates to the ExerciseScreen
    const { getByText } = render(
      <ExerciseScreen navigation={navigation} route={route} />
    );

    // Default tab is History, so we wait for it to load
    await waitFor(() => {
      expect(fetchExerciseHistory).toHaveBeenCalledWith('user-001', 'bench_press');
      expect(getByText('History')).toBeTruthy();
    });

    // 2. User taps on the "About" tab to see how to perform the exercise
    fireEvent.press(getByText('About'));

    await waitFor(() => {
      // Expect instructions to be visible
      expect(getByText('Instructions')).toBeTruthy();
      expect(getByText('Lie back on a flat bench.')).toBeTruthy();
      expect(getByText('Tips')).toBeTruthy();
      expect(getByText('Keep your feet flat.')).toBeTruthy();
    });

    // 3. User taps on the "Graphics" tab to see their progress charts
    fireEvent.press(getByText('Graphics'));

    await waitFor(() => {
      // Expect the charts to be rendered
      expect(getByText('Best Series (Est. 1RM)')).toBeTruthy();
      expect(getByText('Best Series (Max Weight)')).toBeTruthy();
      expect(getByText('Total Volume')).toBeTruthy();
      expect(getByText('Best Series (Repetitions)')).toBeTruthy();
      
      // Expect the max weight of 100kg to be displayed in the Y-axis overlay
      expect(getByText('100 kg')).toBeTruthy();
    });
  });
});
