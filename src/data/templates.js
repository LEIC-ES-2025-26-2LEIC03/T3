import { generateId } from '../utils/id';
import { EXERCISES } from './exercises';

export const TEMPLATES = [
  {
    id: 'push_a',
    name: 'Push Day',
    tag: 'Push',
    exercises: ['bench_press', 'incline_bench', 'overhead_press', 'lateral_raise', 'tricep_pushdown', 'dips'],
  },
  {
    id: 'pull_a',
    name: 'Pull Day',
    tag: 'Pull',
    exercises: ['deadlift', 'barbell_row', 'pull_up', 'lat_pulldown', 'bicep_curl'],
  },
  {
    id: 'legs',
    name: 'Leg Day',
    tag: 'Legs',
    exercises: ['squat', 'leg_press', 'romanian_deadlift', 'leg_curl', 'calf_raise'],
  },
  {
    id: 'upper',
    name: 'Upper Body',
    tag: 'Full Upper',
    exercises: ['bench_press', 'barbell_row', 'overhead_press', 'pull_up', 'lateral_raise', 'bicep_curl', 'tricep_pushdown'],
  },
  {
    id: 'full_body',
    name: 'Full Body',
    tag: 'Full Body',
    exercises: ['squat', 'bench_press', 'barbell_row', 'overhead_press', 'romanian_deadlift', 'plank'],
  },
];

export function buildExercisesFromTemplate(templateExerciseIds) {
  return templateExerciseIds
    .map(exId => {
      const def = EXERCISES.find(e => e.id === exId);
      if (!def) return null;
      return {
        id: generateId(),
        exerciseId: def.id,
        name: def.name,
        muscle: def.muscle,
        category: def.category,
        sets: [{ id: generateId(), weight: '', reps: '' }],
      };
    })
    .filter(Boolean);
}

export function getMuscleLabel(exerciseIds) {
  const muscles = [...new Set(
    exerciseIds
      .map(id => EXERCISES.find(e => e.id === id)?.muscle)
      .filter(Boolean)
  )];
  return muscles.slice(0, 3).join(', ');
}
