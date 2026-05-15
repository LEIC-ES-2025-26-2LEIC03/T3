import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY_PREFIX = 'profile:';
const METRICS_HISTORY_KEY_PREFIX = 'metricsHistory:';

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
const metricsHistoryKey = (userId) => `${METRICS_HISTORY_KEY_PREFIX}${userId}`;

const loadProfile = async (userId) => {
  const raw = await AsyncStorage.getItem(profileKey(userId));
  return raw ? JSON.parse(raw) : { ...DEFAULT_PROFILE };
};

const persistProfile = async (userId, profile) => {
  await AsyncStorage.setItem(profileKey(userId), JSON.stringify(profile));
};

// ─── US-03 | Get Profile ──────────────────────────────────────────────────

export const getProfile = async (userId) => {
  try {
    const profile = await loadProfile(userId);
    return profile;
  } catch (e) {
    return { user_id: userId };   // fallback shape (kept for backward compat)
  }
};

// ─── US-20 | Get User Profile ─────────────────────────────────────────────

export const getUserProfile = async (userId) => {
  return getProfile(userId);
};

// ─── US-01 + US-03 | Update Profile Fields ────────────────────────────────

export const updateProfile = async (userId, updates) => {
  try {
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

// ─── US-20 | Save User Profile ────────────────────────────────────────────

const HEIGHT_MIN = 50;   // cm
const HEIGHT_MAX = 300;  // cm
const WEIGHT_MIN = 1;    // kg
const WEIGHT_MAX = 500;  // kg
const BODY_FAT_MIN = 1;
const BODY_FAT_MAX = 100;

/**
 * Save full profile details: height, weight, body fat, fitness goals.
 * Also appends a snapshot to the metrics history.
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

    // load existing profile to preserve other fields
    const current = await loadProfile(userId);
    const updated = {
      ...current,
      heightCm,
      weightKg,
      bodyFatPercentage: bodyFatPercentage ?? null,
      fitnessGoals: fitnessGoals ?? '',
    };

    await persistProfile(userId, updated);

    // ── append snapshot to history ──────────────────────────────────────
    await appendMetricsSnapshot(userId, {
      weightKg,
      bodyFatPercentage: bodyFatPercentage ?? null,
      date: new Date().toISOString(),
    });

    return { success: true, profile: updated };
  } catch (e) {
    return { success: false, error: 'Could not save profile. Please try again.' };
  }
};

// ─── Body Metrics History ─────────────────────────────────────────────────

const appendMetricsSnapshot = async (userId, snapshot) => {
  const raw = await AsyncStorage.getItem(metricsHistoryKey(userId));
  const history = raw ? JSON.parse(raw) : [];
  history.push(snapshot);
  await AsyncStorage.setItem(metricsHistoryKey(userId), JSON.stringify(history));
};

export const getMetricsHistory = async (userId) => {
  try {
    const raw = await AsyncStorage.getItem(metricsHistoryKey(userId));
    const history = raw ? JSON.parse(raw) : [];
    return [...history].reverse(); // newest first
  } catch {
    return [];
  }
};