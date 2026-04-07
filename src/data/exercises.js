export const EXERCISES = [
  // Push
  { id: 'bench_press', name: 'Bench Press', category: 'Push', muscle: 'Chest' },
  { id: 'incline_bench', name: 'Incline Bench Press', category: 'Push', muscle: 'Chest' },
  { id: 'overhead_press', name: 'Overhead Press', category: 'Push', muscle: 'Shoulders' },
  { id: 'lateral_raise', name: 'Lateral Raise', category: 'Push', muscle: 'Shoulders' },
  { id: 'tricep_pushdown', name: 'Tricep Pushdown', category: 'Push', muscle: 'Triceps' },
  { id: 'dips', name: 'Dips', category: 'Push', muscle: 'Triceps' },

  // Pull
  { id: 'deadlift', name: 'Deadlift', category: 'Pull', muscle: 'Back' },
  { id: 'barbell_row', name: 'Barbell Row', category: 'Pull', muscle: 'Back' },
  { id: 'pull_up', name: 'Pull Up', category: 'Pull', muscle: 'Back' },
  { id: 'lat_pulldown', name: 'Lat Pulldown', category: 'Pull', muscle: 'Back' },
  { id: 'bicep_curl', name: 'Bicep Curl', category: 'Pull', muscle: 'Biceps' },
  { id: 'hammer_curl', name: 'Hammer Curl', category: 'Pull', muscle: 'Biceps' },

  // Legs
  { id: 'squat', name: 'Squat', category: 'Legs', muscle: 'Quads' },
  { id: 'leg_press', name: 'Leg Press', category: 'Legs', muscle: 'Quads' },
  { id: 'romanian_deadlift', name: 'Romanian Deadlift', category: 'Legs', muscle: 'Hamstrings' },
  { id: 'leg_curl', name: 'Leg Curl', category: 'Legs', muscle: 'Hamstrings' },
  { id: 'calf_raise', name: 'Calf Raise', category: 'Legs', muscle: 'Calves' },

  // Core
  { id: 'plank', name: 'Plank', category: 'Core', muscle: 'Core' },
  { id: 'crunch', name: 'Crunch', category: 'Core', muscle: 'Core' },
  { id: 'leg_raise', name: 'Leg Raise', category: 'Core', muscle: 'Core' },
];

export const CATEGORIES = [...new Set(EXERCISES.map(e => e.category))];
