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
  bio: profile.bio ?? '',
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
      bio: updates.bio,
    });

    return {
      success: true,
      profile: normalizeProfile(userId, updates),
    };
  } catch {
    return { success: false, error: 'Could not update profile. Please try again.' };
  }
};

export const updateProfilePhoto = async (userId, file) => {
  try {
    if (!userId) {
      return { success: false, error: 'You must be signed in to update your profile photo.' };
    }

    if (!file?.uri) {
      return { success: false, error: 'Please choose a profile picture before saving.' };
    }

    const lowerUri = file.uri.toLowerCase();
    const lowerMimeType = file.mimeType?.toLowerCase?.() ?? '';
    const isValidType =
      lowerUri.endsWith('.jpg') ||
      lowerUri.endsWith('.jpeg') ||
      lowerUri.endsWith('.png') ||
      lowerUri.endsWith('.webp') ||
      lowerUri.endsWith('.gif') ||
      lowerMimeType === 'image/jpeg' ||
      lowerMimeType === 'image/png' ||
      lowerMimeType === 'image/webp' ||
      lowerMimeType === 'image/gif';

    if (!isValidType) {
      return { success: false, error: 'Invalid file format. Please upload a JPG or PNG.' };
    }

    if (file.sizeBytes && file.sizeBytes > 5 * 1024 * 1024) {
      return { success: false, error: 'File too large - max 5 MB allowed.' };
    }

    await upsertFsProfile(userId, { photoUrl: file.uri });

    return {
      success: true,
      profile: normalizeProfile(userId, { photoUrl: file.uri }),
    };
  } catch {
    return { success: false, error: 'Could not update profile photo. Please try again.' };
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
