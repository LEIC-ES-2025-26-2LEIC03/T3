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

describe('US-XX | Favourite Exercises acceptance tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.fetchFavourites.mockResolvedValue(new Set());
    db.fetchCustomExercises.mockResolvedValue([]);
    db.toggleFavourite.mockResolvedValue(true);
  });

  it('lets the user mark an exercise as favourite and then view it in the favourites filter', async () => {
    const exercise = EXERCISES[0];
    const { getByText, getAllByText } = render(
      <ExercisePicker visible={true} onSelect={jest.fn()} onClose={jest.fn()} />
    );

    await waitFor(() => expect(getByText(exercise.name)).toBeTruthy());
    fireEvent.press(getAllByText('♡')[0]);

    await waitFor(() => {
      expect(db.toggleFavourite).toHaveBeenCalledWith(
        'user-001',
        expect.objectContaining({ id: exercise.id })
      );
    });

    fireEvent.press(getByText('Favourites'));
    expect(getByText(exercise.name)).toBeTruthy();
  });

  it('shows a helpful empty state when the user has no favourites', async () => {
    const { getByText } = render(
      <ExercisePicker visible={true} onSelect={jest.fn()} onClose={jest.fn()} />
    );

    await waitFor(() => expect(db.fetchFavourites).toHaveBeenCalled());
    fireEvent.press(getByText('Favourites'));

    await waitFor(() => {
      expect(getByText('No favourites yet')).toBeTruthy();
      expect(getByText('Tap the heart on any exercise to save it here')).toBeTruthy();
    });
  });
});

