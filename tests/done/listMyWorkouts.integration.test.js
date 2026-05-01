import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import HomeScreen from '../../src/screens/HomeScreen';
import * as firestoreDb from '../../src/utils/firestoreDb';

// Mock firestoreDb
jest.mock('../../src/utils/firestoreDb', () => ({
  fetchTemplates: jest.fn(),
  deleteTemplate: jest.fn(),
  buildExercisesFromTemplate: jest.fn(ex => ex),
}));

// Mock safe area
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  addListener: jest.fn((event, callback) => {
    if (event === 'focus') callback();
    return () => {};
  }),
};

// Mock focus hook
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => {
    require('react').useEffect(() => {
      cb();
    }, [cb]);
  },
}));

const mockTemplates = [
  { id: 't1', name: 'Morning Routine', tag: 'Full Body', exercises: [] },
  { id: 't2', name: 'Evening Blast', tag: 'Push', exercises: [] },
];

describe('listMyWorkouts Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a list of user templates on the HomeScreen', async () => {
    firestoreDb.fetchTemplates.mockResolvedValue(mockTemplates);

    const { getByText } = render(<HomeScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText('Morning Routine')).toBeTruthy();
      expect(getByText('Evening Blast')).toBeTruthy();
    });

    expect(firestoreDb.fetchTemplates).toHaveBeenCalled();
  });

  it('shows an empty state message when no templates exist', async () => {
    firestoreDb.fetchTemplates.mockResolvedValue([]);

    const { getByText } = render(<HomeScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText(/No templates yet/)).toBeTruthy();
    });
  });
});
