import React from 'react';
import { Alert } from 'react-native';
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

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('US-24 | Update Body Metrics integration tests', () => {
  const navigation = { goBack: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    profileService.getProfile.mockResolvedValue({
      units: 'kg',
      heightCm: 180,
      weightKg: 80,
      bodyFatPercentage: 18,
    });
    profileService.updateProfile.mockResolvedValue({ success: true });
    profileService.saveUserProfile.mockResolvedValue({ success: true });
  });

  it('loads existing metrics into the editable form', async () => {
    const { getByDisplayValue } = render(<BodyMetricsScreen navigation={navigation} />);

    await waitFor(() => {
      expect(getByDisplayValue('180')).toBeTruthy();
      expect(getByDisplayValue('80')).toBeTruthy();
      expect(getByDisplayValue('18')).toBeTruthy();
    });
  });

  it('converts imperial entries to metric before saving', async () => {
    const { getByText, getAllByDisplayValue } = render(
      <BodyMetricsScreen navigation={navigation} />
    );

    await waitFor(() => expect(getByText('Imperial (lbs / in)')).toBeTruthy());
    fireEvent.press(getByText('Imperial (lbs / in)'));

    const inputs = getAllByDisplayValue(/.*/);
    fireEvent.changeText(inputs[0], '71');
    fireEvent.changeText(inputs[1], '165');
    fireEvent.changeText(inputs[2], '17');
    fireEvent.press(getByText('Save Changes'));

    await waitFor(() => {
      expect(profileService.updateProfile).toHaveBeenCalledWith('user-001', {
        units: 'lbs',
      });
      expect(profileService.saveUserProfile).toHaveBeenCalledWith(
        'user-001',
        expect.objectContaining({
          heightCm: 180,
          weightKg: 74.8,
          bodyFatPercentage: 17,
        })
      );
    });
  });

  it('shows service validation errors without navigating away', async () => {
    profileService.saveUserProfile.mockResolvedValueOnce({
      success: false,
      error: 'Height is invalid or weight is invalid.',
    });

    const { getByText } = render(<BodyMetricsScreen navigation={navigation} />);

    await waitFor(() => expect(getByText('Save Changes')).toBeTruthy());
    fireEvent.press(getByText('Save Changes'));

    await waitFor(() => {
      expect(getByText('Height is invalid or weight is invalid.')).toBeTruthy();
    });
  });

  it('uses the back button to return to the profile menu', async () => {
    const { getByText } = render(<BodyMetricsScreen navigation={navigation} />);

    fireEvent.press(getByText('Back'));

    expect(navigation.goBack).toHaveBeenCalled();
  });
});

