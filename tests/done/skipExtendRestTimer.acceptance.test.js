/**
 * US: Skip or Extend the Rest Timer on Demand
 * Acceptance tests — full user journey through a WorkoutLogger harness.
 *
 * Scenario 1 (Happy Path)
 *   AC1: Given I tap Skip → timer ends immediately and next set becomes active
 *   AC2: Given I extend rest time → countdown increases by the selected amount
 *
 * Scenario 2 (Exceptional)
 *   AC3: Given I pause → when resumed, continues from remaining time
 *   AC4: Given timer is skipped too early → user can still add more rest
 */

import React, { useState } from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { View, TouchableOpacity, Text } from 'react-native';
import RestTimerModal from '../../src/components/RestTimerModal';
import * as RestTimerService from '../../src/services/RestTimerService';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../src/services/RestTimerService', () => ({
  cancelRestNotification:   jest.fn(() => Promise.resolve()),
  scheduleRestNotification: jest.fn(() => Promise.resolve('notif-at-001')),
  fireTimerAlert:           jest.fn(() => Promise.resolve()),
}));

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── WorkoutLogger harness ────────────────────────────────────────────────────
// Mirrors the real flow: user logs a set → taps "Start Rest" → modal opens.
// onClose simulates the next set becoming active.

function WorkoutHarness({ initialDuration = 30 }) {
  const [visible, setVisible]             = useState(false);
  const [duration, setDuration]           = useState(initialDuration);
  const [nextSetActive, setNextSetActive] = useState(false);

  const handleStartRest = () => {
    setDuration(initialDuration);
    setVisible(true);
    RestTimerService.scheduleRestNotification(initialDuration);
  };

  const handleClose = async () => {
    await RestTimerService.cancelRestNotification();
    setVisible(false);
    setNextSetActive(true);
  };

  return (
    <View>
      <TouchableOpacity onPress={handleStartRest} testID="start-rest-btn">
        <Text>Start Rest</Text>
      </TouchableOpacity>

      {nextSetActive && <Text testID="next-set-active">Next Set Active</Text>}

      <RestTimerModal visible={visible} duration={duration} onClose={handleClose} />
    </View>
  );
}

// ─── Acceptance Tests ─────────────────────────────────────────────────────────

describe('US | Skip or Extend Rest Timer — acceptance tests', () => {

  // ── Scenario 1 — Happy Path ───────────────────────────────────────────────

  describe('Scenario 1 — Happy Path', () => {

    describe('AC1: Tap Skip → timer ends immediately, next set becomes active', () => {

      it('the Rest Timer modal opens after the user starts rest', async () => {
        const { getByText } = render(<WorkoutHarness initialDuration={30} />);

        fireEvent.press(getByText('Start Rest'));

        await waitFor(() => {
          expect(getByText('Rest Timer')).toBeTruthy();
          expect(getByText('00:30')).toBeTruthy();
        });
      });

      it('tapping Skip Rest closes the modal without waiting for countdown', async () => {
        const { getByText, queryByText } = render(<WorkoutHarness initialDuration={30} />);

        fireEvent.press(getByText('Start Rest'));
        await waitFor(() => expect(getByText('00:30')).toBeTruthy());

        fireEvent.press(getByText('Skip Rest'));

        await waitFor(() => {
          expect(queryByText('Rest Timer')).toBeNull();
        });
      });

      it('next set becomes active after tapping Skip Rest', async () => {
        const { getByText, getByTestId } = render(<WorkoutHarness initialDuration={30} />);

        fireEvent.press(getByText('Start Rest'));
        await waitFor(() => expect(getByText('Skip Rest')).toBeTruthy());

        fireEvent.press(getByText('Skip Rest'));

        await waitFor(() =>
          expect(getByTestId('next-set-active')).toBeTruthy()
        );
      });

      it('background notification is cancelled on skip (no ghost alert)', async () => {
        const { getByText } = render(<WorkoutHarness initialDuration={30} />);

        fireEvent.press(getByText('Start Rest'));
        await waitFor(() => expect(getByText('Skip Rest')).toBeTruthy());

        fireEvent.press(getByText('Skip Rest'));

        await waitFor(() =>
          expect(RestTimerService.cancelRestNotification).toHaveBeenCalled()
        );
      });

      it('"Start Next Set" CTA appears after natural expiry and also closes the modal', async () => {
        const { getByText, getByTestId, queryByText } =
          render(<WorkoutHarness initialDuration={3} />);

        fireEvent.press(getByText('Start Rest'));
        act(() => { jest.advanceTimersByTime(3000); });

        await waitFor(() => expect(getByText('💪  Start Next Set')).toBeTruthy());

        fireEvent.press(getByText('💪  Start Next Set'));

        await waitFor(() => {
          expect(queryByText('Rest Timer')).toBeNull();
          expect(getByTestId('next-set-active')).toBeTruthy();
        });
      });

    });

    describe('AC2: Extend rest time → countdown increases by the selected amount', () => {

      it('+30s increases the countdown from 00:30 to 01:00', async () => {
        const { getByText } = render(<WorkoutHarness initialDuration={30} />);

        fireEvent.press(getByText('Start Rest'));
        await waitFor(() => expect(getByText('00:30')).toBeTruthy());

        fireEvent.press(getByText('+30s'));

        await waitFor(() => expect(getByText('01:00')).toBeTruthy());
      });

      it('+15s increases the countdown by exactly 15 seconds', async () => {
        const { getByText } = render(<WorkoutHarness initialDuration={30} />);

        fireEvent.press(getByText('Start Rest'));
        await waitFor(() => expect(getByText('00:30')).toBeTruthy());

        fireEvent.press(getByText('+15s'));

        await waitFor(() => expect(getByText('00:45')).toBeTruthy());
      });

      it('+60s increases the countdown by exactly 60 seconds', async () => {
        const { getByText } = render(<WorkoutHarness initialDuration={30} />);

        fireEvent.press(getByText('Start Rest'));
        await waitFor(() => expect(getByText('00:30')).toBeTruthy());

        fireEvent.press(getByText('+60s'));

        await waitFor(() => expect(getByText('01:30')).toBeTruthy());
      });

      it('the timer continues counting down from the extended value', async () => {
        const { getByText } = render(<WorkoutHarness initialDuration={30} />);

        fireEvent.press(getByText('Start Rest'));
        await waitFor(() => expect(getByText('00:30')).toBeTruthy());

        fireEvent.press(getByText('+30s'));
        await waitFor(() => expect(getByText('01:00')).toBeTruthy());

        act(() => { jest.advanceTimersByTime(5000); });

        await waitFor(() => expect(getByText('00:55')).toBeTruthy());
      });

      it('extending reschedules the background notification for the new deadline', async () => {
        const { getByText } = render(<WorkoutHarness initialDuration={30} />);

        fireEvent.press(getByText('Start Rest'));
        await waitFor(() => expect(getByText('00:30')).toBeTruthy());

        const schedBefore = RestTimerService.scheduleRestNotification.mock.calls.length;

        fireEvent.press(getByText('+30s'));

        await waitFor(() => {
          expect(RestTimerService.scheduleRestNotification.mock.calls.length)
            .toBeGreaterThan(schedBefore);
          expect(RestTimerService.cancelRestNotification).toHaveBeenCalled();
        });
      });

      it('extending mid-countdown adds to remaining time, not to the original duration', async () => {
        const { getByText } = render(<WorkoutHarness initialDuration={60} />);

        fireEvent.press(getByText('Start Rest'));
        await waitFor(() => expect(getByText('01:00')).toBeTruthy());

        act(() => { jest.advanceTimersByTime(20000); }); // 00:40 remaining
        await waitFor(() => expect(getByText('00:40')).toBeTruthy());

        fireEvent.press(getByText('+30s')); // 00:40 + 30 = 01:10, not 01:30

        await waitFor(() => expect(getByText('01:10')).toBeTruthy());
      });

    });

  });

  // ── Scenario 2 — Exceptional ─────────────────────────────────────────────

  describe('Scenario 2 — Exceptional', () => {

    describe('AC3: Pause → when resumed, continues from remaining time', () => {

      it('a Pause button is visible while the timer is running', async () => {
        const { getByText } = render(<WorkoutHarness initialDuration={30} />);

        fireEvent.press(getByText('Start Rest'));

        await waitFor(() => expect(getByText('⏸  Pause')).toBeTruthy());
      });

      it('tapping Pause freezes the countdown', async () => {
        const { getByText } = render(<WorkoutHarness initialDuration={30} />);

        fireEvent.press(getByText('Start Rest'));
        await waitFor(() => expect(getByText('00:30')).toBeTruthy());

        act(() => { jest.advanceTimersByTime(10000); });
        await waitFor(() => expect(getByText('00:20')).toBeTruthy());

        fireEvent.press(getByText('⏸  Pause'));

        // 10 more seconds — display must stay frozen
        act(() => { jest.advanceTimersByTime(10000); });
        await waitFor(() => expect(getByText('00:20')).toBeTruthy());
      });

      it('AC3: resuming continues from the paused value, not from the start', async () => {
        const { getByText } = render(<WorkoutHarness initialDuration={30} />);

        fireEvent.press(getByText('Start Rest'));
        await waitFor(() => expect(getByText('00:30')).toBeTruthy());

        act(() => { jest.advanceTimersByTime(10000); }); // → 00:20
        await waitFor(() => expect(getByText('00:20')).toBeTruthy());

        fireEvent.press(getByText('⏸  Pause'));

        act(() => { jest.advanceTimersByTime(99000); }); // frozen
        await waitFor(() => expect(getByText('00:20')).toBeTruthy());

        fireEvent.press(getByText('▶  Resume'));

        act(() => { jest.advanceTimersByTime(5000); }); // → 00:15
        await waitFor(() => expect(getByText('00:15')).toBeTruthy());
      });

      it('cancels notification on pause and reschedules it on resume', async () => {
        const { getByText } = render(<WorkoutHarness initialDuration={30} />);

        fireEvent.press(getByText('Start Rest'));
        await waitFor(() => expect(getByText('00:30')).toBeTruthy());

        act(() => { jest.advanceTimersByTime(10000); }); // 00:20 remaining

        const cancelBefore = RestTimerService.cancelRestNotification.mock.calls.length;
        fireEvent.press(getByText('⏸  Pause'));

        await waitFor(() => {
          expect(RestTimerService.cancelRestNotification.mock.calls.length)
            .toBeGreaterThan(cancelBefore);
        });

        const schedBefore = RestTimerService.scheduleRestNotification.mock.calls.length;
        fireEvent.press(getByText('▶  Resume'));

        await waitFor(() => {
          expect(RestTimerService.scheduleRestNotification.mock.calls.length)
            .toBeGreaterThan(schedBefore);
          // Scheduled for remaining ≈20 s, not the original 30
          const lastArg =
            RestTimerService.scheduleRestNotification.mock.calls.slice(-1)[0][0];
          expect(lastArg).toBeLessThanOrEqual(20);
          expect(lastArg).toBeGreaterThan(0);
        });
      });

      it('Skip works while paused and activates the next set', async () => {
        const { getByText, getByTestId } = render(<WorkoutHarness initialDuration={30} />);

        fireEvent.press(getByText('Start Rest'));
        await waitFor(() => expect(getByText('⏸  Pause')).toBeTruthy());

        fireEvent.press(getByText('⏸  Pause'));
        await waitFor(() => expect(getByText('▶  Resume')).toBeTruthy());

        fireEvent.press(getByText('Skip Rest'));

        await waitFor(() =>
          expect(getByTestId('next-set-active')).toBeTruthy()
        );
      });

      it('+Ns add-time works while the timer is paused', async () => {
        const { getByText } = render(<WorkoutHarness initialDuration={30} />);

        fireEvent.press(getByText('Start Rest'));
        await waitFor(() => expect(getByText('00:30')).toBeTruthy());

        fireEvent.press(getByText('⏸  Pause'));
        await waitFor(() => expect(getByText('▶  Resume')).toBeTruthy());

        fireEvent.press(getByText('+30s'));

        await waitFor(() => expect(getByText('01:00')).toBeTruthy());
      });

    });

    describe('AC4: Skip too early → user can still add more rest if needed', () => {

      it('add-time buttons are available at any point during the countdown', async () => {
        const { getByText } = render(<WorkoutHarness initialDuration={60} />);

        fireEvent.press(getByText('Start Rest'));
        await waitFor(() => expect(getByText('01:00')).toBeTruthy());

        act(() => { jest.advanceTimersByTime(45000); }); // 00:15 left
        await waitFor(() => expect(getByText('00:15')).toBeTruthy());

        fireEvent.press(getByText('+30s'));

        await waitFor(() => expect(getByText('00:45')).toBeTruthy());
      });

      it('selecting a shorter preset is equivalent to skipping ahead, then add-time still works', async () => {
        const { getByText } = render(<WorkoutHarness initialDuration={60} />);

        fireEvent.press(getByText('Start Rest'));
        await waitFor(() => expect(getByText('01:00')).toBeTruthy());

        // User decides they only need 15 s
        fireEvent.press(getByText('15s'));
        await waitFor(() => expect(getByText('00:15')).toBeTruthy());

        // Changes mind — wants more after all
        fireEvent.press(getByText('+30s'));

        await waitFor(() => expect(getByText('00:45')).toBeTruthy());
      });

    });

  });

});
