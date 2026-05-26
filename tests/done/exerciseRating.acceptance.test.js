import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ExerciseRatingModal from '../../src/components/ExerciseRatingModal';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
}));

const renderModal = (overrides = {}) => {
  const props = {
    visible: true,
    exerciseName: 'Bench press',
    onSubmit: jest.fn(() => Promise.resolve()),
    onSkip: jest.fn(),
    ...overrides,
  };
  return { ...render(<ExerciseRatingModal {...props} />), props };
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('US-XX | Rate an exercise after a workout', () => {

  describe('Scenario 1 — Normal flow', () => {

    it('AT-01: rating modal appears with the exercise name after finishing a workout', () => {
      const { getByText } = renderModal({ exerciseName: 'Squat' });
      expect(getByText('Rate this exercise')).toBeTruthy();
      expect(getByText('Squat')).toBeTruthy();
    });

    it('AT-02: selecting a star highlights it and calls onSubmit with the correct rating', async () => {
      const onSubmit = jest.fn(() => Promise.resolve());
      const { getByLabelText, getByTestId } = renderModal({ onSubmit });

      fireEvent.press(getByLabelText('Rate 4 stars'));
      fireEvent.press(getByTestId('submit-button'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(4, '');
      });
    });

    it('AT-03: submitting with an optional comment passes the comment to onSubmit', async () => {
      const onSubmit = jest.fn(() => Promise.resolve());
      const { getByLabelText, getByTestId, getByPlaceholderText } = renderModal({ onSubmit });

      fireEvent.press(getByLabelText('Rate 5 stars'));
      fireEvent.changeText(getByPlaceholderText('Add a comment (optional)'), 'Felt great');
      fireEvent.press(getByTestId('submit-button'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(5, 'Felt great');
      });
    });

    it('AT-04: tapping Skip calls onSkip without calling onSubmit', () => {
      const onSubmit = jest.fn();
      const onSkip = jest.fn();
      const { getByText } = renderModal({ onSubmit, onSkip });

      fireEvent.press(getByText('Skip'));

      expect(onSkip).toHaveBeenCalledTimes(1);
      expect(onSubmit).not.toHaveBeenCalled();
    });

  });

  describe('Scenario 2 — Validation', () => {

    it('AT-05: submitting without selecting a star shows a validation error', async () => {
      const { getByTestId } = renderModal();

      fireEvent.press(getByTestId('submit-button'));

      await waitFor(() => {
        expect(getByTestId('validation-error')).toBeTruthy();
      });
    });

    it('AT-06: onSubmit is not called when no star is selected', () => {
      const onSubmit = jest.fn();
      const { getByTestId } = renderModal({ onSubmit });

      fireEvent.press(getByTestId('submit-button'));

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('AT-07: validation error clears after the user selects a star', async () => {
      const { getByTestId, getByLabelText, queryByTestId } = renderModal();

      fireEvent.press(getByTestId('submit-button'));

      await waitFor(() => expect(getByTestId('validation-error')).toBeTruthy());

      fireEvent.press(getByLabelText('Rate 3 stars'));

      await waitFor(() => expect(queryByTestId('validation-error')).toBeNull());
    });

  });

  describe('Scenario 3 — Network error', () => {

    it('AT-08: a network error shows the retry message without closing the modal', async () => {
      const onSubmit = jest.fn(() => Promise.reject(new Error('Network error')));
      const { getByLabelText, getByTestId } = renderModal({ onSubmit });

      fireEvent.press(getByLabelText('Rate 2 stars'));
      fireEvent.press(getByTestId('submit-button'));

      await waitFor(() => {
        expect(getByTestId('network-error')).toBeTruthy();
      });

      expect(getByTestId('submit-button')).toBeTruthy();
    });

    it('AT-09: the user can retry after a network error', async () => {
      const onSubmit = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined);

      const { getByLabelText, getByTestId } = renderModal({ onSubmit });

      fireEvent.press(getByLabelText('Rate 2 stars'));
      fireEvent.press(getByTestId('submit-button'));

      await waitFor(() => expect(getByTestId('network-error')).toBeTruthy());

      fireEvent.press(getByTestId('submit-button'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(2);
      });
    });

  });

});
