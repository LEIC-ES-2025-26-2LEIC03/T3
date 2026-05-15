import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ExercisePicker from '../../src/components/ExercisePicker';
import * as db from '../../src/utils/firestoreDb';
import { EXERCISES } from '../../src/data/exercises';

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn((auth, callback) => {
    callback({ uid: 'user-001' });
    return jest.fn();
  }),
}));

jest.mock('../../src/utils/firebaseConfig', () => ({
  auth: {},
}));

jest.mock('../../src/utils/firestoreDb', () => ({
  fetchFavourites: jest.fn(),
  toggleFavourite: jest.fn(),
  fetchCustomExercises: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
}));

describe('US-XX | Favourite exercises integration tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.fetchFavourites.mockResolvedValue(new Set());
    db.fetchCustomExercises.mockResolvedValue([]);
    db.toggleFavourite.mockResolvedValue(true);
  });

  it('loads favourites and custom exercises when the picker becomes visible', async () => {
    render(<ExercisePicker visible={true} onSelect={jest.fn()} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(db.fetchFavourites).toHaveBeenCalledWith('user-001');
      expect(db.fetchCustomExercises).toHaveBeenCalledWith('user-001');
    });
  });

  it('keeps custom exercises available in the favourites-capable picker', async () => {
    db.fetchFavourites.mockResolvedValueOnce(new Set(['custom-row']));
    db.fetchCustomExercises.mockResolvedValueOnce([
      {
        id: 'custom-row',
        name: 'Cable row custom',
        category: 'Back',
        muscle: 'Back',
        isCustom: true,
      },
    ]);

    const { getByText } = render(
      <ExercisePicker visible={true} onSelect={jest.fn()} onClose={jest.fn()} />
    );

    await waitFor(() => expect(db.fetchCustomExercises).toHaveBeenCalled());
    fireEvent.press(getByText('Favourites'));
    await waitFor(() => expect(getByText('Cable row custom')).toBeTruthy());
    expect(getByText('Custom')).toBeTruthy();
  });

  it('filters to saved favourites only and lets the user select one', async () => {
    const favourite = EXERCISES[0];
    const onSelect = jest.fn();
    db.fetchFavourites.mockResolvedValueOnce(new Set([favourite.id]));

    const { getByText } = render(
      <ExercisePicker visible={true} onSelect={onSelect} onClose={jest.fn()} />
    );

    await waitFor(() => expect(getByText(favourite.name)).toBeTruthy());
    fireEvent.press(getByText('Favourites'));
    fireEvent.press(getByText(favourite.name));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: favourite.id }));
  });
});
