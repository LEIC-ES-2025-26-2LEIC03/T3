import { generateId } from '../utils/id';
import { EXERCISES } from './exercises';

export const TEMPLATES = [
  {
    id: 'push_a',
    name: 'Push Day',
    tag: 'Push',
    exercises: ['bench_press', 'incline_bench_press', 'overhead_press_standing', 'standing_dumbbell_lateral_raise', 'tricep_pushdown_rope', 'dips'],
  },
  {
    id: 'pull_a',
    name: 'Pull Day',
    tag: 'Pull',
    exercises: ['deadlift', 'barbell_row', 'wide_grip_pull_up', 'wide_grip_lat_pulldown', 'barbell_curl'],
  },
  {
    id: 'legs',
    name: 'Leg Day',
    tag: 'Legs',
    exercises: ['back_squat', 'forty_five_degree_leg_press', 'romanian_deadlift', 'seated_leg_curl', 'standing_calf_raise'],
  },
  {
    id: 'upper',
    name: 'Upper Body',
    tag: 'Full Upper',
    exercises: ['bench_press', 'barbell_row', 'overhead_press_standing', 'wide_grip_pull_up', 'standing_dumbbell_lateral_raise', 'barbell_curl', 'tricep_pushdown_rope'],
  },
  {
    id: 'full_body',
    name: 'Full Body',
    tag: 'Full Body',
    exercises: ['back_squat', 'bench_press', 'barbell_row', 'overhead_press_standing', 'romanian_deadlift', 'dragon_flag'],
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
