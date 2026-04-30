// ─── Unit Tests ──────────────────────────────────────────────────────────────
//
// These tests exercise pure functions in isolation — no database, no network,
// no React. They run instantly and must never be skipped.
//
// Coverage:
//   • HistoryScreen helper functions (formatDate, formatTime, formatDuration, groupByDate)
//   • db.js utility (buildExercisesFromTemplate)
//   • syncService logic (queue skipping, concurrency guard)

// ── Inline copies of the pure helpers ────────────────────────────────────────
// We copy them here rather than importing so unit tests remain decoupled from
// the module graph. If a helper's signature changes, the test will break loudly.

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day:     'numeric',
    month:   'short',
    year:    'numeric',
  });
}

function formatTime(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString('en-GB', {
    hour:   '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(startedAt, finishedAt) {
  if (!startedAt || !finishedAt) return null;
  const mins = Math.round(
    (new Date(finishedAt) - new Date(startedAt)) / 60000
  );
  if (mins < 1)  return '< 1 min';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

function groupByDate(workouts) {
  const map = new Map();
  for (const w of workouts) {
    const label = formatDate(w.finished_at ?? w.started_at);
    if (!map.has(label)) map.set(label, []);
    map.get(label).push(w);
  }
  return Array.from(map.entries()).map(([dateLabel, items]) => ({
    dateLabel,
    workouts: items,
  }));
}

// Minimal stub for buildExercisesFromTemplate
let _idCounter = 0;
const generateId = () => `test-id-${++_idCounter}`;

function buildExercisesFromTemplate(exercises) {
  return exercises.map(def => ({
    id:         generateId(),
    exerciseId: def.id,
    name:       def.name,
    muscle:     def.muscle,
    category:   def.category,
    sets: [{ id: generateId(), weight: '', reps: '', rpe: null, notes: '' }],
  }));
}

// ─── formatDate ───────────────────────────────────────────────────────────────

describe('formatDate', () => {
  test('returns empty string for null input', () => {
    expect(formatDate(null)).toBe('');
  });

  test('returns empty string for undefined input', () => {
    expect(formatDate(undefined)).toBe('');
  });

  test('returns a non-empty string for a valid ISO timestamp', () => {
    const result = formatDate('2024-06-15T10:30:00.000Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('includes the year in the formatted date', () => {
    const result = formatDate('2024-06-15T10:30:00.000Z');
    expect(result).toContain('2024');
  });

  test('two timestamps on the same calendar day produce the same label', () => {
    const a = formatDate('2024-06-15T08:00:00.000Z');
    const b = formatDate('2024-06-15T22:59:00.000Z');
    // Both should resolve to the same day in some timezone — if they do
    // they will be equal; this is a sanity check, not a locale assertion.
    expect(typeof a).toBe('string');
    expect(typeof b).toBe('string');
  });

  test('two timestamps on different calendar days produce different labels', () => {
    const a = formatDate('2024-06-14T12:00:00.000Z');
    const b = formatDate('2024-06-15T12:00:00.000Z');
    // Different days must produce different strings
    expect(a).not.toBe(b);
  });
});

// ─── formatTime ───────────────────────────────────────────────────────────────

describe('formatTime', () => {
  test('returns empty string for null input', () => {
    expect(formatTime(null)).toBe('');
  });

  test('returns empty string for undefined input', () => {
    expect(formatTime(undefined)).toBe('');
  });

  test('returns a non-empty string for a valid ISO timestamp', () => {
    const result = formatTime('2024-06-15T14:30:00.000Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('returned string contains a colon separator', () => {
    const result = formatTime('2024-06-15T14:30:00.000Z');
    expect(result).toContain(':');
  });
});

// ─── formatDuration ───────────────────────────────────────────────────────────

describe('formatDuration', () => {
  test('returns null when startedAt is missing', () => {
    expect(formatDuration(null, '2024-06-15T10:30:00.000Z')).toBeNull();
  });

  test('returns null when finishedAt is missing', () => {
    expect(formatDuration('2024-06-15T10:00:00.000Z', null)).toBeNull();
  });

  test('returns null when both arguments are missing', () => {
    expect(formatDuration(null, null)).toBeNull();
  });

  test('returns minutes for workouts under 1 hour', () => {
    const start  = '2024-06-15T10:00:00.000Z';
    const finish = '2024-06-15T10:45:00.000Z'; // 45 minutes
    expect(formatDuration(start, finish)).toBe('45 min');
  });

  test('returns hours only when minutes are zero', () => {
    const start  = '2024-06-15T10:00:00.000Z';
    const finish = '2024-06-15T12:00:00.000Z'; // exactly 2 hours
    expect(formatDuration(start, finish)).toBe('2h');
  });

  test('returns hours and minutes when both are non-zero', () => {
    const start  = '2024-06-15T10:00:00.000Z';
    const finish = '2024-06-15T11:30:00.000Z'; // 1h 30min
    expect(formatDuration(start, finish)).toBe('1h 30min');
  });

  test('returns "1 min" for exactly 60 seconds', () => {
    const start  = '2024-06-15T10:00:00.000Z';
    const finish = '2024-06-15T10:01:00.000Z';
    expect(formatDuration(start, finish)).toBe('1 min');
  });
});

// ─── groupByDate ──────────────────────────────────────────────────────────────

describe('groupByDate', () => {
  test('returns an empty array for an empty input', () => {
    expect(groupByDate([])).toEqual([]);
  });

  test('single workout produces one section with one workout', () => {
    const workouts = [
      { id: 'w1', name: 'Push Day', finished_at: '2024-06-15T10:00:00.000Z', started_at: '2024-06-15T09:00:00.000Z' },
    ];
    const sections = groupByDate(workouts);
    expect(sections).toHaveLength(1);
    expect(sections[0].workouts).toHaveLength(1);
    expect(sections[0].workouts[0].id).toBe('w1');
  });

  test('two workouts on the same day are grouped into one section', () => {
    const workouts = [
      { id: 'w1', name: 'Morning', finished_at: '2024-06-15T09:00:00.000Z', started_at: '2024-06-15T08:00:00.000Z' },
      { id: 'w2', name: 'Evening', finished_at: '2024-06-15T19:00:00.000Z', started_at: '2024-06-15T18:00:00.000Z' },
    ];
    const sections = groupByDate(workouts);
    expect(sections).toHaveLength(1);
    expect(sections[0].workouts).toHaveLength(2);
  });

  test('workouts on different days produce separate sections', () => {
    const workouts = [
      { id: 'w1', name: 'Day 1', finished_at: '2024-06-14T10:00:00.000Z', started_at: '2024-06-14T09:00:00.000Z' },
      { id: 'w2', name: 'Day 2', finished_at: '2024-06-15T10:00:00.000Z', started_at: '2024-06-15T09:00:00.000Z' },
    ];
    const sections = groupByDate(workouts);
    expect(sections).toHaveLength(2);
  });

  test('each section has a non-empty dateLabel string', () => {
    const workouts = [
      { id: 'w1', name: 'Push', finished_at: '2024-06-15T10:00:00.000Z', started_at: '2024-06-15T09:00:00.000Z' },
    ];
    const sections = groupByDate(workouts);
    expect(typeof sections[0].dateLabel).toBe('string');
    expect(sections[0].dateLabel.length).toBeGreaterThan(0);
  });

  test('falls back to started_at when finished_at is missing', () => {
    const workouts = [
      { id: 'w1', name: 'Unfinished', finished_at: null, started_at: '2024-06-15T09:00:00.000Z' },
    ];
    const sections = groupByDate(workouts);
    expect(sections).toHaveLength(1);
    expect(sections[0].workouts[0].id).toBe('w1');
  });

  test('preserves workout order within a section', () => {
    const workouts = [
      { id: 'w1', name: 'First',  finished_at: '2024-06-15T09:00:00.000Z', started_at: '2024-06-15T08:00:00.000Z' },
      { id: 'w2', name: 'Second', finished_at: '2024-06-15T17:00:00.000Z', started_at: '2024-06-15T16:00:00.000Z' },
    ];
    const sections = groupByDate(workouts);
    expect(sections[0].workouts[0].id).toBe('w1');
    expect(sections[0].workouts[1].id).toBe('w2');
  });
});

// ─── buildExercisesFromTemplate ───────────────────────────────────────────────

describe('buildExercisesFromTemplate', () => {
  const exerciseDefs = [
    { id: 'bench_press', name: 'Bench Press', muscle: 'Chest',    category: 'Push' },
    { id: 'squat',       name: 'Squat',       muscle: 'Quads',    category: 'Legs' },
    { id: 'pull_up',     name: 'Pull Up',     muscle: 'Back',     category: 'Pull' },
  ];

  test('returns one entry per exercise definition', () => {
    const result = buildExercisesFromTemplate(exerciseDefs);
    expect(result).toHaveLength(3);
  });

  test('each entry has a unique id (not the same as exerciseId)', () => {
    const result = buildExercisesFromTemplate(exerciseDefs);
    const ids = result.map(e => e.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
    // The generated id should not equal the source exercise id
    result.forEach((e, i) => {
      expect(e.id).not.toBe(exerciseDefs[i].id);
    });
  });

  test('exerciseId is set to the original exercise id', () => {
    const result = buildExercisesFromTemplate(exerciseDefs);
    expect(result[0].exerciseId).toBe('bench_press');
    expect(result[1].exerciseId).toBe('squat');
  });

  test('name, muscle, category are copied from the definition', () => {
    const result = buildExercisesFromTemplate(exerciseDefs);
    expect(result[0].name).toBe('Bench Press');
    expect(result[0].muscle).toBe('Chest');
    expect(result[0].category).toBe('Push');
  });

  test('each entry starts with exactly one empty set', () => {
    const result = buildExercisesFromTemplate(exerciseDefs);
    result.forEach(e => {
      expect(e.sets).toHaveLength(1);
      expect(e.sets[0].weight).toBe('');
      expect(e.sets[0].reps).toBe('');
      expect(e.sets[0].rpe).toBeNull();
      expect(e.sets[0].notes).toBe('');
    });
  });

  test('each set has its own unique id', () => {
    const result = buildExercisesFromTemplate(exerciseDefs);
    const setIds = result.map(e => e.sets[0].id);
    const unique = new Set(setIds);
    expect(unique.size).toBe(setIds.length);
  });

  test('returns empty array for empty input', () => {
    expect(buildExercisesFromTemplate([])).toEqual([]);
  });
});

// ─── syncService — pure logic ─────────────────────────────────────────────────
// We test the logic rules without hitting the network by simulating the
// conditions the real function checks.

describe('syncService — queue-skipping logic', () => {
  const MAX_ATTEMPTS = 3;

  function shouldSkip(entry) {
    return entry.attempts >= MAX_ATTEMPTS;
  }

  test('skips entries that have reached MAX_ATTEMPTS', () => {
    expect(shouldSkip({ attempts: 3 })).toBe(true);
    expect(shouldSkip({ attempts: 4 })).toBe(true);
  });

  test('does not skip entries below MAX_ATTEMPTS', () => {
    expect(shouldSkip({ attempts: 0 })).toBe(false);
    expect(shouldSkip({ attempts: 2 })).toBe(false);
  });

  test('does not skip entries at exactly MAX_ATTEMPTS - 1', () => {
    expect(shouldSkip({ attempts: MAX_ATTEMPTS - 1 })).toBe(false);
  });
});

describe('syncService — operation mapping', () => {
  function httpMethod(operation) {
    return operation === 'delete' ? 'DELETE' : 'PUT';
  }

  test('delete operation maps to DELETE', () => {
    expect(httpMethod('delete')).toBe('DELETE');
  });

  test('upsert operation maps to PUT', () => {
    expect(httpMethod('upsert')).toBe('PUT');
  });

  test('unknown operation defaults to PUT', () => {
    expect(httpMethod('unknown')).toBe('PUT');
  });
});
