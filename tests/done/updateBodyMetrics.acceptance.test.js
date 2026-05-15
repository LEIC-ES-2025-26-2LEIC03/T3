import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import BodyMetricsScreen from '../../src/screens/BodyMetricsScreen';
import * as profileService from '../../src/services/profileService';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
}));

jest.mock('../../src/utils/firebaseConfig', () => ({
  auth: { currentUser: { uid: 'user-001' } },
}));

jest.mock('../../src/services/profileService', () => ({
  getProfile: jest.fn(),
  saveUserProfile: jest.fn(),
  updateProfile: jest.fn(),
}));

describe('US-24 | Update Body Metrics acceptance tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    profileService.getProfile.mockResolvedValue({});
    profileService.updateProfile.mockResolvedValue({ success: true });
    profileService.saveUserProfile.mockResolvedValue({ success: true });
  });

  it('lets a user update weight and body fat from the Body Metrics screen', async () => {
    const { getByText, getAllByPlaceholderText, getByPlaceholderText } = render(
      <BodyMetricsScreen navigation={{ goBack: jest.fn() }} />
    );

    const zeroInputs = getAllByPlaceholderText('0');
    fireEvent.changeText(zeroInputs[0], '180');
    fireEvent.changeText(zeroInputs[1], '76');
    fireEvent.changeText(getByPlaceholderText('e.g. 18'), '17.5');
    fireEvent.press(getByText('Save Changes'));

    await waitFor(() => {
      expect(profileService.saveUserProfile).toHaveBeenCalledWith(
        'user-001',
        expect.objectContaining({
          heightCm: 180,
          weightKg: 76,
          bodyFatPercentage: 17.5,
        })
      );
      expect(getByText('Body metrics saved!')).toBeTruthy();
    });
  });

  it('shows validation feedback when the service rejects the new metrics', async () => {
    profileService.saveUserProfile.mockResolvedValueOnce({
      success: false,
      error: 'Height is invalid or weight is invalid.',
    });

    const { getByText } = render(
      <BodyMetricsScreen navigation={{ goBack: jest.fn() }} />
    );

    fireEvent.press(getByText('Save Changes'));

    await waitFor(() => {
      expect(getByText('Height is invalid or weight is invalid.')).toBeTruthy();
    });
  });
});

