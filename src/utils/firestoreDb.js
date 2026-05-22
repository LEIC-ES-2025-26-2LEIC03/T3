import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';

import { db } from './firebaseConfig';
import { generateId } from './id';
import { EXERCISES } from '../data/exercises';
import {
  fetchTemplates as fetchLocalTemplates,
  fetchTemplateById as fetchLocalTemplateById,
  templateNameExists as localTemplateNameExists,
  createTemplate as createLocalTemplate,
  updateTemplate as updateLocalTemplate,
  deleteTemplate as deleteLocalTemplate,
  saveWorkout as saveLocalWorkout,
  fetchWorkouts as fetchLocalWorkouts,
  deleteWorkout as deleteLocalWorkout,
  applyServerTemplates as applyLocalServerTemplates,
  applyServerWorkouts as applyLocalServerWorkouts,
} from './db';
import { syncPendingWorkouts } from '../services/syncService';
import {
  getLocalProfile,
  saveLocalProfile,
  fetchLocalFavourites,
  toggleLocalFavourite,
  applyRemoteFavourites,
  fetchLocalCustomExercises,
  createLocalCustomExercise,
  deleteLocalCustomExercise,
  applyRemoteCustomExercises,
  addLocalBodyMetric,
  fetchLocalBodyMetrics,
  applyRemoteBodyMetrics,
} from './offlineStore';

// ─── Collection path helpers ──────────────────────────────────────────────────

const userDoc = (userId) => doc(db, 'users', userId);
const templateCol = (userId) => collection(db, 'users', userId, 'templates');
const templateDoc = (userId, templateId) => doc(db, 'users', userId, 'templates', templateId);
const workoutCol = (userId) => collection(db, 'users', userId, 'workouts');
const workoutDoc = (userId, workoutId) => doc(db, 'users', userId, 'workouts', workoutId);
const favouriteCol = (userId) => collection(db, 'users', userId, 'favourites');
const favouriteDoc = (userId, exerciseId) => doc(db, 'users', userId, 'favourites', exerciseId);
const customExerciseCol = (userId) => collection(db, 'users', userId, 'custom_exercises');
const customExerciseDoc = (userId, exerciseId) => doc(db, 'users', userId, 'custom_exercises', exerciseId);
const bodyMetricCol = (userId) => collection(db, 'users', userId, 'body_metrics');
const bodyMetricDoc = (userId, metricId) => doc(db, 'users', userId, 'body_metrics', metricId);

const syncSoon = (userId) => {
  syncPendingWorkouts(userId).catch(() => {});
};

// ─── User profile ─────────────────────────────────────────────────────────────

export async function getProfile(userId) {
  const localProfile = await getLocalProfile(userId);
  if (localProfile) return localProfile;

  try {
    const snap = await getDoc(userDoc(userId));
    if (!snap.exists()) return { user_id: userId };
    const d = snap.data();
    const profile = {
      user_id: userId,
      displayName: d.displayName ?? '',
      photoUrl: d.photoUrl ?? null,
      units: d.units ?? 'kg',
      height_cm: d.heightCm ?? null,
      weight_kg: d.weightKg ?? null,
      body_fat_percentage: d.bodyFatPercentage ?? null,
      fitness_goals: d.fitnessGoals ?? null,
    };
    await saveLocalProfile(userId, profile, false);
    return profile;
  } catch {
    return { user_id: userId, units: 'kg' };
  }
}

export async function upsertProfile(userId, fields) {
  const localFields = {};
  if (fields.units !== undefined) localFields.units = fields.units;
  if (fields.displayName !== undefined) localFields.displayName = fields.displayName;
  if (fields.photoUrl !== undefined) localFields.photoUrl = fields.photoUrl;
  if (fields.heightCm !== undefined) localFields.height_cm = fields.heightCm;
  if (fields.weightKg !== undefined) localFields.weight_kg = fields.weightKg;
  if (fields.bodyFatPercentage !== undefined) localFields.body_fat_percentage = fields.bodyFatPercentage;
  if (fields.fitnessGoals !== undefined) localFields.fitness_goals = fields.fitnessGoals;

  await saveLocalProfile(userId, localFields);
  syncSoon(userId);
}

// ─── Favourites ───────────────────────────────────────────────────────────────

/**
 * Fetch the set of exercise IDs the user has favourited.
 * Returns a Set<string> for O(1) membership checks in the picker UI.
 */
export async function fetchFavourites(userId) {
  if (!userId) return new Set();
  const local = await fetchLocalFavourites(userId);
  if (local.size > 0) {
    syncSoon(userId);
    return local;
  }

  try {
    const snap = await getDocs(favouriteCol(userId));
    const ids = new Set();
    snap.forEach(d => {
      if (!d.data?.()?.deletedAt) ids.add(d.id);
    });
    await applyRemoteFavourites(userId, [...ids]);
    return ids;
  } catch {
    return local;
  }
}

/**
 * Toggle a favourite on or off.
 * Returns true if the exercise is now favourited, false if it was removed.
 */
export async function toggleFavourite(userId, exercise) {
  if (!userId) throw new Error('Cannot update favourites without a signed-in user.');
  const result = await toggleLocalFavourite(userId, exercise);
  syncSoon(userId);
  return result;
}

// ─── Templates ────────────────────────────────────────────────────────────────

export async function fetchTemplates(userId) {
  const localTemplates = await fetchLocalTemplates(userId);
  if (localTemplates.length > 0) {
    syncSoon(userId);
    return localTemplates;
  }

  try {
    const q = query(templateCol(userId), where('deletedAt', '==', null), orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    if (snap.empty) return [];

    const remoteTemplates = snap.docs.map(d => {
      const data = d.data();
      const exerciseIds = data.exerciseIds ?? [];
      const exercises = exerciseIds.map(id => EXERCISES.find(e => e.id === id)).filter(Boolean);
      return {
        id: d.id,
        user_id: userId,
        name: data.name,
        tag: data.tag ?? '',
        created_at: data.createdAt?.toDate?.()?.toISOString() ?? null,
        updated_at: data.updatedAt?.toDate?.()?.toISOString() ?? null,
        deleted_at: null,
        sync_status: 'synced',
        exercises,
        exerciseIds,
        exercise_ids: exerciseIds,
      };
    });

    await applyLocalServerTemplates(remoteTemplates);
    return remoteTemplates;
  } catch {
    return [];
  }
}

export async function fetchTemplateById(userId, templateId) {
  const localTemplate = await fetchLocalTemplateById(userId, templateId);
  if (localTemplate) return localTemplate;

  let snap;
  try {
    snap = await getDoc(templateDoc(userId, templateId));
    if (!snap.exists()) return null;
  } catch {
    return null;
  }

  const data = snap.data();
  if (data.deletedAt) return null;
  const exerciseIds = data.exerciseIds ?? [];
  const exercises = exerciseIds
    .map(id => EXERCISES.find(e => e.id === id))
    .filter(Boolean);

  return {
    id: snap.id,
    user_id: userId,
    name: data.name,
    tag: data.tag ?? '',
    created_at: data.createdAt?.toDate?.()?.toISOString() ?? null,
    updated_at: data.updatedAt?.toDate?.()?.toISOString() ?? null,
    deleted_at: null,
    sync_status: 'synced',
    exercises,
    exerciseIds,
  };
}

export async function templateNameExists(userId, name, excludeId = null) {
  const trimmedLower = name.trim().toLowerCase();
  if (!trimmedLower) return false;

  if (await localTemplateNameExists(userId, name, excludeId)) return true;

  try {
    const q = query(templateCol(userId), where('deletedAt', '==', null));
    const snap = await getDocs(q);

    return snap.docs.some(d => {
      if (excludeId && d.id === excludeId) return false;
      return (d.data().name ?? '').toLowerCase() === trimmedLower;
    });
  } catch {
    return false;
  }
}

export async function createTemplate(userId, id, name, tag, exerciseIds) {
  await createLocalTemplate(userId, id, name, tag, exerciseIds ?? []);
  syncSoon(userId);
}

export async function updateTemplate(userId, id, name, tag, exerciseIds) {
  await updateLocalTemplate(userId, id, name, tag, exerciseIds ?? []);
  syncSoon(userId);
}

export async function deleteTemplate(userId, id) {
  await deleteLocalTemplate(userId, id);
  syncSoon(userId);
}

// ─── Workouts ─────────────────────────────────────────────────────────────────

export async function saveWorkout(userId, workout) {
  await saveLocalWorkout(userId, workout);
  syncSoon(userId);
}

export async function fetchWorkouts(userId) {
  const localWorkouts = await fetchLocalWorkouts(userId);
  if (localWorkouts.length > 0) {
    syncSoon(userId);
    return localWorkouts;
  }

  try {
    const q = query(workoutCol(userId), where('deletedAt', '==', null), orderBy('finishedAt', 'desc'));
    const snap = await getDocs(q);
    if (snap.empty) return [];

    const remoteWorkouts = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        user_id: userId,
        name: data.name,
        started_at: data.startedAt ?? null,
        finished_at: data.finishedAt ?? null,
        notes: data.notes ?? null,
        created_at: data.createdAt?.toDate?.()?.toISOString() ?? null,
        updated_at: data.updatedAt?.toDate?.()?.toISOString() ?? null,
        deleted_at: null,
        sync_status: 'synced',
        exercises: (data.exercises ?? []).map(ex => ({
          exercise_id: ex.exerciseId,
          exerciseId: ex.exerciseId,
          name: ex.name,
          muscle: ex.muscle,
          category: ex.category,
          sets: (ex.sets ?? []).map(s => ({
            weight: s.weight,
            reps: s.reps,
            rpe: s.rpe ?? null,
            notes: s.notes ?? null,
          })),
        })),
      };
    });

    await applyLocalServerWorkouts(remoteWorkouts);
    return remoteWorkouts;
  } catch {
    return [];
  }
}

export async function deleteWorkout(userId, id) {
  await deleteLocalWorkout(userId, id);
  syncSoon(userId);
}

// ─── Custom exercises (user-scoped) ──────────────────────────────────────────

/**
 * Returns all custom exercises created by the user.
 * The shape matches static EXERCISES so the rest of the app handles them uniformly:
 *   { id, name, category, muscle, isCustom: true }
 */
export async function fetchCustomExercises(userId) {
  if (!userId) return [];
  const local = await fetchLocalCustomExercises(userId);
  if (local.length > 0) {
    syncSoon(userId);
    return local;
  }

  try {
    const snap = await getDocs(customExerciseCol(userId));
    if (snap.empty) return [];
    const exercises = snap.docs
      .map(d => {
        const data = d.data();
        if (data.deletedAt) return null;
        return {
          id: d.id,
          name: data.name,
          category: data.muscle,
          muscle: data.muscle,
          isCustom: true,
        };
      })
      .filter(Boolean);
    await applyRemoteCustomExercises(userId, exercises);
    return exercises;
  } catch {
    return local;
  }
}

/**
 * Persists a new custom exercise to Firestore.
 * `id` should be a pre-generated unique string (e.g. from generateId()).
 * `name` is the exercise name; `muscle` is a comma-separated muscle string.
 */
export async function createCustomExercise(userId, id, name, muscle) {
  if (!userId) throw new Error('Cannot create a custom exercise without a signed-in user.');
  await createLocalCustomExercise(userId, id, name, muscle);
  syncSoon(userId);
}

/**
 * Hard-deletes a custom exercise (no tombstone needed — templates store exercise
 * data inline so deletion only affects future picks, not history).
 */
export async function deleteCustomExercise(userId, exerciseId) {
  if (!userId) throw new Error('Cannot delete a custom exercise without a signed-in user.');
  await deleteLocalCustomExercise(userId, exerciseId);
  syncSoon(userId);
}

// â”€â”€â”€ Body metrics history â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function addBodyMetric(userId, metric) {
  if (!userId) throw new Error('Cannot save body metrics without a signed-in user.');
  const record = await addLocalBodyMetric(userId, {
    ...metric,
    id: metric.id ?? generateId(),
  });
  syncSoon(userId);
  return { id: record.id, recordedAt: record.recordedAt };
}

export async function fetchBodyMetrics(userId) {
  if (!userId) return [];

  const local = await fetchLocalBodyMetrics(userId);
  if (local.length > 0) {
    syncSoon(userId);
    return local;
  }

  try {
    const q = query(bodyMetricCol(userId), orderBy('recordedAt', 'desc'));
    const snap = await getDocs(q);
    if (snap.empty) return [];

    const records = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        weightKg: data.weightKg ?? null,
        bodyFatPercentage: data.bodyFatPercentage ?? null,
        recordedAt: data.recordedAt ?? null,
        date: data.recordedAt ?? null,
      };
    });
    await applyRemoteBodyMetrics(userId, records);
    return records;
  } catch {
    return local;
  }
}

// ─── Exercise history ─────────────────────────────────────────────────────────

/**
 * Fetch the workout history for a single exercise.
 * Returns an array of { workoutId, workoutName, date, sets[] } sorted newest-first.
 */
export async function fetchExerciseHistory(userId, exerciseId) {
  const workouts = await fetchWorkouts(userId);

  const history = [];

  for (const w of workouts) {
    const matchingExercises = (w.exercises ?? []).filter(
      ex => ex.exerciseId === exerciseId
    );

    for (const ex of matchingExercises) {
      history.push({
        workoutId: w.id,
        workoutName: w.name,
        date: w.finished_at ?? w.started_at,
        sets: ex.sets ?? [],
      });
    }
  }

  // Already sorted newest-first from fetchWorkouts, but ensure it
  history.sort((a, b) => new Date(b.date) - new Date(a.date));

  return history;
}

// ─── Shared utility ───────────────────────────────────────────────────────────

export function buildExercisesFromTemplate(exercises) {
  return exercises.map(def => ({
    id: generateId(),
    exerciseId: def.id,
    name: def.name,
    muscle: def.muscle,
    category: def.category,
    sets: [{ id: generateId(), weight: '', reps: '', rpe: null, notes: '' }],
  }));
}

// ─── Delete all user data (for account deletion) ─────────────────────────────

/**
 * Permanently removes every document inside the user's subcollections
 * (templates, workouts, favourites, custom_exercises) and the user
 * profile document itself.  Uses batched writes (max 500 per batch).
 */
export async function deleteAllUserData(userId) {
  if (!userId) throw new Error('Cannot delete user data without a signed-in user.');

  const subcollections = [
    templateCol(userId),
    workoutCol(userId),
    favouriteCol(userId),
    customExerciseCol(userId),
    bodyMetricCol(userId),
  ];

  const failures = [];

  for (const colRef of subcollections) {
    try {
      const snap = await getDocs(colRef);
      // Firestore batches are limited to 500 operations
      const chunks = [];
      for (let i = 0; i < snap.docs.length; i += 450) {
        chunks.push(snap.docs.slice(i, i + 450));
      }
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (err) {
      console.warn(`[deleteAllUserData] Failed to delete collection ${colRef.path}:`, err);
      failures.push(err);
    }
  }

  if (failures.length > 0) {
    const first = failures[0];
    const error = new Error(first?.message ?? 'Could not delete all user data.');
    error.code = first?.code;
    throw error;
  }

  // Delete the user profile document
  await deleteDoc(userDoc(userId));
}

// ─── Sync engine stubs (no-ops — Firestore handles this natively) ─────────────

export async function getPendingSyncQueue() { return []; }
export async function markSynced() { }
export async function markConflict() { }
export async function applyServerTemplates() { }
export async function applyServerWorkouts() { }
