import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ForgotPasswordScreen from '../../src/screens/ForgotPasswordScreen';
import * as authService from '../../src/services/authService';

jest.mock('../../src/services/authService', () => ({
  resetPassword: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
}));

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

describe('US-PW | Password Reset acceptance tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lets the user request a reset link and sees the success screen', async () => {
    authService.resetPassword.mockResolvedValueOnce({ success: true });

    const { getByPlaceholderText, getByText, queryByText } = render(
      <ForgotPasswordScreen navigation={mockNavigation} />
    );

    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'user@example.com');
    fireEvent.press(getByText('Send Reset Link'));

    await waitFor(() => {
      expect(authService.resetPassword).toHaveBeenCalledWith('user@example.com');
      expect(getByText('Check your inbox')).toBeTruthy();
      expect(queryByText('Send Reset Link')).toBeNull();
    });
  });

  it('shows an error banner when the email field is empty', async () => {
    const { getByText } = render(
      <ForgotPasswordScreen navigation={mockNavigation} />
    );

    fireEvent.press(getByText('Send Reset Link'));

    await waitFor(() => {
      expect(getByText('Please enter your email address.')).toBeTruthy();
      expect(authService.resetPassword).not.toHaveBeenCalled();
    });
  });

  it('shows an error banner when Firebase returns an error', async () => {
    authService.resetPassword.mockResolvedValueOnce({
      success: false,
      error: 'Please enter a valid email address.',
    });

    const { getByPlaceholderText, getByText } = render(
      <ForgotPasswordScreen navigation={mockNavigation} />
    );

    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'bad-email');
    fireEvent.press(getByText('Send Reset Link'));

    await waitFor(() => {
      expect(getByText('Please enter a valid email address.')).toBeTruthy();
    });
  });

  it('navigates back when the user taps "Back to Log In" on the success screen', async () => {
    authService.resetPassword.mockResolvedValueOnce({ success: true });

    const { getByPlaceholderText, getByText } = render(
      <ForgotPasswordScreen navigation={mockNavigation} />
    );

    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'user@example.com');
    fireEvent.press(getByText('Send Reset Link'));

    await waitFor(() => expect(getByText('Back to Log In')).toBeTruthy());
    fireEvent.press(getByText('Back to Log In'));

    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
  });

  it('navigates back when the user taps "← Back to Log In" before submitting', async () => {
    const { getByText } = render(
      <ForgotPasswordScreen navigation={mockNavigation} />
    );

    fireEvent.press(getByText('← Back to Log In'));

    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    expect(authService.resetPassword).not.toHaveBeenCalled();
  });
});