import React from 'react-native';
import { render, fireEvent, screen, waitFor, act } from '@testing-library/react-native';
import '@testing-library/react-native/extend-expect';

import HomeScreen from '../screens/HomeScreen';
import WorkoutListScreen from '../screens/WorkoutListScreen';
import WorkoutDetailScreen from '../screens/WorkoutDetailScreen';
import GuidedSessionScreen from '../screens/GuidedSessionScreen';

const mockRoutines = [
  {
    id: '1',
    title: '10-Min Full-Body Beginner',
    duration: 10,
    difficulty: 'Easy',
    equipment: 'No Equipment',
    focusArea: 'Whole body',
    exercises: [
      { id: 'e1', name: 'Bodyweight Squats', sets: 3, reps: 12, durationSeconds: null },
      { id: 'e2', name: 'Push-Ups (Knee)',   sets: 3, reps: 10, durationSeconds: null },
      { id: 'e3', name: 'Plank',             sets: 3, reps: null, durationSeconds: 20 },
      { id: 'e4', name: 'Glute Bridges',     sets: 3, reps: 15, durationSeconds: null },
    ],
    tips: 'Breathe out on effort! Keep core tight.',
    imageUrl: 'https://example.com/full-body.jpg',
  },
  {
    id: '2',
    title: '20-Min Home Strength',
    duration: 20,
    difficulty: 'Beginner',
    equipment: 'Dumbbells optional',
    focusArea: 'Upper body',
    exercises: [
      { id: 'e5', name: 'Dumbbell Rows',    sets: 3, reps: 12, durationSeconds: null },
      { id: 'e6', name: 'Shoulder Press',   sets: 3, reps: 10, durationSeconds: null },
    ],
    tips: 'Control the movement on the way down.',
    imageUrl: 'https://example.com/home-strength.jpg',
  },
  {
    id: '3',
    title: '15-Min Core Starter',
    duration: 15,
    difficulty: 'Easy',
    equipment: 'No Equipment',
    focusArea: 'Core',
    exercises: [
      { id: 'e7', name: 'Crunches',      sets: 3, reps: 15, durationSeconds: null },
      { id: 'e8', name: 'Leg Raises',    sets: 3, reps: 12, durationSeconds: null },
      { id: 'e9', name: 'Dead Bug',      sets: 3, reps: 10, durationSeconds: null },
    ],
    tips: 'Keep your lower back pressed to the floor.',
    imageUrl: 'https://example.com/core.jpg',
  },
];

jest.mock('../services/routineService', () => ({
  fetchRoutines: jest.fn(() => Promise.resolve(mockRoutines)),
  fetchRoutineById: jest.fn(id =>
    Promise.resolve(mockRoutines.find(r => r.id === id) ?? null)
  ),
}));

jest.useFakeTimers();

const renderWorkoutList = (props = {}) => render(<WorkoutListScreen {...props} />);
const renderWorkoutDetail = (routineId = '1') =>
  render(<WorkoutDetailScreen routineId={routineId} />);
const renderGuidedSession = (routineId = '1') =>
  render(<GuidedSessionScreen routineId={routineId} />);

beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

describe('User Story 3 — Browse and Start Pre-Made Beginner Workouts', () => {

  describe('Scenario 1 — Normal Flow', () => {

    describe('Home screen entry point', () => {

      it('AT-3-1A-01: home screen displays a "Get Started" or "Beginner Workouts" section', async () => {
        render(<HomeScreen />);

        expect(
          await screen.findByText(/get started|beginner workouts/i)
        ).toBeTruthy();
      });

      it('AT-3-1A-02: home screen has a "Browse Pre-Made Workouts" entry point', async () => {
        render(<HomeScreen />);

        expect(await screen.findByText(/browse pre-made/i)).toBeTruthy();
      });

    });

    describe('Workout list', () => {

      it('AT-3-1A-03: at least 3 pre-made beginner routines are displayed', async () => {
        renderWorkoutList();

        const cards = await screen.findAllByTestId('routine-card');
        expect(cards.length).toBeGreaterThanOrEqual(3);
      });

      it('AT-3-1A-04: each routine card shows title, duration, equipment, and difficulty', async () => {
        renderWorkoutList();

        const cards = await screen.findAllByTestId('routine-card');
        const first = cards[0];

        expect(first).toHaveTextContent('10-Min Full-Body Beginner');
        expect(first).toHaveTextContent('10');
        expect(first).toHaveTextContent(/no equipment/i);
        expect(first).toHaveTextContent(/easy/i);
      });

      it('AT-3-1A-05: each routine card has a visible start button', async () => {
        renderWorkoutList();

        const startButtons = await screen.findAllByTestId('routine-card-start-button');
        expect(startButtons.length).toBeGreaterThanOrEqual(3);
      });

    });

    describe('Workout detail', () => {

      it('AT-3-1A-06: tapping a routine card navigates to its detail view', async () => {
        renderWorkoutList();

        fireEvent.press(await screen.findByText('10-Min Full-Body Beginner'));

        expect(await screen.findByTestId('workout-detail-screen')).toBeTruthy();
      });

      it('AT-3-1A-07: detail view shows the exercise list', async () => {
        renderWorkoutDetail('1');

        expect(await screen.findByText('Bodyweight Squats')).toBeTruthy();
        expect(screen.getByText('Push-Ups (Knee)')).toBeTruthy();
        expect(screen.getByText('Plank')).toBeTruthy();
        expect(screen.getByText('Glute Bridges')).toBeTruthy();
      });

      it('AT-3-1A-08: detail view shows duration and focus area', async () => {
        renderWorkoutDetail('1');

        expect(await screen.findByTestId('detail-duration')).toHaveTextContent('10');
        expect(screen.getByTestId('detail-focus')).toHaveTextContent(/whole body/i);
      });

      it('AT-3-1A-09: detail view shows the Start Workout button', async () => {
        renderWorkoutDetail('1');

        expect(await screen.findByText(/start workout/i)).toBeTruthy();
      });

      it('AT-3-1A-10: detail view shows tips section', async () => {
        renderWorkoutDetail('1');

        expect(
          await screen.findByText(/breathe out on effort/i)
        ).toBeTruthy();
      });

    });

    describe('Guided session', () => {

      it('AT-3-1A-11: tapping Start Workout launches the guided session', async () => {
        renderWorkoutDetail('1');

        fireEvent.press(await screen.findByText(/start workout/i));

        expect(await screen.findByTestId('guided-session-screen')).toBeTruthy();
      });

      it('AT-3-1A-12: guided session displays the first exercise name and instructions', async () => {
        renderGuidedSession('1');

        expect(await screen.findByText('Bodyweight Squats')).toBeTruthy();
        expect(screen.getByTestId('exercise-instructions')).toBeTruthy();
      });

      it('AT-3-1A-13: a timer or set counter is visible during the session', async () => {
        renderGuidedSession('1');

        await screen.findByTestId('guided-session-screen');

        const timer   = screen.queryByTestId('session-timer');
        const counter = screen.queryByTestId('session-set-counter');
        expect(timer ?? counter).toBeTruthy();
      });

      it('AT-3-1A-14: completing a set advances to the next one', async () => {
        renderGuidedSession('1');

        await screen.findByText('Bodyweight Squats');

        fireEvent.press(screen.getByText(/complete set|done|next/i));

        const counter = await screen.findByTestId('session-set-counter');
        expect(counter).toHaveTextContent(/2/);
      });

      it('AT-3-1A-15: completing all sets of an exercise advances to the next exercise', async () => {
        renderGuidedSession('1');

        await screen.findByText('Bodyweight Squats');

        // Complete all 3 sets of the first exercise
        for (let i = 0; i < 3; i++) {
          fireEvent.press(screen.getByText(/complete set|done|next/i));
        }

        expect(await screen.findByText('Push-Ups (Knee)')).toBeTruthy();
      });

      it('AT-3-1A-16: timed exercises show a countdown rather than a rep count', async () => {
        renderGuidedSession('1');

        // Advance to Plank (index 2), which is time-based
        await screen.findByText('Bodyweight Squats');
        for (let i = 0; i < 6; i++) { // 3 sets × 2 exercises before Plank
          fireEvent.press(screen.getByText(/complete set|done|next/i));
        }

        expect(await screen.findByText('Plank')).toBeTruthy();
        expect(screen.getByTestId('session-timer')).toBeTruthy();
      });

    });

  });

  describe('Scenario 2 — Exceptional Flow', () => {

    describe('Empty filter state', () => {

      it('AT-3-2A-01: applying a filter that matches no routines shows an empty state', async () => {
        renderWorkoutList();

        await screen.findAllByTestId('routine-card');

        fireEvent.press(screen.getByTestId('filter-button'));
        fireEvent.press(screen.getByText(/gym|barbell/i));

        expect(
          await screen.findByText(/no matching routines found/i)
        ).toBeTruthy();
        expect(screen.queryAllByTestId('routine-card')).toHaveLength(0);
      });

      it('AT-3-2A-02: empty filter state shows a suggestion to remove filters', async () => {
        renderWorkoutList();

        await screen.findAllByTestId('routine-card');
        fireEvent.press(screen.getByTestId('filter-button'));
        fireEvent.press(screen.getByText(/gym|barbell/i));

        expect(
          await screen.findByText(/try removing filters/i)
        ).toBeTruthy();
      });

      it('AT-3-2A-03: "View All Routines" button in empty state resets filters and shows all routines', async () => {
        renderWorkoutList();

        await screen.findAllByTestId('routine-card');
        fireEvent.press(screen.getByTestId('filter-button'));
        fireEvent.press(screen.getByText(/gym|barbell/i));
        await screen.findByText(/no matching routines found/i);

        fireEvent.press(screen.getByText(/view all routines/i));

        const cards = await screen.findAllByTestId('routine-card');
        expect(cards.length).toBeGreaterThanOrEqual(3);
      });

    });

    describe('Network error state', () => {

      beforeEach(() => {
        const { fetchRoutines } = require('../services/routineService');
        fetchRoutines.mockRejectedValueOnce(new Error('Network request failed'));
      });

      it('AT-3-2B-01: a network error during load shows an error message', async () => {
        renderWorkoutList();

        expect(
          await screen.findByText(/something went wrong|couldn't load|error/i)
        ).toBeTruthy();
      });

      it('AT-3-2B-02: a retry button is shown after a network error', async () => {
        renderWorkoutList();

        expect(await screen.findByText(/retry/i)).toBeTruthy();
      });

      it('AT-3-2B-03: tapping retry re-fetches routines and shows the list on success', async () => {
        const { fetchRoutines } = require('../services/routineService');

        // First call fails (set in beforeEach), second call succeeds
        fetchRoutines.mockResolvedValueOnce(mockRoutines);

        renderWorkoutList();

        fireEvent.press(await screen.findByText(/retry/i));

        const cards = await screen.findAllByTestId('routine-card');
        expect(cards.length).toBeGreaterThanOrEqual(3);
      });

      it('AT-3-2B-04: the app does not crash on network error — error boundary renders', async () => {
        renderWorkoutList();

        await screen.findByText(/something went wrong|couldn't load|error/i);

        // Confirm no unhandled throw by verifying the screen is still mounted
        expect(screen.getByTestId('workout-list-screen')).toBeTruthy();
      });

      describe('Detail screen network error', () => {

        beforeEach(() => {
          const { fetchRoutineById } = require('../services/routineService');
          fetchRoutineById.mockRejectedValueOnce(new Error('Network request failed'));
        });

        it('AT-3-2B-05: network error on detail screen shows error message and retry', async () => {
          renderWorkoutDetail('1');

          expect(await screen.findByText(/something went wrong|couldn't load|error/i)).toBeTruthy();
          expect(screen.getByText(/retry/i)).toBeTruthy();
        });

      });

    });

  });

});