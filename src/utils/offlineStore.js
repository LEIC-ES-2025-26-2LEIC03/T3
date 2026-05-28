import AsyncStorage from '@react-native-async-storage/async-storage';

const key = (userId, name) => `offline:${userId}:${name}`;
const queueKey = (userId) => key(userId, 'queue');

async function readJson(storageKey, fallback) {
  const raw = await AsyncStorage.getItem(storageKey);
  return raw ? JSON.parse(raw) : fallback;
}

async function writeJson(storageKey, value) {
  await AsyncStorage.setItem(storageKey, JSON.stringify(value));
}

export async function enqueueOfflineOp(userId, tableName, rowId, operation, payload = null) {
  const queue = await readJson(queueKey(userId), []);
  queue.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    tableName,
    rowId,
    operation,
    payload,
    attempts: 0,
    createdAt: new Date().toISOString(),
  });
  await writeJson(queueKey(userId), queue);
}

export async function getPendingOfflineOps(userId, maxAttempts = 5) {
  const queue = await readJson(queueKey(userId), []);
  return queue.filter(entry => (entry.attempts ?? 0) < maxAttempts);
}

export async function markOfflineOpSynced(userId, opId) {
  const queue = await readJson(queueKey(userId), []);
  await writeJson(queueKey(userId), queue.filter(entry => entry.id !== opId));
}

export async function markOfflineOpFailed(userId, opId, errorMessage) {
  const queue = await readJson(queueKey(userId), []);
  await writeJson(
    queueKey(userId),
    queue.map(entry => (
      entry.id === opId
        ? { ...entry, attempts: (entry.attempts ?? 0) + 1, lastError: errorMessage }
        : entry
    ))
  );
}

export async function getLocalProfile(userId) {
  return readJson(key(userId, 'profile'), null);
}

export async function saveLocalProfile(userId, fields, shouldEnqueue = true) {
  const current = await getLocalProfile(userId);
  const next = {
    ...(current ?? { user_id: userId }),
    ...fields,
    user_id: userId,
    updatedAt: new Date().toISOString(),
  };
  await writeJson(key(userId, 'profile'), next);
  if (shouldEnqueue) {
    await enqueueOfflineOp(userId, 'profiles', userId, 'upsert', next);
  }
  return next;
}

export async function fetchLocalFavourites(userId) {
  const favourites = await readJson(key(userId, 'favourites'), {});
  return new Set(Object.keys(favourites));
}

export async function toggleLocalFavourite(userId, exercise) {
  const favourites = await readJson(key(userId, 'favourites'), {});
  const isFavourite = Boolean(favourites[exercise.id]);

  if (isFavourite) {
    delete favourites[exercise.id];
    await writeJson(key(userId, 'favourites'), favourites);
    await enqueueOfflineOp(userId, 'favourites', exercise.id, 'delete', null);
    return false;
  }

  const stored = {
    exerciseId: exercise.id,
    name: exercise.name,
    muscle: exercise.muscle,
    category: exercise.category,
  };
  favourites[exercise.id] = stored;
  await writeJson(key(userId, 'favourites'), favourites);
  await enqueueOfflineOp(userId, 'favourites', exercise.id, 'upsert', stored);
  return true;
}

export async function applyRemoteFavourites(userId, exerciseIds) {
  const favourites = {};
  for (const id of exerciseIds) {
    favourites[id] = { exerciseId: id };
  }
  await writeJson(key(userId, 'favourites'), favourites);
}

export async function fetchLocalCustomExercises(userId) {
  const exercises = await readJson(key(userId, 'customExercises'), {});
  return Object.values(exercises);
}

export async function createLocalCustomExercise(userId, id, name, muscle) {
  const exercises = await readJson(key(userId, 'customExercises'), {});
  const exercise = {
    id,
    name: name.trim(),
    muscle: muscle.trim(),
    category: muscle.trim(),
    isCustom: true,
  };
  exercises[id] = exercise;
  await writeJson(key(userId, 'customExercises'), exercises);
  await enqueueOfflineOp(userId, 'custom_exercises', id, 'upsert', exercise);
  return exercise;
}

export async function deleteLocalCustomExercise(userId, exerciseId) {
  const exercises = await readJson(key(userId, 'customExercises'), {});
  delete exercises[exerciseId];
  await writeJson(key(userId, 'customExercises'), exercises);
  await enqueueOfflineOp(userId, 'custom_exercises', exerciseId, 'delete', null);
}

export async function applyRemoteCustomExercises(userId, exercises) {
  const byId = {};
  for (const exercise of exercises) byId[exercise.id] = exercise;
  await writeJson(key(userId, 'customExercises'), byId);
}

export async function addLocalBodyMetric(userId, metric) {
  const history = await readJson(key(userId, 'bodyMetrics'), []);
  const recordedAt = metric.recordedAt ?? new Date().toISOString();
  const record = {
    id: metric.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    weightKg: metric.weightKg ?? null,
    bodyFatPercentage: metric.bodyFatPercentage ?? null,
    recordedAt,
    date: recordedAt,
  };
  const next = [record, ...history].sort((a, b) => String(b.recordedAt).localeCompare(String(a.recordedAt)));
  await writeJson(key(userId, 'bodyMetrics'), next);
  await enqueueOfflineOp(userId, 'body_metrics', record.id, 'upsert', record);
  return record;
}

export async function fetchLocalBodyMetrics(userId) {
  return readJson(key(userId, 'bodyMetrics'), []);
}

export async function applyRemoteBodyMetrics(userId, records) {
  await writeJson(key(userId, 'bodyMetrics'), records);
}
