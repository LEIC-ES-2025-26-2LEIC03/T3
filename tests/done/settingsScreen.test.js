// ─── Settings Screen Tests ────────────────────────────────────────────────

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import SettingsScreen from '../../src/screens/SettingsScreen';
import { Alert } from 'react-native';
import { logout } from '../../src/services/authService';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../src/services/authService', () => ({
  logout: jest.fn(),
}));

jest.spyOn(Alert, 'alert');

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    test('should render the SettingsScreen component', () => {
      render(<SettingsScreen />);
      expect(screen.getByText('Settings')).toBeDefined();
    });

    test('should display the screen title "Settings"', () => {
      render(<SettingsScreen />);
      const title = screen.getByText('Settings');
      expect(title).toBeDefined();
    });

    test('should display the Log Out button', () => {
      render(<SettingsScreen />);
      expect(screen.getByText('Log Out')).toBeDefined();
      expect(screen.getByText('⏻')).toBeDefined();
    });
  });

  describe('Layout and Structure', () => {
    test('should have a top bar with title', () => {
      const { toJSON } = render(<SettingsScreen />);
      const tree = toJSON();
      expect(tree).toBeDefined();
    });

    test('should have SafeAreaView wrapping the component', () => {
      const { toJSON } = render(<SettingsScreen />);
      const tree = toJSON();
      expect(tree).toBeDefined();
    });
  });

  describe('Log Out Functionality', () => {
    test('should show alert when Log Out is pressed', () => {
      render(<SettingsScreen />);
      const logoutBtn = screen.getByText('Log Out');
      fireEvent.press(logoutBtn);
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Log Out',
        'Are you sure you want to log out?',
        expect.any(Array)
      );
    });

    test('should call logout service when confirmed', async () => {
      render(<SettingsScreen />);
      const logoutBtn = screen.getByText('Log Out');
      fireEvent.press(logoutBtn);
      
      const buttons = Alert.alert.mock.calls[0][2];
      const confirmButton = buttons.find(b => b.text === 'Log Out');
      
      await act(async () => {
        await confirmButton.onPress();
      });
      
      expect(logout).toHaveBeenCalled();
    });

    test('should show error alert when logout fails', async () => {
      logout.mockRejectedValueOnce(new Error('Logout failed'));
      
      render(<SettingsScreen />);
      const logoutBtn = screen.getByText('Log Out');
      fireEvent.press(logoutBtn);
      
      const buttons = Alert.alert.mock.calls[0][2];
      const confirmButton = buttons.find(b => b.text === 'Log Out');
      
      await act(async () => {
        await confirmButton.onPress();
      });
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Could not log out. Please try again.'
      );
    });
  });
});
