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

// ─── User profile ─────────────────────────────────────────────────────────────

export async function getProfile(userId) {
  const snap = await getDoc(userDoc(userId));
  if (!snap.exists()) return { user_id: userId };
  const d = snap.data();
  return {
    user_id: userId,
    units: d.units ?? 'kg',
    height_cm: d.heightCm ?? null,
    weight_kg: d.weightKg ?? null,
    body_fat_percentage: d.bodyFatPercentage ?? null,
    fitness_goals: d.fitnessGoals ?? null,
  };
}

export async function upsertProfile(userId, fields) {
  const data = { updatedAt: serverTimestamp() };
  if (fields.units !== undefined) data.units = fields.units;
  if (fields.heightCm !== undefined) data.heightCm = fields.heightCm;
  if (fields.weightKg !== undefined) data.weightKg = fields.weightKg;
  if (fields.bodyFatPercentage !== undefined) data.bodyFatPercentage = fields.bodyFatPercentage;
  if (fields.fitnessGoals !== undefined) data.fitnessGoals = fields.fitnessGoals;

  await setDoc(userDoc(userId), data, { merge: true });
}

// ─── Favourites ───────────────────────────────────────────────────────────────

/**
 * Fetch the set of exercise IDs the user has favourited.
 * Returns a Set<string> for O(1) membership checks in the picker UI.
 */
export async function fetchFavourites(userId) {
  const snap = await getDocs(favouriteCol(userId));
  const ids = new Set();
  snap.forEach(d => ids.add(d.id));
  return ids;
}

/**
 * Toggle a favourite on or off.
 * Returns true if the exercise is now favourited, false if it was removed.
 */
export async function toggleFavourite(userId, exercise) {
  const ref = favouriteDoc(userId, exercise.id);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    await deleteDoc(ref);
    return false;
  } else {
    await setDoc(ref, {
      exerciseId: exercise.id,
      name: exercise.name,
      muscle: exercise.muscle,
      category: exercise.category,
      createdAt: serverTimestamp(),
    });
    return true;
  }
}

// ─── Templates ────────────────────────────────────────────────────────────────

export async function fetchTemplates(userId) {
  const q = query(
    templateCol(userId),
    where('deletedAt', '==', null),
    orderBy('updatedAt', 'desc')
  );

  const snap = await getDocs(q);
  if (snap.empty) return [];

  return snap.docs.map(d => {
    const data = d.data();
    const exerciseIds = data.exerciseIds ?? [];
    const exercises = exerciseIds
      .map(id => EXERCISES.find(e => e.id === id))
      .filter(Boolean);

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
    };
  });
}

export async function fetchTemplateById(userId, templateId) {
  const snap = await getDoc(templateDoc(userId, templateId));
  if (!snap.exists()) return null;

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

  const q = query(templateCol(userId), where('deletedAt', '==', null));
  const snap = await getDocs(q);

  return snap.docs.some(d => {
    if (excludeId && d.id === excludeId) return false;
    return (d.data().name ?? '').toLowerCase() === trimmedLower;
  });
}

export async function createTemplate(userId, id, name, tag, exerciseIds) {
  setDoc(templateDoc(userId, id), {
    name: name.trim(),
    tag: tag ?? '',
    exerciseIds: exerciseIds ?? [],
    deletedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateTemplate(userId, id, name, tag, exerciseIds) {
  updateDoc(templateDoc(userId, id), {
    name: name.trim(),
    tag: tag ?? '',
    exerciseIds: exerciseIds ?? [],
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTemplate(userId, id) {
  updateDoc(templateDoc(userId, id), {
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// ─── Workouts ─────────────────────────────────────────────────────────────────

export async function saveWorkout(userId, workout) {
  setDoc(workoutDoc(userId, workout.id), {
    userId,
    name: workout.name,
    startedAt: workout.startedAt,
    finishedAt: workout.finishedAt,
    notes: workout.notes ?? null,
    deletedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    exercises: (workout.exercises ?? []).map((ex, i) => ({
      position: i,
      exerciseId: ex.exerciseId,
      name: ex.name,
      muscle: ex.muscle,
      category: ex.category,
      sets: (ex.sets ?? []).map((s, j) => ({
        position: j,
        weight: s.weight ?? 0,
        reps: s.reps ?? 0,
        rpe: s.rpe ?? null,
        notes: s.notes ?? null,
      })),
    })),
  });
}

export async function fetchWorkouts(userId) {
  const q = query(
    workoutCol(userId),
    where('deletedAt', '==', null),
    orderBy('finishedAt', 'desc')
  );

  const snap = await getDocs(q);
  if (snap.empty) return [];

  return snap.docs.map(d => {
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
}

export async function deleteWorkout(userId, id) {
  updateDoc(workoutDoc(userId, id), {
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// ─── Custom exercises (user-scoped) ──────────────────────────────────────────

/**
 * Returns all custom exercises created by the user.
 * The shape matches static EXERCISES so the rest of the app handles them uniformly:
 *   { id, name, category, muscle, isCustom: true }
 */
export async function fetchCustomExercises(userId) {
  if (!userId) return [];
  const snap = await getDocs(customExerciseCol(userId));
  if (snap.empty) return [];
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name,
      category: data.muscle, // category mirrors primary muscle for custom exercises
      muscle: data.muscle,
      isCustom: true,
    };
  });
}

/**
 * Persists a new custom exercise to Firestore.
 * `id` should be a pre-generated unique string (e.g. from generateId()).
 * `name` is the exercise name; `muscle` is a comma-separated muscle string.
 */
export async function createCustomExercise(userId, id, name, muscle) {
  await setDoc(customExerciseDoc(userId, id), {
    name: name.trim(),
    muscle: muscle.trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Hard-deletes a custom exercise (no tombstone needed — templates store exercise
 * data inline so deletion only affects future picks, not history).
 */
export async function deleteCustomExercise(userId, exerciseId) {
  await deleteDoc(customExerciseDoc(userId, exerciseId));
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
  const subcollections = [
    templateCol(userId),
    workoutCol(userId),
    favouriteCol(userId),
    customExerciseCol(userId),
  ];

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
    }
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