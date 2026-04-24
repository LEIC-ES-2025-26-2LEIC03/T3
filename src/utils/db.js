import * as SQLite from 'expo-sqlite';
import { EXERCISES } from '../data/exercises';
import { generateId } from './id';

let _db = null;

export async function getDb() {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('w8.db');
  await migrate(_db);
  return _db;
}

// ─── Migrations ────────────────────────────────────────────────────────────

async function migrate(db) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    `);

  // Version tracker — allows safe incremental schema changes on existing devices
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY
    );
  `);

  const row = await db.getFirstAsync(`SELECT MAX(version) as v FROM _migrations`);
  const currentVersion = row?.v ?? 0;

  if (currentVersion < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS exercises (
        id        TEXT PRIMARY KEY,
        name      TEXT NOT NULL,
        category  TEXT NOT NULL,
        muscle    TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS templates (
        id         TEXT PRIMARY KEY,
        name       TEXT NOT NULL,
        tag        TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS template_exercises (
        id          TEXT PRIMARY KEY,
        template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL REFERENCES exercises(id),
        position    INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS workouts (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        started_at  TEXT NOT NULL,
        finished_at TEXT
      );

      CREATE TABLE IF NOT EXISTS workout_exercises (
        id          TEXT PRIMARY KEY,
        workout_id  TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL,
        name        TEXT NOT NULL,
        muscle      TEXT NOT NULL,
        category    TEXT NOT NULL,
        position    INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS workout_sets (
        id                  TEXT PRIMARY KEY,
        workout_exercise_id TEXT NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
        weight              REAL NOT NULL DEFAULT 0,
        reps                INTEGER NOT NULL DEFAULT 0,
        position            INTEGER NOT NULL DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_template_exercises_template_id
      ON template_exercises(template_id);

      CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id
      ON workout_exercises(workout_exercise_id);

      CREATE INDEX IF NOT EXISTS idx_workout_sets_workout_exercise_id
      ON workout_sets(workout_exercise_set_id); 
    `);

    // Seed exercises table (ignore conflicts — idempotent)
    await db.withTransactionAsync(async () => {
      for (const ex of EXERCISES) {
        await db.runAsync(
          `INSERT OR IGNORE INTO exercises (id, name, category, muscle) VALUES (?, ?, ?, ?)`,
          [ex.id, ex.name, ex.category, ex.muscle]
        );
      }
    });

    await db.runAsync(`INSERT INTO _migrations (version) VALUES (1)`);
  }

  // Future migrations go here, e.g.:
  // if (currentVersion < 2) {
  //   await db.execAsync(`ALTER TABLE workouts ADD COLUMN notes TEXT`);
  //   await db.runAsync(`INSERT INTO _migrations (version) VALUES (2)`);
  // }
}

// ─── Template helpers ───────────────────────────────────────────────────────

/** Returns all templates with their exercise list */
export async function fetchTemplates() {
  const db = await getDb();

  const templates = await db.getAllAsync(
    `SELECT * FROM templates ORDER BY created_at DESC`
  );

  for (const t of templates) {
    const rows = await db.getAllAsync(
      `SELECT e.id, e.name, e.category, e.muscle
       FROM template_exercises te
       JOIN exercises e ON e.id = te.exercise_id
       WHERE te.template_id = ?
       ORDER BY te.position`,
      [t.id]
    );
    t.exercises = rows;         // full exercise objects
    t.exerciseIds = rows.map(r => r.id);
  }

  return templates;
}

/** Creates a new template. exerciseIds is string[] */
export async function createTemplate(id, name, tag, exerciseIds) {
  const db = await getDb();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO templates (id, name, tag, created_at) VALUES (?, ?, ?, ?)`,
      [id, name.trim(), tag.trim(), new Date().toISOString()]
    );

    for (let i = 0; i < exerciseIds.length; i++) {
      await db.runAsync(
        `INSERT INTO template_exercises (id, template_id, exercise_id, position)
         VALUES (?, ?, ?, ?)`,
        [generateId(), id, exerciseIds[i], i]
      );
    }
  });
}

/** Updates template name/tag and replaces its exercise list */
export async function updateTemplate(id, name, tag, exerciseIds) {
  const db = await getDb();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE templates SET name = ?, tag = ? WHERE id = ?`,
      [name.trim(), tag.trim(), id]
    );

    await db.runAsync(
      `DELETE FROM template_exercises WHERE template_id = ?`,
      [id]
    );

    for (let i = 0; i < exerciseIds.length; i++) {
      await db.runAsync(
        `INSERT INTO template_exercises (id, template_id, exercise_id, position)
         VALUES (?, ?, ?, ?)`,
        [generateId(), id, exerciseIds[i], i]
      );
    }
  });
}

/** Deletes a template (cascade removes template_exercises) */
export async function deleteTemplate(id) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM templates WHERE id = ?`, [id]);
}

// ─── Workout helpers ────────────────────────────────────────────────────────

export async function saveWorkout(workout) {
  const db = await getDb();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO workouts (id, name, started_at, finished_at)
       VALUES (?, ?, ?, ?)`,
      [workout.id, workout.name, workout.startedAt, workout.finishedAt]
    );

    for (let i = 0; i < workout.exercises.length; i++) {
      const ex = workout.exercises[i];
      const wexId = generateId();

      await db.runAsync(
        `INSERT INTO workout_exercises (id, workout_id, exercise_id, name, muscle, category, position)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [wexId, workout.id, ex.exerciseId, ex.name, ex.muscle, ex.category, i]
      );

      for (let j = 0; j < ex.sets.length; j++) {
        const s = ex.sets[j];
        await db.runAsync(
          `INSERT INTO workout_sets (id, workout_exercise_id, weight, reps, position)
           VALUES (?, ?, ?, ?, ?)`,
          [generateId(), wexId, s.weight, s.reps, j]
        );
      }
    }
  });
}

export async function fetchWorkouts() {
  const db = await getDb();

  const workouts = await db.getAllAsync(
    `SELECT * FROM workouts ORDER BY finished_at DESC`
  );

  for (const w of workouts) {
    const wexRows = await db.getAllAsync(
      `SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY position`,
      [w.id]
    );

    w.exercises = await Promise.all(
      wexRows.map(async (wex) => {
        const sets = await db.getAllAsync(
          `SELECT weight, reps FROM workout_sets
           WHERE workout_exercise_id = ? ORDER BY position`,
          [wex.id]
        );
        return { ...wex, sets };
      })
    );
  }

  return workouts;
}

export function buildExercisesFromTemplate(exercises) {
  return exercises.map(def => ({
    id: generateId(),
    exerciseId: def.id,
    name: def.name,
    muscle: def.muscle,
    category: def.category,
    sets: [{ id: generateId(), weight: '', reps: '' }],
  }));
}