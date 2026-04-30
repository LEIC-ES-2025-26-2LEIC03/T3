import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
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

const userDoc     = (userId)             => doc(db, 'users', userId);
const templateCol = (userId)             => collection(db, 'users', userId, 'templates');
const templateDoc = (userId, templateId) => doc(db, 'users', userId, 'templates', templateId);
const workoutCol  = (userId)             => collection(db, 'users', userId, 'workouts');
const workoutDoc  = (userId, workoutId)  => doc(db, 'users', userId, 'workouts', workoutId);

// ─── User profile ─────────────────────────────────────────────────────────────

export async function getProfile(userId) {
  const snap = await getDoc(userDoc(userId));
  if (!snap.exists()) return { user_id: userId };
  const d = snap.data();
  return {
    user_id:             userId,
    units:               d.units ?? 'kg',
    height_cm:           d.heightCm ?? null,
    weight_kg:           d.weightKg ?? null,
    body_fat_percentage: d.bodyFatPercentage ?? null,
    fitness_goals:       d.fitnessGoals ?? null,
  };
}

export async function upsertProfile(userId, fields) {
  await setDoc(userDoc(userId), {
    units:             fields.units ?? 'kg',
    heightCm:          fields.heightCm ?? null,
    weightKg:          fields.weightKg ?? null,
    bodyFatPercentage: fields.bodyFatPercentage ?? null,
    fitnessGoals:      fields.fitnessGoals ?? null,
    updatedAt:         serverTimestamp(),
  }, { merge: true });
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
    const data        = d.data();
    const exerciseIds = data.exerciseIds ?? [];
    const exercises   = exerciseIds
      .map(id => EXERCISES.find(e => e.id === id))
      .filter(Boolean);

    return {
      id:          d.id,
      user_id:     userId,
      name:        data.name,
      tag:         data.tag ?? '',
      created_at:  data.createdAt?.toDate?.()?.toISOString() ?? null,
      updated_at:  data.updatedAt?.toDate?.()?.toISOString() ?? null,
      deleted_at:  null,
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
  const exercises   = exerciseIds
    .map(id => EXERCISES.find(e => e.id === id))
    .filter(Boolean);

  return {
    id:          snap.id,
    user_id:     userId,
    name:        data.name,
    tag:         data.tag ?? '',
    created_at:  data.createdAt?.toDate?.()?.toISOString() ?? null,
    updated_at:  data.updatedAt?.toDate?.()?.toISOString() ?? null,
    deleted_at:  null,
    sync_status: 'synced',
    exercises,
    exerciseIds,
  };
}

export async function templateNameExists(userId, name, excludeId = null) {
  const trimmedLower = name.trim().toLowerCase();
  if (!trimmedLower) return false;

  const q    = query(templateCol(userId), where('deletedAt', '==', null));
  const snap = await getDocs(q);

  return snap.docs.some(d => {
    if (excludeId && d.id === excludeId) return false;
    return (d.data().name ?? '').toLowerCase() === trimmedLower;
  });
}

export async function createTemplate(userId, id, name, tag, exerciseIds) {
  setDoc(templateDoc(userId, id), {
    name:        name.trim(),
    tag:         tag ?? '',
    exerciseIds: exerciseIds ?? [],
    deletedAt:   null,
    createdAt:   serverTimestamp(),
    updatedAt:   serverTimestamp(),
  });
}

export async function updateTemplate(userId, id, name, tag, exerciseIds) {
  updateDoc(templateDoc(userId, id), {
    name:        name.trim(),
    tag:         tag ?? '',
    exerciseIds: exerciseIds ?? [],
    updatedAt:   serverTimestamp(),
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
    name:       workout.name,
    startedAt:  workout.startedAt,
    finishedAt: workout.finishedAt,
    notes:      workout.notes ?? null,
    deletedAt:  null,
    createdAt:  serverTimestamp(),
    updatedAt:  serverTimestamp(),
    exercises: (workout.exercises ?? []).map((ex, i) => ({
      position:   i,
      exerciseId: ex.exerciseId,
      name:       ex.name,
      muscle:     ex.muscle,
      category:   ex.category,
      sets: (ex.sets ?? []).map((s, j) => ({
        position: j,
        weight:   s.weight ?? 0,
        reps:     s.reps ?? 0,
        rpe:      s.rpe ?? null,
        notes:    s.notes ?? null,
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
      id:          d.id,
      user_id:     userId,
      name:        data.name,
      started_at:  data.startedAt ?? null,
      finished_at: data.finishedAt ?? null,
      notes:       data.notes ?? null,
      created_at:  data.createdAt?.toDate?.()?.toISOString() ?? null,
      updated_at:  data.updatedAt?.toDate?.()?.toISOString() ?? null,
      deleted_at:  null,
      sync_status: 'synced',
      exercises: (data.exercises ?? []).map(ex => ({
        exerciseId: ex.exerciseId,
        name:       ex.name,
        muscle:     ex.muscle,
        category:   ex.category,
        sets: (ex.sets ?? []).map(s => ({
          weight: s.weight,
          reps:   s.reps,
          rpe:    s.rpe ?? null,
          notes:  s.notes ?? null,
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

// ─── Shared utility ───────────────────────────────────────────────────────────

export function buildExercisesFromTemplate(exercises) {
  return exercises.map(def => ({
    id:         generateId(),
    exerciseId: def.id,
    name:       def.name,
    muscle:     def.muscle,
    category:   def.category,
    sets: [{ id: generateId(), weight: '', reps: '', rpe: null, notes: '' }],
  }));
}

// ─── Sync engine stubs (no-ops — Firestore handles this natively) ─────────────

export async function getPendingSyncQueue()  { return []; }
export async function markSynced()           { }
export async function markConflict()         { }
export async function applyServerTemplates() { }
export async function applyServerWorkouts()  { }