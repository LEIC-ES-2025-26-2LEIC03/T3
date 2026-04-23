import React from 'react-native';
import {
  render,
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react-native';
import '@testing-library/react-native/extend-expect';

import ExerciseLibraryScreen from '../screens/ExerciseLibraryScreen';
import ExerciseDetailScreen from '../screens/ExerciseDetailScreen';

const mockExercises = [
  {
    id: 'ex1',
    name: 'Push-Up',
    category: 'Upper Body',
    muscleGroup: 'Chest',
    secondaryMuscles: ['Triceps', 'Shoulders', 'Core'],
    equipment: 'Bodyweight',
    type: 'Strength',
    description: 'A classic upper-body pushing movement.',
    steps: [
      'Start in plank position',
      'Lower body until chest is near the floor',
      'Push back up explosively',
      'Keep body straight throughout',
    ],
    formTips: "Don't sag hips!",
    suggestedSets: 3,
    suggestedReps: '10–15',
    imageUrl: 'https://example.com/pushup.gif',
  },
  {
    id: 'ex2',
    name: 'Squat',
    category: 'Legs',
    muscleGroup: 'Quadriceps',
    secondaryMuscles: ['Glutes', 'Hamstrings'],
    equipment: 'Bodyweight',
    type: 'Strength',
    description: 'A fundamental lower-body movement.',
    steps: [
      'Stand with feet shoulder-width apart',
      'Lower hips until thighs are parallel to floor',
      'Drive through heels to stand',
    ],
    formTips: 'Keep knees tracking over toes.',
    suggestedSets: 3,
    suggestedReps: '12',
    imageUrl: 'https://example.com/squat.gif',
  },
  {
    id: 'ex3',
    name: 'Plank',
    category: 'Core',
    muscleGroup: 'Core',
    secondaryMuscles: ['Shoulders', 'Glutes'],
    equipment: 'Bodyweight',
    type: 'Strength',
    description: 'An isometric core-stabilisation hold.',
    steps: [
      'Place forearms on the floor, elbows under shoulders',
      'Extend legs behind you, toes on the floor',
      'Hold a straight line from head to heels',
    ],
    formTips: 'Squeeze glutes and avoid letting hips rise.',
    suggestedSets: 3,
    suggestedReps: '30s',
    imageUrl: 'https://example.com/plank.gif',
  },
  {
    id: 'ex4',
    name: 'Deadlift',
    category: 'Back',
    muscleGroup: 'Hamstrings',
    secondaryMuscles: ['Glutes', 'Lower Back', 'Traps'],
    equipment: 'Barbell',
    type: 'Strength',
    description: 'A compound hip-hinge pulling movement.',
    steps: [
      'Stand with barbell over mid-foot',
      'Hinge at hips, grip barbell just outside legs',
      'Drive floor away, keeping bar close to body',
      'Lock out hips and knees at the top',
    ],
    formTips: 'Keep a neutral spine throughout.',
    suggestedSets: 4,
    suggestedReps: '5',
    imageUrl: 'https://example.com/deadlift.gif',
  },
  {
    id: 'ex5',
    name: 'Pull-Up',
    category: 'Back',
    muscleGroup: 'Latissimus Dorsi',
    secondaryMuscles: ['Biceps', 'Rear Deltoids'],
    equipment: 'Bodyweight',
    type: 'Strength',
    description: 'An upper-body pulling movement using a bar.',
    steps: [
      'Hang from a bar with an overhand grip',
      'Pull chest towards the bar',
      'Lower under control',
    ],
    formTips: 'Avoid swinging — use strict form.',
    suggestedSets: 3,
    suggestedReps: '6–10',
    imageUrl: 'https://example.com/pullup.gif',
  },
  {
    id: 'ex6',
    name: 'Lunges',
    category: 'Legs',
    muscleGroup: 'Quadriceps',
    secondaryMuscles: ['Glutes', 'Hamstrings'],
    equipment: 'Bodyweight',
    type: 'Strength',
    description: 'A unilateral lower-body movement.',
    steps: [
      'Stand upright, feet together',
      'Step forward and lower back knee toward floor',
      'Push off front foot to return',
    ],
    formTips: 'Keep torso upright — avoid leaning forward.',
    suggestedSets: 3,
    suggestedReps: '10 each leg',
    imageUrl: 'https://example.com/lunges.gif',
  },
];

jest.mock('../services/exerciseService', () => ({
  fetchExercises: jest.fn(() => Promise.resolve(mockExercises)),
  fetchExerciseById: jest.fn(id =>
    Promise.resolve(mockExercises.find(e => e.id === id) ?? null)
  ),
  searchExercises: jest.fn(query =>
    Promise.resolve(
      mockExercises.filter(e =>
        e.name.toLowerCase().includes(query.toLowerCase())
      )
    )
  ),
}));

jest.mock('../services/workoutService', () => ({
  addExerciseToWorkout: jest.fn(() => Promise.resolve({ success: true })),
  getCurrentWorkout: jest.fn(() =>
    Promise.resolve({ id: 'w1', name: 'My Workout', exercises: [] })
  ),
}));

const renderLibrary = (props = {}) =>
  render(<ExerciseLibraryScreen {...props} />);

const renderDetail = (exerciseId = 'ex1') =>
  render(<ExerciseDetailScreen exerciseId={exerciseId} />);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('User Story 4 — Exercise Library', () => {

  describe('Scenario 1 — Normal Flow', () => {

    describe('Library main view', () => {

      it('AT-4-1A-01: exercise library screen renders on navigation', async () => {
        renderLibrary();

        expect(await screen.findByTestId('exercise-library-screen')).toBeTruthy();
      });

      it('AT-4-1A-02: a search bar is visible on the library screen', async () => {
        renderLibrary();

        expect(
          await screen.findByPlaceholderText(/search|push up|exercise/i)
        ).toBeTruthy();
      });

      it('AT-4-1A-03: category filter chips are rendered', async () => {
        renderLibrary();

        await screen.findByTestId('exercise-library-screen');

        const expectedCategories = ['All', 'Legs', 'Upper', 'Core', 'Cardio'];
        for (const label of expectedCategories) {
          expect(screen.getByText(label)).toBeTruthy();
        }
      });

      it('AT-4-1A-04: exercises are grouped or listed by category when no filter is active', async () => {
        renderLibrary();

        const categoryHeaders = await screen.findAllByTestId('category-header');
        expect(categoryHeaders.length).toBeGreaterThanOrEqual(2);
      });

      it('AT-4-1A-05: each exercise card shows a name and muscle group or category label', async () => {
        renderLibrary();

        const cards = await screen.findAllByTestId('exercise-card');
        expect(cards.length).toBeGreaterThanOrEqual(3);

        const first = cards[0];
        expect(first).toHaveTextContent(/.+/); // name present
        expect(screen.getAllByTestId('exercise-card-category').length).toBeGreaterThanOrEqual(1);
      });

      it('AT-4-1A-06: a "Show More" or pagination control is present', async () => {
        renderLibrary();

        await screen.findAllByTestId('exercise-card');

        const showMore = screen.queryByText(/show more/i);
        const loadMore = screen.queryByTestId('load-more-button');
        expect(showMore ?? loadMore).toBeTruthy();
      });

    });

    describe('Search', () => {

      it('AT-4-1A-07: searching "push-up" returns relevant results', async () => {
        renderLibrary();

        fireEvent.changeText(
          await screen.findByPlaceholderText(/search|push up|exercise/i),
          'push-up'
        );

        expect(await screen.findByText('Push-Up')).toBeTruthy();
      });

      it('AT-4-1A-08: search results show thumbnails or preview images', async () => {
        renderLibrary();

        fireEvent.changeText(
          await screen.findByPlaceholderText(/search|push up|exercise/i),
          'squat'
        );

        await screen.findByText('Squat');

        expect(screen.getAllByTestId('exercise-card-image').length).toBeGreaterThanOrEqual(1);
      });

      it('AT-4-1A-09: searching "squat" does not show unrelated exercises', async () => {
        renderLibrary();

        fireEvent.changeText(
          await screen.findByPlaceholderText(/search|push up|exercise/i),
          'squat'
        );

        await screen.findByText('Squat');

        expect(screen.queryByText('Push-Up')).toBeNull();
        expect(screen.queryByText('Plank')).toBeNull();
      });

      it('AT-4-1A-10: clearing the search input restores the full exercise list', async () => {
        renderLibrary();

        const searchBar = await screen.findByPlaceholderText(/search|push up|exercise/i);
        fireEvent.changeText(searchBar, 'squat');
        await screen.findByText('Squat');

        fireEvent.changeText(searchBar, '');

        const cards = await screen.findAllByTestId('exercise-card');
        expect(cards.length).toBeGreaterThanOrEqual(mockExercises.length);
      });

    });

    describe('Category filter', () => {

      it('AT-4-1A-11: tapping "Legs" filter shows only leg exercises', async () => {
        renderLibrary();

        fireEvent.press(await screen.findByText('Legs'));

        const cards = await screen.findAllByTestId('exercise-card');
        for (const card of cards) {
          expect(card).toHaveTextContent(/legs|quadriceps|hamstrings|glutes/i);
        }
      });

      it('AT-4-1A-12: tapping "All" after a filter resets to the full list', async () => {
        renderLibrary();

        fireEvent.press(await screen.findByText('Legs'));
        await screen.findAllByTestId('exercise-card');

        fireEvent.press(screen.getByText('All'));

        const cards = await screen.findAllByTestId('exercise-card');
        expect(cards.length).toBeGreaterThanOrEqual(mockExercises.length);
      });

      it('AT-4-1A-13: tapping "Bodyweight" equipment filter shows only bodyweight exercises', async () => {
        renderLibrary();

        fireEvent.press(await screen.findByText('Bodyweight'));

        const cards = await screen.findAllByTestId('exercise-card');
        for (const card of cards) {
          expect(card).toHaveTextContent(/bodyweight/i);
        }
      });

    });

    describe('Exercise detail', () => {

      it('AT-4-1A-14: tapping an exercise card navigates to its detail screen', async () => {
        renderLibrary();

        fireEvent.press(await screen.findByText('Push-Up'));

        expect(await screen.findByTestId('exercise-detail-screen')).toBeTruthy();
      });

      it('AT-4-1A-15: detail screen shows step-by-step instructions', async () => {
        renderDetail('ex1');

        expect(await screen.findByText(/start in plank position/i)).toBeTruthy();
        expect(screen.getByText(/lower body until chest/i)).toBeTruthy();
        expect(screen.getByText(/push back up/i)).toBeTruthy();
      });

      it('AT-4-1A-16: detail screen shows primary and secondary muscles', async () => {
        renderDetail('ex1');

        expect(await screen.findByTestId('primary-muscles')).toHaveTextContent(/chest/i);
        expect(screen.getByTestId('secondary-muscles')).toHaveTextContent(/triceps|shoulders/i);
      });

      it('AT-4-1A-17: detail screen shows suggested sets and reps', async () => {
        renderDetail('ex1');

        expect(await screen.findByTestId('suggested-sets-reps')).toHaveTextContent(/3/);
        expect(screen.getByTestId('suggested-sets-reps')).toHaveTextContent(/10/);
      });

      it('AT-4-1A-18: detail screen shows form tips', async () => {
        renderDetail('ex1');

        expect(await screen.findByText(/don't sag hips/i)).toBeTruthy();
      });

      it('AT-4-1A-19: detail screen shows a demo image or gif element', async () => {
        renderDetail('ex1');

        expect(await screen.findByTestId('exercise-demo-media')).toBeTruthy();
      });

      it('AT-4-1A-20: detail screen has an "Add to Workout" button', async () => {
        renderDetail('ex1');

        expect(await screen.findByText(/add to workout/i)).toBeTruthy();
      });

    });

    describe('Add to workout', () => {

      it('AT-4-1A-21: tapping "Add to Workout" shows a selection prompt for current or new workout', async () => {
        renderDetail('ex1');

        fireEvent.press(await screen.findByText(/add to workout/i));

        const currentOption = await screen.findByText(/current workout/i);
        const newOption = screen.queryByText(/new workout/i);
        expect(currentOption ?? newOption).toBeTruthy();
      });

      it('AT-4-1A-22: adding to current workout calls the service with the correct exercise id', async () => {
        const { addExerciseToWorkout } = require('../services/workoutService');

        renderDetail('ex1');
        fireEvent.press(await screen.findByText(/add to workout/i));
        fireEvent.press(await screen.findByText(/current workout/i));

        await waitFor(() => {
          expect(addExerciseToWorkout).toHaveBeenCalledWith(
            expect.objectContaining({ exerciseId: 'ex1' })
          );
        });
      });

      it('AT-4-1A-23: a confirmation message is shown after successfully adding the exercise', async () => {
        renderDetail('ex1');

        fireEvent.press(await screen.findByText(/add to workout/i));
        fireEvent.press(await screen.findByText(/current workout/i));

        expect(
          await screen.findByText(/added|exercise added/i)
        ).toBeTruthy();
      });

      it('AT-4-1A-24: the exercise appears in the workout builder with default sets and reps', async () => {
        const { getCurrentWorkout } = require('../services/workoutService');

        getCurrentWorkout.mockResolvedValueOnce({
          id: 'w1',
          name: 'My Workout',
          exercises: [{ exerciseId: 'ex1', sets: 3, reps: '10–15' }],
        });

        renderDetail('ex1');
        fireEvent.press(await screen.findByText(/add to workout/i));
        fireEvent.press(await screen.findByText(/current workout/i));

        await screen.findByText(/added|exercise added/i);

        const workout = await getCurrentWorkout();
        const added = workout.exercises.find(e => e.exerciseId === 'ex1');
        expect(added).toBeDefined();
        expect(added.sets).toBe(3);
      });

    });

  });

  describe('Scenario 2 — Exceptional Flow', () => {

    describe('No search results', () => {

      beforeEach(() => {
        const { searchExercises } = require('../services/exerciseService');
        searchExercises.mockResolvedValueOnce([]);
      });

      it('AT-4-2A-01: searching an obscure term with no results shows an empty state', async () => {
        renderLibrary();

        fireEvent.changeText(
          await screen.findByPlaceholderText(/search|push up|exercise/i),
          'one-arm handstand push-up'
        );

        expect(await screen.findByTestId('search-empty-state')).toBeTruthy();
        expect(screen.queryAllByTestId('exercise-card')).toHaveLength(0);
      });

      it('AT-4-2A-02: the empty state includes a helpful message', async () => {
        renderLibrary();

        fireEvent.changeText(
          await screen.findByPlaceholderText(/search|push up|exercise/i),
          'one-arm handstand push-up'
        );

        expect(
          await screen.findByText(/no exercises found/i)
        ).toBeTruthy();

        expect(
          screen.getByText(/try a different search|browse categories/i)
        ).toBeTruthy();
      });

      it('AT-4-2A-03: the empty state shows popular exercise suggestions', async () => {
        renderLibrary();

        fireEvent.changeText(
          await screen.findByPlaceholderText(/search|push up|exercise/i),
          'one-arm handstand push-up'
        );

        await screen.findByTestId('search-empty-state');

        const suggestions = screen.getAllByTestId('suggestion-item');
        expect(suggestions.length).toBeGreaterThanOrEqual(1);
      });

      it('AT-4-2A-04: tapping a suggestion populates the search and returns results', async () => {
        const { searchExercises } = require('../services/exerciseService');
        searchExercises
          .mockResolvedValueOnce([]) // initial bad search
          .mockResolvedValueOnce(   // after tapping suggestion
            mockExercises.filter(e => e.name.toLowerCase().includes('push'))
          );

        renderLibrary();

        fireEvent.changeText(
          await screen.findByPlaceholderText(/search|push up|exercise/i),
          'one-arm handstand push-up'
        );

        await screen.findByTestId('search-empty-state');
        fireEvent.press(screen.getAllByTestId('suggestion-item')[0]);

        expect(await screen.findAllByTestId('exercise-card')).toBeTruthy();
      });

    });

    describe('Failed media load', () => {

      it('AT-4-2B-01: a broken demo image on the detail screen shows a fallback', async () => {
        renderDetail('ex1');

        await screen.findByTestId('exercise-demo-media');

        const media = screen.getByTestId('exercise-demo-media');
        fireEvent(media, 'onError');

        expect(screen.getByTestId('exercise-demo-fallback')).toBeTruthy();
        expect(screen.queryByTestId('exercise-demo-media')).toBeTruthy(); // screen still mounted
      });

      it('AT-4-2B-02: a broken thumbnail on a library card shows a fallback icon, not a broken layout', async () => {
        renderLibrary();

        const images = await screen.findAllByTestId('exercise-card-image');
        fireEvent(images[0], 'onError');

        expect(screen.getAllByTestId('exercise-card').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByTestId('exercise-card-image-fallback').length).toBeGreaterThanOrEqual(1);
      });

    });

    describe('Detail screen network error', () => {

      beforeEach(() => {
        const { fetchExerciseById } = require('../services/exerciseService');
        fetchExerciseById.mockRejectedValueOnce(new Error('Network request failed'));
      });

      it('AT-4-2C-01: a network error on the detail screen shows an error message', async () => {
        renderDetail('ex1');

        expect(
          await screen.findByText(/something went wrong|couldn't load|error/i)
        ).toBeTruthy();
      });

      it('AT-4-2C-02: a retry button is shown on the detail error state', async () => {
        renderDetail('ex1');

        expect(await screen.findByText(/retry/i)).toBeTruthy();
      });

      it('AT-4-2C-03: tapping retry re-fetches and renders the exercise detail', async () => {
        const { fetchExerciseById } = require('../services/exerciseService');
        fetchExerciseById.mockResolvedValueOnce(mockExercises[0]);

        renderDetail('ex1');

        fireEvent.press(await screen.findByText(/retry/i));

        expect(await screen.findByText('Push-Up')).toBeTruthy();
        expect(screen.getByTestId('exercise-detail-screen')).toBeTruthy();
      });

    });

  });

});