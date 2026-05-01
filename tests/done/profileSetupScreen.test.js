// ─── Profile Setup Screen Tests ────────────────────────────────────────────
// US-03: Unit preference
// US-20: Profile details customization

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import ProfileSetupScreen from '../../src/screens/ProfileSetupScreen';
import * as authService from '../../src/services/authService';


// Mock the authService
jest.mock('../../src/services/authService', () => ({
  saveUserProfile: jest.fn(),
  updateProfile: jest.fn(),
}));

// Mock navigation
const mockNavigation = {
  replace: jest.fn(),
};

describe('ProfileSetupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('US-03: Unit Preference', () => {
    test('should render with default unit preference (kg)', () => {
      render(<ProfileSetupScreen navigation={mockNavigation} />);
      expect(screen.getByText('Set Up Your Profile')).toBeTruthy();
    });

    test('should display metric labels for height and weight when kg is selected', () => {
      render(<ProfileSetupScreen navigation={mockNavigation} />);
      expect(screen.getByText('Height (cm)')).toBeTruthy();
      expect(screen.getByText('Weight (kg)')).toBeTruthy();
    });

    test('should allow switching unit preference to imperial', async () => {
      render(<ProfileSetupScreen navigation={mockNavigation} />);

      const imperialButton = screen.getByText('Imperial (lbs)');
      fireEvent.press(imperialButton);

      await waitFor(() => {
        expect(screen.getByText('Height (in)')).toBeTruthy();
        expect(screen.getByText('Weight (lbs)')).toBeTruthy();
      });
    });

    test('should switch back to metric units', async () => {
      render(<ProfileSetupScreen navigation={mockNavigation} />);

      const imperialButton = screen.getByText('Imperial (lbs)');
      fireEvent.press(imperialButton);

      await waitFor(() => {
        expect(screen.getByText('Height (in)')).toBeTruthy();
      });

      const metricButton = screen.getByText('Metric (kg)');
      fireEvent.press(metricButton);

      await waitFor(() => {
        expect(screen.getByText('Height (cm)')).toBeTruthy();
        expect(screen.getByText('Weight (kg)')).toBeTruthy();
      });
    });
  });

  describe('US-20: Profile Details Customization', () => {
    test('should render all profile input fields', () => {
      render(<ProfileSetupScreen navigation={mockNavigation} />);

      expect(screen.getByPlaceholderText('e.g., 180')).toBeTruthy(); // height
      expect(screen.getByPlaceholderText('e.g., 75')).toBeTruthy();  // weight
      expect(screen.getByPlaceholderText('e.g., 15')).toBeTruthy();  // body fat
      expect(
        screen.getByPlaceholderText('e.g., Build muscle, lose fat')
      ).toBeTruthy();
    });

    test('should allow entering height value', () => {
      render(<ProfileSetupScreen navigation={mockNavigation} />);
      const heightInput = screen.getByPlaceholderText('e.g., 180');
      fireEvent.changeText(heightInput, '180');
      expect(heightInput.props.value).toBe('180');
    });

    test('should allow entering weight value', () => {
      render(<ProfileSetupScreen navigation={mockNavigation} />);
      const weightInput = screen.getByPlaceholderText('e.g., 75');
      fireEvent.changeText(weightInput, '75');
      expect(weightInput.props.value).toBe('75');
    });

    test('should allow entering body fat percentage', () => {
      render(<ProfileSetupScreen navigation={mockNavigation} />);
      const bodyFatInput = screen.getByPlaceholderText('e.g., 15');
      fireEvent.changeText(bodyFatInput, '15');
      expect(bodyFatInput.props.value).toBe('15');
    });

    test('should allow entering fitness goals', () => {
      render(<ProfileSetupScreen navigation={mockNavigation} />);
      const goalsInput = screen.getByPlaceholderText(
        'e.g., Build muscle, lose fat'
      );
      fireEvent.changeText(goalsInput, 'Build muscle and strength');
      expect(goalsInput.props.value).toBe('Build muscle and strength');
    });

    test('should convert height from imperial to metric on save', async () => {
      authService.updateProfile.mockResolvedValue({ success: true });
      authService.saveUserProfile.mockResolvedValue({ success: true });

      render(<ProfileSetupScreen navigation={mockNavigation} />);

      const imperialButton = screen.getByText('Imperial (lbs)');
      fireEvent.press(imperialButton);

      await waitFor(() => {
        expect(screen.getByText('Height (in)')).toBeTruthy();
      });

      const heightInput = screen.getByPlaceholderText('e.g., 180');
      fireEvent.changeText(heightInput, '71');

      fireEvent.press(screen.getByText('Save Profile'));

      await waitFor(() => {
        expect(authService.saveUserProfile).toHaveBeenCalled();
      });
    });

    test('should convert weight from imperial to metric on save', async () => {
      authService.updateProfile.mockResolvedValue({ success: true });
      authService.saveUserProfile.mockResolvedValue({ success: true });

      render(<ProfileSetupScreen navigation={mockNavigation} />);

      const imperialButton = screen.getByText('Imperial (lbs)');
      fireEvent.press(imperialButton);

      await waitFor(() => {
        expect(screen.getByText('Weight (lbs)')).toBeTruthy();
      });

      const weightInput = screen.getByPlaceholderText('e.g., 75');
      fireEvent.changeText(weightInput, '165');

      fireEvent.press(screen.getByText('Save Profile'));

      await waitFor(() => {
        expect(authService.saveUserProfile).toHaveBeenCalled();
      });
    });
  });

  describe('Profile Save Functionality', () => {
    test('should save profile with valid data', async () => {
      authService.updateProfile.mockResolvedValue({ success: true });
      authService.saveUserProfile.mockResolvedValue({ success: true });

      render(<ProfileSetupScreen navigation={mockNavigation} />);

      fireEvent.changeText(screen.getByPlaceholderText('e.g., 180'), '180');
      fireEvent.changeText(screen.getByPlaceholderText('e.g., 75'), '75');

      fireEvent.press(screen.getByText('Save Profile'));

      await waitFor(() => {
        expect(authService.updateProfile).toHaveBeenCalled();
        expect(authService.saveUserProfile).toHaveBeenCalled();
      });
    });

    test('should navigate to MainTabs after successful save', async () => {
      authService.updateProfile.mockResolvedValue({ success: true });
      authService.saveUserProfile.mockResolvedValue({ success: true });

      render(<ProfileSetupScreen navigation={mockNavigation} />);

      fireEvent.press(screen.getByText('Save Profile'));

      await waitFor(() => {
        expect(mockNavigation.replace).toHaveBeenCalledWith('MainTabs');
      });
    });

    test('should display error message when profile save fails', async () => {
      const errorMsg = 'Failed to save profile';
      authService.updateProfile.mockResolvedValue({ success: true });
      authService.saveUserProfile.mockResolvedValue({
        success: false,
        error: errorMsg,
      });

      render(<ProfileSetupScreen navigation={mockNavigation} />);

      fireEvent.press(screen.getByText('Save Profile'));

      await waitFor(() => {
        expect(screen.getByText(errorMsg)).toBeTruthy();
      });
    });

    test('should display error message when unit preference update fails', async () => {
      const errorMsg = 'Failed to update units';
      authService.updateProfile.mockResolvedValue({
        success: false,
        error: errorMsg,
      });

      render(<ProfileSetupScreen navigation={mockNavigation} />);

      fireEvent.press(screen.getByText('Save Profile'));

      await waitFor(() => {
        expect(screen.getByText(errorMsg)).toBeTruthy();
      });
    });

    test('should handle null values for optional fields', async () => {
      authService.updateProfile.mockResolvedValue({ success: true });
      authService.saveUserProfile.mockResolvedValue({ success: true });

      render(<ProfileSetupScreen navigation={mockNavigation} />);

      fireEvent.press(screen.getByText('Save Profile'));

      await waitFor(() => {
        const callArgs = authService.saveUserProfile.mock.calls[0];
        expect(callArgs[1].bodyFatPercentage).toBeNull();
      });
    });
  });

  describe('UI Elements', () => {
    test('should display personalization subheading', () => {
      render(<ProfileSetupScreen navigation={mockNavigation} />);
      expect(
        screen.getByText('Help us personalise your training recommendations.')
      ).toBeTruthy();
    });

    test('should have unit preference buttons', () => {
      render(<ProfileSetupScreen navigation={mockNavigation} />);
      expect(screen.getByText('Metric (kg)')).toBeTruthy();
      expect(screen.getByText('Imperial (lbs)')).toBeTruthy();
    });

    test('should have a save button', () => {
      render(<ProfileSetupScreen navigation={mockNavigation} />);
      expect(screen.getByText('Save Profile')).toBeTruthy();
    });
  });
});