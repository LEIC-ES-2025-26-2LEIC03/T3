import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY_PREFIX = 'profile:';

const VALID_UNITS = ['kg', 'lbs'];

const DEFAULT_PROFILE = {
  displayName: '',
  photoUrl: null,
  units: 'kg',
  heightCm: null,
  weightKg: null,
  bodyFatPercentage: null,
  fitnessGoals: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────

const profileKey = (userId) => `${PROFILE_KEY_PREFIX}${userId}`;

const loadProfile = async (userId) => {
  const raw = await AsyncStorage.getItem(profileKey(userId));
  return raw ? JSON.parse(raw) : { ...DEFAULT_PROFILE };
};

const persistProfile = async (userId, profile) => {
  await AsyncStorage.setItem(profileKey(userId), JSON.stringify(profile));
};

// ─── US-03 | Get Profile ──────────────────────────────────────────────────

/**
 * Retrieve the profile for a given user.
 * New users get the default profile (units: 'kg').
 */
export const getProfile = async (userId) => {
  const profile = await loadProfile(userId);
  return profile;
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
 *
 * Validation rules:
 *   displayName  – required, max 30 chars
 *   units        – must be 'kg' or 'lbs'
 */
export const updateProfile = async (userId, updates) => {
  try {
    // ── displayName validation ──────────────────────────────────────────
    if ('displayName' in updates) {
      const name = updates.displayName;
      if (!name || name.trim() === '') {
        return { success: false, error: 'Name is required and cannot be empty.' };
      }
      if (name.trim().length > 30) {
        return { success: false, error: 'Name is too long — max 30 characters.' };
      }
      updates = { ...updates, displayName: name.trim() };
    }

    // ── units validation ────────────────────────────────────────────────
    if ('units' in updates) {
      if (!VALID_UNITS.includes(updates.units)) {
        return { success: false, error: 'Units are invalid — unsupported unit provided.' };
      }
    }

    const current = await loadProfile(userId);
    const updated = { ...current, ...updates };
    await persistProfile(userId, updated);

    return { success: true, profile: updated };
  } catch (e) {
    return { success: false, error: 'Could not update profile. Please try again.' };
  }
};

// ─── US-02 | Update Profile Photo ─────────────────────────────────────────

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Attach a photo to the user profile.
 * Expects: { mimeType: string, sizeBytes: number, uri?: string }
 */
export const updateProfilePhoto = async (userId, photo) => {
  try {
    if (!ALLOWED_IMAGE_TYPES.includes(photo.mimeType)) {
      return { success: false, error: 'Unsupported format — must be an image (JPEG, PNG, WebP, GIF).' };
    }
    if (photo.sizeBytes > MAX_PHOTO_BYTES) {
      return { success: false, error: 'File is too large — max 5 MB allowed.' };
    }

    const current = await loadProfile(userId);
    const photoUrl = photo.uri ?? `local://photos/${userId}-${Date.now()}`;
    const updated = { ...current, photoUrl };
    await persistProfile(userId, updated);

    return { success: true, profile: updated };
  } catch (e) {
    return { success: false, error: 'Could not update photo. Please try again.' };
  }
};

// ─── US-02 | Remove Profile Photo ─────────────────────────────────────────

export const removeProfilePhoto = async (userId) => {
  try {
    const current = await loadProfile(userId);
    const updated = { ...current, photoUrl: null };
    await persistProfile(userId, updated);
    return { success: true, profile: updated };
  } catch (e) {
    return { success: false, error: 'Could not remove photo. Please try again.' };
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
 * Save full profile details: height, weight, body fat, fitness goals.
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

    const current = await loadProfile(userId);
    const updated = {
      ...current,
      heightCm,
      weightKg,
      bodyFatPercentage: bodyFatPercentage ?? null,
      fitnessGoals: fitnessGoals ?? '',
    };
    await persistProfile(userId, updated);

    return { success: true, profile: updated };
  } catch (e) {
    return { success: false, error: 'Could not save profile. Please try again.' };
  }
};
