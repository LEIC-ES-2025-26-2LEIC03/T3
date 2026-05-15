import {
  getProfile,
  getUserProfile,
  updateProfile,
  saveUserProfile,
} from '../../src/services/profileService';
import {
  getProfile as getFsProfile,
  upsertProfile as upsertFsProfile,
} from '../../src/utils/firestoreDb';

jest.mock('../../src/utils/firestoreDb', () => ({
  getProfile: jest.fn(),
  upsertProfile: jest.fn(),
}));

describe('US-03/20 | Profile service unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getFsProfile.mockResolvedValue({
      user_id: 'user-001',
      units: 'kg',
      height_cm: 180,
      weight_kg: 80,
    });
  });

  it('returns a fallback profile when Firestore read fails', async () => {
    getFsProfile.mockRejectedValueOnce(new Error('offline'));

    await expect(getProfile('user-001')).resolves.toEqual({ user_id: 'user-001' });
  });

  it('aliases getUserProfile to the same persisted profile data', async () => {
    await expect(getUserProfile('user-001')).resolves.toMatchObject({
      user_id: 'user-001',
      units: 'kg',
    });
  });

  it('saves supported unit preferences and maps persisted field names', async () => {
    const result = await updateProfile('user-001', { units: 'lbs' });

    expect(result.success).toBe(true);
    expect(result.profile.units).toBe('lbs');
    expect(upsertFsProfile).toHaveBeenCalledWith('user-001', {
      units: 'lbs',
      heightCm: 180,
      weightKg: 80,
      bodyFatPercentage: undefined,
      fitnessGoals: undefined,
    });
  });

  it('rejects unsupported unit preferences', async () => {
    const result = await updateProfile('user-001', { units: 'stones' });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/unsupported unit/i);
    expect(upsertFsProfile).not.toHaveBeenCalled();
  });

  it('validates realistic body profile values before saving', async () => {
    await expect(
      saveUserProfile('user-001', {
        heightCm: 180,
        weightKg: 78,
        bodyFatPercentage: 18,
        fitnessGoals: 'Build strength',
      })
    ).resolves.toEqual({ success: true });

    expect(upsertFsProfile).toHaveBeenCalledWith('user-001', {
      heightCm: 180,
      weightKg: 78,
      bodyFatPercentage: 18,
      fitnessGoals: 'Build strength',
    });
  });

  it('rejects unrealistic height, weight, and body-fat values', async () => {
    await expect(
      saveUserProfile('user-001', { heightCm: 20, weightKg: 78 })
    ).resolves.toMatchObject({ success: false });

    await expect(
      saveUserProfile('user-001', { heightCm: 180, weightKg: 0 })
    ).resolves.toMatchObject({ success: false });

    await expect(
      saveUserProfile('user-001', {
        heightCm: 180,
        weightKg: 78,
        bodyFatPercentage: 101,
      })
    ).resolves.toMatchObject({ success: false });
  });
});

