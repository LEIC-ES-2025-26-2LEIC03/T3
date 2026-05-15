import { getProfile as getFsProfile, upsertProfile as upsertFsProfile } from '../utils/firestoreDb';

const VALID_UNITS = ['kg', 'lbs'];

// ─── US-03 | Get Profile ──────────────────────────────────────────────────

/**
 * Retrieve the profile for a given user from Firestore.
 */
export const getProfile = async (userId) => {
  try {
    const profile = await getFsProfile(userId);
    return profile;
  } catch (e) {
    return { user_id: userId };
  }
};

// ─── US-20 | Get User Profile ─────────────────────────────────────────────

/**
 * Alias used by US-20 tests.
 */
export const getUserProfile = async (userId) => {
  return getProfile(userId);
};

// ─── US-01 + US-03 | Update Profile Fields ────────────────────────────────

/**
 * Update scalar profile fields: displayName, units.
 */
export const updateProfile = async (userId, updates) => {
  try {
    // ── units validation ────────────────────────────────────────────────
    if ('units' in updates) {
      if (!VALID_UNITS.includes(updates.units)) {
        return { success: false, error: 'Units are invalid — unsupported unit provided.' };
      }
    }

    const current = await getFsProfile(userId);
    const updated = { ...current, ...updates };

    // Map fields back to the naming expected by upsertProfile in firestoreDb.js
    await upsertFsProfile(userId, {
      units:             updated.units,
      heightCm:          updated.height_cm ?? updated.heightCm,
      weightKg:          updated.weight_kg ?? updated.weightKg,
      bodyFatPercentage: updated.body_fat_percentage ?? updated.bodyFatPercentage,
      fitnessGoals:      updated.fitness_goals ?? updated.fitnessGoals,
    });

    return { success: true, profile: updated };
  } catch (e) {
    return { success: false, error: 'Could not update profile. Please try again.' };
  }
};

// ─── US-20 | Save User Profile ────────────────────────────────────────────

const HEIGHT_MIN = 50;   // cm
const HEIGHT_MAX = 300;  // cm
const WEIGHT_MIN = 1;    // kg
const WEIGHT_MAX = 500;  // kg
const BODY_FAT_MIN = 1;
const BODY_FAT_MAX = 100;

/**
 * Save full profile details to Firestore.
 */
export const saveUserProfile = async (userId, profileData) => {
  try {
    const { heightCm, weightKg, bodyFatPercentage, fitnessGoals } = profileData;

    // ── height & weight validation ──────────────────────────────────────
    if (
      heightCm == null || heightCm < HEIGHT_MIN || heightCm > HEIGHT_MAX ||
      weightKg == null || weightKg < WEIGHT_MIN || weightKg > WEIGHT_MAX
    ) {
      return {
        success: false,
        error: 'Height is invalid or weight is invalid — please enter realistic values.',
      };
    }

    // ── body fat validation ─────────────────────────────────────────────
    if (
      bodyFatPercentage != null &&
      (bodyFatPercentage < BODY_FAT_MIN || bodyFatPercentage > BODY_FAT_MAX)
    ) {
      return {
        success: false,
        error: 'Body fat is out of range — body composition is invalid.',
      };
    }

    await upsertFsProfile(userId, {
      heightCm,
      weightKg,
      bodyFatPercentage: bodyFatPercentage ?? null,
      fitnessGoals: fitnessGoals ?? '',
    });

    return { success: true };
  } catch (e) {
    return { success: false, error: 'Could not save profile. Please try again.' };
  }
};

