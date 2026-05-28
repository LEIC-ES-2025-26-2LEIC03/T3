import NetInfo from '@react-native-community/netinfo';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getPendingSyncQueue, markSynced, markConflict } from '../utils/db';
import { db } from '../utils/firebaseConfig';
import {
  getPendingOfflineOps,
  markOfflineOpSynced,
  markOfflineOpFailed,
} from '../utils/offlineStore';

const MAX_ATTEMPTS = 3;

let _isSyncing = false;

export async function syncPendingWorkouts(userId) {
  if (!userId || _isSyncing) return;

  const net = await NetInfo.fetch();
  if (!net.isConnected) return;

  _isSyncing = true;

  try {
    const queue = await getPendingSyncQueue(userId);
    if (queue.length === 0) return;

    for (const entry of queue) {
      if (entry.attempts >= MAX_ATTEMPTS) continue;

      try {
        const payload = entry.payload ? JSON.parse(entry.payload) : null;
        await pushToFirestore(entry.table_name, entry.row_id, entry.operation, payload, userId);
        await markSynced(userId, entry.table_name, entry.row_id, entry.id);
      } catch (err) {
        await markConflict(entry.id, err?.message ?? 'Unknown error');
      }
    }

    const offlineQueue = await getPendingOfflineOps(userId, MAX_ATTEMPTS);
    for (const entry of offlineQueue) {
      try {
        await pushToFirestore(entry.tableName, entry.rowId, entry.operation, entry.payload, userId);
        await markOfflineOpSynced(userId, entry.id);
      } catch (err) {
        await markOfflineOpFailed(userId, entry.id, err?.message ?? 'Unknown error');
      }
    }
  } finally {
    _isSyncing = false;
  }
}

export function startSyncOnReconnect(userId) {
  if (!userId) return () => {};

  const unsubscribe = NetInfo.addEventListener(state => {
    if (state.isConnected) {
      syncPendingWorkouts(userId);
    }
  });

  syncPendingWorkouts(userId);
  return unsubscribe;
}

async function pushToFirestore(tableName, rowId, operation, payload, userId) {
  if (tableName === 'workouts') {
    await pushWorkout(rowId, operation, payload, userId);
    return;
  }

  if (tableName === 'templates') {
    await pushTemplate(rowId, operation, payload, userId);
    return;
  }

  if (tableName === 'user_profiles') {
    await setDoc(doc(db, 'users', userId), {
      units: payload.units ?? 'kg',
      heightCm: payload.height_cm ?? null,
      weightKg: payload.weight_kg ?? null,
      bodyFatPercentage: payload.body_fat_percentage ?? null,
      fitnessGoals: payload.fitness_goals ?? '',
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return;
  }

  if (tableName === 'profiles') {
    await setDoc(doc(db, 'users', userId), {
      units: payload.units ?? 'kg',
      heightCm: payload.heightCm ?? payload.height_cm ?? null,
      weightKg: payload.weightKg ?? payload.weight_kg ?? null,
      bodyFatPercentage: payload.bodyFatPercentage ?? payload.body_fat_percentage ?? null,
      fitnessGoals: payload.fitnessGoals ?? payload.fitness_goals ?? '',
      displayName: payload.displayName ?? '',
      photoUrl: payload.photoUrl ?? null,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return;
  }

  if (tableName === 'favourites') {
    const ref = doc(db, 'users', userId, 'favourites', rowId);
    if (operation === 'delete') {
      await updateDoc(ref, { deletedAt: serverTimestamp() });
      return;
    }
    await setDoc(ref, {
      exerciseId: payload.exerciseId ?? rowId,
      name: payload.name ?? '',
      muscle: payload.muscle ?? '',
      category: payload.category ?? '',
      createdAt: serverTimestamp(),
      deletedAt: null,
    }, { merge: true });
    return;
  }

  if (tableName === 'custom_exercises') {
    const ref = doc(db, 'users', userId, 'custom_exercises', rowId);
    if (operation === 'delete') {
      await updateDoc(ref, { deletedAt: serverTimestamp(), updatedAt: serverTimestamp() });
      return;
    }
    await setDoc(ref, {
      name: payload.name,
      muscle: payload.muscle,
      steps: Array.isArray(payload.steps) ? payload.steps : [],
      tips: Array.isArray(payload.tips) ? payload.tips : [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      deletedAt: null,
    }, { merge: true });
    return;
  }

  if (tableName === 'body_metrics') {
    await setDoc(doc(db, 'users', userId, 'body_metrics', rowId), {
      weightKg: payload.weightKg ?? null,
      bodyFatPercentage: payload.bodyFatPercentage ?? null,
      recordedAt: payload.recordedAt ?? payload.date ?? new Date().toISOString(),
      createdAt: serverTimestamp(),
    }, { merge: true });
    return;
  }

  if (tableName === 'exercise_ratings') {
    await setDoc(doc(db, 'users', userId, 'exercise_ratings', rowId), {
      exerciseId: payload.exerciseId,
      exerciseName: payload.exerciseName,
      workoutId: payload.workoutId,
      rating: payload.rating,
      comment: payload.comment ?? null,
      ratedAt: payload.ratedAt ?? new Date().toISOString(),
      createdAt: serverTimestamp(),
    }, { merge: true });
    return;
  }

  throw new Error(`Unsupported sync table: ${tableName}`);
}

async function pushWorkout(rowId, operation, payload, userId) {
  const ref = doc(db, 'users', userId, 'workouts', rowId);

  if (operation === 'delete') {
    await updateDoc(ref, {
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return;
  }

  await setDoc(ref, {
    userId,
    name: payload.name,
    startedAt: payload.startedAt,
    finishedAt: payload.finishedAt,
    notes: payload.notes ?? null,
    deletedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    exercises: (payload.exercises ?? []).map((ex, i) => ({
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
  }, { merge: true });
}

async function pushTemplate(rowId, operation, payload, userId) {
  const ref = doc(db, 'users', userId, 'templates', rowId);

  if (operation === 'delete') {
    await updateDoc(ref, {
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return;
  }

  await setDoc(ref, {
    name: payload.name,
    tag: payload.tag ?? '',
    exerciseIds: payload.exerciseIds ?? [],
    deletedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
