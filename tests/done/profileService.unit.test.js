import {
  getProfile,
  getUserProfile,
  updateProfile,
  updateProfilePhoto,
  saveUserProfile,
} from '../../src/services/profileService';
import {
  getProfile as getFsProfile,
  upsertProfile as upsertFsProfile,
} from '../../src/utils/firestoreDb';

jest.mock('../../src/utils/firestoreDb', () => ({
  getProfile: jest.fn(),
  upsertProfile: jest.fn(),
  addBodyMetric: jest.fn(),
  fetchBodyMetrics: jest.fn(),
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

    await expect(getProfile('user-001')).resolves.toMatchObject({ user_id: 'user-001' });
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
      displayName: undefined,
      photoUrl: undefined,
      bio: undefined,
    });
  });

  it('saves valid profile photos', async () => {
    const result = await updateProfilePhoto('user-001', {
      uri: 'file:///photos/avatar.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
    });

    expect(result.success).toBe(true);
    expect(result.profile.photoUrl).toBe('file:///photos/avatar.jpg');
    expect(upsertFsProfile).toHaveBeenCalledWith('user-001', {
      photoUrl: 'file:///photos/avatar.jpg',
    });
  });

  it('rejects unsupported profile photo files', async () => {
    const result = await updateProfilePhoto('user-001', {
      uri: 'file:///docs/avatar.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid file format/i);
    expect(upsertFsProfile).not.toHaveBeenCalled();
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
    ).resolves.toMatchObject({ success: true });

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

