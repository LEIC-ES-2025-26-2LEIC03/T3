import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LibraryScreen from '../../src/screens/LibraryScreen';
import * as firestoreDb from '../../src/utils/firestoreDb';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback) => {
    const React = require('react');
    React.useEffect(() => callback(), [callback]);
  },
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../src/utils/firebaseConfig', () => ({
  auth: { currentUser: { uid: 'user-001' } },
}));

jest.mock('../../src/utils/id', () => ({
  generateId: jest.fn(() => 'custom-exercise-001'),
}));

jest.mock('../../src/utils/firestoreDb', () => ({
  fetchCustomExercises: jest.fn(),
  createCustomExercise: jest.fn(),
  deleteCustomExercise: jest.fn(),
}));

describe('US-04 | Exercise Library acceptance tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    firestoreDb.fetchCustomExercises.mockResolvedValue([]);
    firestoreDb.createCustomExercise.mockResolvedValue();
  });

  it('lets the user search the exercise library and narrow results by muscle', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(<LibraryScreen />);

    await waitFor(() => expect(getByText('Bench press')).toBeTruthy());
    fireEvent.changeText(getByPlaceholderText('Search exercises...'), 'deadlift');

    expect(getByText('Deadlift')).toBeTruthy();
    expect(queryByText('Bench press')).toBeNull();
  });

  it('lets the user create a custom exercise for future workouts', async () => {
    const { getByText, getByPlaceholderText, getAllByText } = render(<LibraryScreen />);

    await waitFor(() => expect(getByText('Library')).toBeTruthy());
    fireEvent.press(getByText(/New/));
    fireEvent.changeText(getByPlaceholderText('e.g. Cable lateral raise'), 'Cable crunch custom');
    fireEvent.press(getAllByText('Core').at(-1));
    fireEvent.press(getByText('Save'));

    await waitFor(() => {
      expect(firestoreDb.createCustomExercise).toHaveBeenCalledWith(
        'user-001',
        'custom-exercise-001',
        'Cable crunch custom',
        'Core'
      );
      expect(getByText('Cable crunch custom')).toBeTruthy();
    });
  });
});

