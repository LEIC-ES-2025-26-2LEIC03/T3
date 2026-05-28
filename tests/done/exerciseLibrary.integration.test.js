import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LibraryScreen from '../../src/screens/LibraryScreen';
import * as firestoreDb from '../../src/utils/firestoreDb';
import { generateId } from '../../src/utils/id';

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
  fetchFavourites: jest.fn(() => Promise.resolve(new Set())),
  toggleFavourite: jest.fn(),
}));

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('US-04 | Exercise Library integration tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    firestoreDb.fetchCustomExercises.mockResolvedValue([]);
    firestoreDb.createCustomExercise.mockResolvedValue();
    firestoreDb.deleteCustomExercise.mockResolvedValue();
  });

  it('loads custom exercises and merges them with the built-in library', async () => {
    firestoreDb.fetchCustomExercises.mockResolvedValueOnce([
      {
        id: 'custom-1',
        name: 'Cable lateral raise',
        category: 'Shoulders',
        muscle: 'Shoulders',
        isCustom: true,
      },
    ]);

    const { getByText, getAllByText, getByPlaceholderText } = render(<LibraryScreen />);

    await waitFor(() => {
      expect(firestoreDb.fetchCustomExercises).toHaveBeenCalledWith('user-001');
    });
    fireEvent.changeText(getByPlaceholderText('Search exercises...'), 'Cable lateral');
    expect(getAllByText('Cable lateral raise').length).toBeGreaterThanOrEqual(1);
    expect(getByText('Custom')).toBeTruthy();
  });

  it('filters the visible library by search text and muscle group', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(<LibraryScreen />);

    await waitFor(() => expect(getByText('Bench press')).toBeTruthy());

    fireEvent.changeText(getByPlaceholderText('Search exercises...'), 'bench');
    expect(getByText('Bench press')).toBeTruthy();
    expect(queryByText('Deadlift')).toBeNull();

    fireEvent.changeText(getByPlaceholderText('Search exercises...'), '');
    fireEvent.press(getByText('Back'));

    await waitFor(() => {
      expect(getByText('Deadlift')).toBeTruthy();
      expect(queryByText('Bench press')).toBeNull();
    });
  });

  it('creates a custom exercise with selected muscle groups', async () => {
    const { getByText, getByPlaceholderText, getAllByText } = render(<LibraryScreen />);

    await waitFor(() => expect(getByText('Library')).toBeTruthy());
    fireEvent.press(getByText(/New/));
    fireEvent.changeText(getByPlaceholderText('e.g. Cable lateral raise'), 'My Row');
    fireEvent.press(getAllByText('Back').at(-1));
    fireEvent.press(getByText('Save'));

    await waitFor(() => {
      expect(generateId).toHaveBeenCalled();
      expect(firestoreDb.createCustomExercise).toHaveBeenCalledWith(
        'user-001',
        'custom-exercise-001',
        'My Row',
        'Back',
        [],
        []
      );
      expect(getByText('My Row')).toBeTruthy();
    });
  });

  it('blocks duplicate custom exercise names case-insensitively', async () => {
    const { getByText, getByPlaceholderText, getAllByText } = render(<LibraryScreen />);

    await waitFor(() => expect(getByText('Bench press')).toBeTruthy());
    fireEvent.press(getByText(/New/));
    fireEvent.changeText(getByPlaceholderText('e.g. Cable lateral raise'), 'bench PRESS');
    fireEvent.press(getAllByText('Chest').at(-1));
    fireEvent.press(getByText('Save'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Already exists',
      expect.stringMatching(/already exists/i)
    );
    expect(firestoreDb.createCustomExercise).not.toHaveBeenCalled();
  });
});
