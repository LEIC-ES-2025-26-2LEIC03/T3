import { saveUserProfile, updateProfile, getUserProfile } from '../../src/services/profileService';
import { getProfile as getFsProfile, upsertProfile } from '../../src/utils/firestoreDb';

jest.mock('../../src/utils/firestoreDb', () => ({
  getProfile: jest.fn(),
  upsertProfile: jest.fn(),
}));

describe('US-20 | Enter User Profile Details acceptance tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getFsProfile.mockResolvedValue({
      user_id: 'user-001',
      units: 'kg',
      height_cm: 180,
      weight_kg: 78,
      body_fat_percentage: 18,
      fitness_goals: 'Build strength',
    });
  });

  it('saves complete profile details for personalized recommendations', async () => {
    const result = await saveUserProfile('user-001', {
      heightCm: 180,
      weightKg: 78,
      bodyFatPercentage: 18,
      fitnessGoals: 'Build strength',
    });

    expect(result.success).toBe(true);
    expect(upsertProfile).toHaveBeenCalledWith('user-001', {
      heightCm: 180,
      weightKg: 78,
      bodyFatPercentage: 18,
      fitnessGoals: 'Build strength',
    });
  });

  it('lets the user choose imperial units separately from stored metric values', async () => {
    const result = await updateProfile('user-001', { units: 'lbs' });

    expect(result.success).toBe(true);
    expect(upsertProfile).toHaveBeenCalledWith(
      'user-001',
      expect.objectContaining({ units: 'lbs' })
    );
  });

  it('retrieves the persisted user profile later', async () => {
    await expect(getUserProfile('user-001')).resolves.toMatchObject({
      height_cm: 180,
      weight_kg: 78,
      fitness_goals: 'Build strength',
    });
  });
});

