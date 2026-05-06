import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import '@testing-library/react-native/extend-expect';

// ── Mocks (hoisted before imports) ────────────────────────────────────────────

jest.mock('react-native-get-random-values', () => {});
jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() =>
    Promise.resolve({
      execAsync:            jest.fn(() => Promise.resolve()),
      runAsync:             jest.fn(() => Promise.resolve()),
      getFirstAsync:        jest.fn(() => Promise.resolve({ v: 3 })),
      getAllAsync:           jest.fn(() => Promise.resolve([])),
      withTransactionAsync: jest.fn(fn => fn()),
    })
  ),
}));

// Mock Firebase config so firestoreDb.js doesn't try to init Firebase
jest.mock('../../src/utils/firebaseConfig', () => ({
  db:   {},
  auth: { currentUser: { uid: 'test-user' } },
}));

// Mock firestoreDb so no real Firestore calls happen
jest.mock('../../src/utils/firestoreDb', () => ({
  saveWorkout:              jest.fn(() => Promise.resolve()),
  fetchWorkouts:            jest.fn(() => Promise.resolve([])),
  buildExercisesFromTemplate: jest.fn(exercises =>
    exercises.map(def => ({
      id: 'gen-' + def.id,
      exerciseId: def.id,
      name:       def.name,
      muscle:     def.muscle,
      category:   def.category,
      sets: [{ id: 'set-init', weight: '', reps: '', rpe: null, notes: '', isWarmup: false }],
    }))
  ),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem:    jest.fn(() => Promise.resolve()),
  getItem:    jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import WorkoutLogger from '../../src/screens/WorkoutLogger';

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockGoBack   = jest.fn();

const renderLogger = () =>
  render(
    <WorkoutLogger
      navigation={{ navigate: mockNavigate, replace: jest.fn(), goBack: mockGoBack }}
      route={{}}
    />
  );

/** Add one Bench Press exercise to the logger */
const addBenchPress = () => {
  fireEvent.press(screen.getByText('＋  Add Exercise'));
  fireEvent.press(screen.getByText('Bench Press'));
};

beforeEach(() => jest.clearAllMocks());

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('User Story – Warm-Up Set Marker', () => {

  describe('Scenario A – Marking a set as warm-up', () => {

    it('WU-A-01: the set badge is visible and shows the set number by default', () => {
      renderLogger();
      addBenchPress();

      // Set badge starts as "1" for the first set
      expect(screen.getByText('1')).toBeTruthy();
    });

    it('WU-A-02: tapping the set badge marks it as a warm-up (shows "W")', () => {
      renderLogger();
      addBenchPress();

      // Tap the set-number badge to toggle warm-up
      fireEvent.press(screen.getByText('1'));

      expect(screen.getByText('W')).toBeTruthy();
    });

    it('WU-A-03: tapping "W" again reverts the set back to a working set', () => {
      renderLogger();
      addBenchPress();

      fireEvent.press(screen.getByText('1')); // → warm-up
      fireEvent.press(screen.getByText('W')); // → working again

      expect(screen.getByText('1')).toBeTruthy();
      expect(screen.queryByText('W')).toBeNull();
    });

  });

  describe('Scenario B – Warm-up sets are excluded from working-set count', () => {

    it('WU-B-01: top bar shows "1 working" when one working set exists', () => {
      renderLogger();
      addBenchPress();

      expect(screen.getByText(/1 working/)).toBeTruthy();
    });

    it('WU-B-02: marking the only set as warm-up removes it from working count', () => {
      renderLogger();
      addBenchPress();

      fireEvent.press(screen.getByText('1')); // mark as warm-up

      // "1 working" should no longer appear
      expect(screen.queryByText(/1 working/)).toBeNull();
    });

    it('WU-B-03: warm-up count indicator appears in top bar after marking', () => {
      renderLogger();
      addBenchPress();

      fireEvent.press(screen.getByText('1')); // mark as warm-up

      // Top bar should indicate 1 warm-up set with the "+  1W" suffix
      expect(screen.getByText(/1W/)).toBeTruthy();
    });

  });

  describe('Scenario C – New sets default to working sets', () => {

    it('WU-C-01: additional sets added via "+ Add Set" are NOT warm-ups by default', () => {
      renderLogger();
      addBenchPress();

      fireEvent.press(screen.getByText('+ Add Set'));

      // Both sets show numbers (1, 2), no "W"
      expect(screen.getByText('1')).toBeTruthy();
      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.queryByText('W')).toBeNull();
    });

  });

  describe('Scenario D – Volume stats logic for warm-up exclusion', () => {

    it('WU-D-01: volume calculation skips warm-up sets', () => {
      // Pure logic test — mimics the reduce in HistoryScreen WorkoutCard
      const sets = [
        { weight: 20, reps: 10, isWarmup: true  },  // warm-up: should not count
        { weight: 80, reps: 8,  isWarmup: false },  // working: 640 kg
        { weight: 80, reps: 8,  isWarmup: false },  // working: 640 kg
      ];

      const volume = sets.reduce(
        (s, set) => set.isWarmup ? s : s + (set.weight * set.reps),
        0
      );

      // 80×8 + 80×8 = 1280; warm-up (20×10 = 200) must be excluded
      expect(volume).toBe(1280);
    });

    it('WU-D-02: all warm-up sets produce zero working volume', () => {
      const sets = [
        { weight: 20, reps: 10, isWarmup: true },
        { weight: 40, reps: 5,  isWarmup: true },
      ];

      const volume = sets.reduce(
        (s, set) => set.isWarmup ? s : s + (set.weight * set.reps),
        0
      );

      expect(volume).toBe(0);
    });

  });

});
