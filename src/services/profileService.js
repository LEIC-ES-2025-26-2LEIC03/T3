import {
  getProfile as getFsProfile,
  upsertProfile as upsertFsProfile,
  addBodyMetric,
  fetchBodyMetrics,
} from '../utils/firestoreDb';

const VALID_UNITS = ['kg', 'lbs'];

const HEIGHT_MIN = 50;
const HEIGHT_MAX = 300;
const WEIGHT_MIN = 1;
const WEIGHT_MAX = 500;
const BODY_FAT_MIN = 1;
const BODY_FAT_MAX = 100;

const normalizeProfile = (userId, profile = {}) => ({
  user_id: profile.user_id ?? userId,
  units: profile.units ?? 'kg',
  heightCm: profile.heightCm ?? profile.height_cm ?? null,
  weightKg: profile.weightKg ?? profile.weight_kg ?? null,
  bodyFatPercentage:
    profile.bodyFatPercentage ?? profile.body_fat_percentage ?? null,
  fitnessGoals: profile.fitnessGoals ?? profile.fitness_goals ?? '',
  displayName: profile.displayName ?? '',
  photoUrl: profile.photoUrl ?? null,
});

export const getProfile = async (userId) => {
  try {
    const profile = await getFsProfile(userId);
    return normalizeProfile(userId, profile);
  } catch {
    return normalizeProfile(userId);
  }
};

export const getUserProfile = async (userId) => getProfile(userId);

export const updateProfile = async (userId, updates) => {
  try {
    if (!userId) {
      return { success: false, error: 'You must be signed in to update your profile.' };
    }

    if ('units' in updates && !VALID_UNITS.includes(updates.units)) {
      return { success: false, error: 'Units are invalid - unsupported unit provided.' };
    }

    await upsertFsProfile(userId, {
      units: updates.units,
      displayName: updates.displayName,
      photoUrl: updates.photoUrl,
    });

    return {
      success: true,
      profile: normalizeProfile(userId, updates),
    };
  } catch {
    return { success: false, error: 'Could not update profile. Please try again.' };
  }
};

export const saveUserProfile = async (userId, profileData) => {
  try {
    if (!userId) {
      return { success: false, error: 'You must be signed in to save body metrics.' };
    }

    const { heightCm, weightKg, bodyFatPercentage, fitnessGoals } = profileData;

    if (
      heightCm == null || heightCm < HEIGHT_MIN || heightCm > HEIGHT_MAX ||
      weightKg == null || weightKg < WEIGHT_MIN || weightKg > WEIGHT_MAX
    ) {
      return {
        success: false,
        error: 'Height is invalid or weight is invalid - please enter realistic values.',
      };
    }

    if (
      bodyFatPercentage != null &&
      (bodyFatPercentage < BODY_FAT_MIN || bodyFatPercentage > BODY_FAT_MAX)
    ) {
      return {
        success: false,
        error: 'Body fat is out of range - body composition is invalid.',
      };
    }

    await upsertFsProfile(userId, {
      heightCm,
      weightKg,
      bodyFatPercentage: bodyFatPercentage ?? null,
      fitnessGoals: fitnessGoals ?? '',
    });

    await addBodyMetric(userId, {
      weightKg,
      bodyFatPercentage: bodyFatPercentage ?? null,
    });

    return {
      success: true,
      profile: normalizeProfile(userId, {
        heightCm,
        weightKg,
        bodyFatPercentage,
        fitnessGoals,
      }),
    };
  } catch {
    return { success: false, error: 'Could not save profile. Please try again.' };
  }
};

export const getMetricsHistory = async (userId) => {
  try {
    return await fetchBodyMetrics(userId);
  } catch {
    return [];
  }
};
