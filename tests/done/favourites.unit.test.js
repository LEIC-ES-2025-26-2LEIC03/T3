import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ExercisePicker from '../../src/components/ExercisePicker';
import * as db from '../../src/utils/firestoreDb';
import { EXERCISES } from '../../src/data/exercises';
 
jest.mock('../../src/utils/firestoreDb', () => ({
  fetchFavourites: jest.fn(() => Promise.resolve(new Set())),
  toggleFavourite: jest.fn(() => Promise.resolve(true)),
}));
 
jest.mock('../../src/utils/firebaseConfig', () => ({
  auth: { currentUser: { uid: 'test-user-001' } },
}));
 
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
}));
 
describe('US-XX | Mark Exercise as Favourite', () => {
  const mockOnSelect = jest.fn();
  const mockOnClose  = jest.fn();
 
  beforeEach(() => {
    jest.clearAllMocks();
  });
 
  it('loads and displays the user favourites when the picker opens', async () => {
    const firstExercise = EXERCISES[0];
    db.fetchFavourites.mockResolvedValueOnce(new Set([firstExercise.id]));
 
    const { getByText } = render(
      <ExercisePicker visible={true} onSelect={mockOnSelect} onClose={mockOnClose} />
    );
 
    await waitFor(() => {
      expect(db.fetchFavourites).toHaveBeenCalledWith('test-user-001');
    });
 
    // The exercise should be visible in the list
    expect(getByText(firstExercise.name)).toBeTruthy();
  });
 
  it('toggles an exercise as favourite when the heart button is pressed', async () => {
    const firstExercise = EXERCISES[0];
 
    const { getAllByText } = render(
      <ExercisePicker visible={true} onSelect={mockOnSelect} onClose={mockOnClose} />
    );
 
    await waitFor(() => {
      expect(db.fetchFavourites).toHaveBeenCalled();
    });
 
    // Press the heart button (♡) for the first exercise
    const hearts = getAllByText('♡');
    fireEvent.press(hearts[0]);
 
    await waitFor(() => {
      expect(db.toggleFavourite).toHaveBeenCalledWith(
        'test-user-001',
        expect.objectContaining({ id: firstExercise.id })
      );
    });
  });
 
  it('shows only favourited exercises when the Favourites chip is selected', async () => {
    const firstExercise = EXERCISES[0];
    db.fetchFavourites.mockResolvedValueOnce(new Set([firstExercise.id]));
 
    const { getByText, queryByText } = render(
      <ExercisePicker visible={true} onSelect={mockOnSelect} onClose={mockOnClose} />
    );
 
    await waitFor(() => {
      expect(db.fetchFavourites).toHaveBeenCalled();
    });
 
    // Switch to Favourites filter
    fireEvent.press(getByText('Favourites'));
 
    await waitFor(() => {
      // The favourited exercise should be visible
      expect(getByText(firstExercise.name)).toBeTruthy();
      // A non-favourited exercise should not be visible
      const nonFav = EXERCISES.find(e => e.id !== firstExercise.id);
      expect(queryByText(nonFav.name)).toBeNull();
    });
  });
 
  it('rolls back the optimistic update when toggleFavourite fails', async () => {
    db.toggleFavourite.mockRejectedValueOnce(new Error('Network error'));
 
    const { getAllByText } = render(
      <ExercisePicker visible={true} onSelect={mockOnSelect} onClose={mockOnClose} />
    );
 
    await waitFor(() => {
      expect(db.fetchFavourites).toHaveBeenCalled();
    });
 
    // Press the heart — optimistic update fires, then rolls back on failure
    const hearts = getAllByText('♡');
    fireEvent.press(hearts[0]);
 
    await waitFor(() => {
      // After rollback the heart should still be unfilled
      expect(getAllByText('♡').length).toBeGreaterThan(0);
    });
  });
 
  it('shows the empty state message when no favourites exist', async () => {
    db.fetchFavourites.mockResolvedValueOnce(new Set());
 
    const { getByText } = render(
      <ExercisePicker visible={true} onSelect={mockOnSelect} onClose={mockOnClose} />
    );
 
    await waitFor(() => {
      expect(db.fetchFavourites).toHaveBeenCalled();
    });
 
    fireEvent.press(getByText('Favourites'));
 
    await waitFor(() => {
      expect(getByText('No favourites yet')).toBeTruthy();
      expect(getByText('Tap the heart on any exercise to save it here')).toBeTruthy();
    });
  });
});