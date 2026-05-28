/**
 * US: Skip or Extend the Rest Timer on Demand
 * Unit tests — RestTimerModal in isolation.
 *
 * Scenario 1 (Happy Path)
 *   AC1: Skip ends the timer immediately → next set becomes active
 *   AC2: +Ns increases the countdown by the selected amount
 *
 * Scenario 2 (Exceptional)
 *   AC3: Pause freezes the countdown; Resume continues from remaining time
 *   AC4: Skipping early → user can still add more rest
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import RestTimerModal from '../../src/components/RestTimerModal';
import * as RestTimerService from '../../src/services/RestTimerService';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../src/services/RestTimerService', () => ({
  cancelRestNotification:  jest.fn(() => Promise.resolve()),
  scheduleRestNotification: jest.fn(() => Promise.resolve('notif-unit-001')),
  fireTimerAlert:           jest.fn(() => Promise.resolve()),
}));

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderModal(duration = 30) {
  const onClose = jest.fn();
  const utils = render(
    <RestTimerModal visible={true} duration={duration} onClose={onClose} />
  );
  return { ...utils, onClose };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('US | Skip or Extend Rest Timer — unit tests', () => {

  // ── Scenario 1a: Skip ─────────────────────────────────────────────────────

  describe('Scenario 1a — Skip', () => {

    it('renders a "Skip Rest" button while the timer is running', () => {
      const { getByText } = renderModal(30);
      expect(getByText('Skip Rest')).toBeTruthy();
    });

    it('AC1: Skip calls onClose immediately without waiting for countdown', async () => {
      const { getByText, onClose } = renderModal(30);

      fireEvent.press(getByText('Skip Rest'));

      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    });

    it('cancels the background notification when Skip is pressed', async () => {
      const { getByText } = renderModal(30);

      fireEvent.press(getByText('Skip Rest'));

      await waitFor(() =>
        expect(RestTimerService.cancelRestNotification).toHaveBeenCalled()
      );
    });

    it('does NOT call fireTimerAlert on manual skip (no false vibration)', async () => {
      const { getByText } = renderModal(30);

      fireEvent.press(getByText('Skip Rest'));

      await waitFor(() =>
        expect(RestTimerService.fireTimerAlert).not.toHaveBeenCalled()
      );
    });

  });

  // ── Scenario 1b: Extend ───────────────────────────────────────────────────

  describe('Scenario 1b — Extend rest time', () => {

    it('renders +15s, +30s, +60s buttons during countdown', () => {
      const { getByText } = renderModal(30);
      expect(getByText('+15s')).toBeTruthy();
      expect(getByText('+30s')).toBeTruthy();
      expect(getByText('+60s')).toBeTruthy();
    });

    it('AC2: +30s increases display from 00:30 to 01:00', async () => {
      const { getByText } = renderModal(30);
      await waitFor(() => expect(getByText('00:30')).toBeTruthy());

      fireEvent.press(getByText('+30s'));

      await waitFor(() => expect(getByText('01:00')).toBeTruthy());
    });

    it('AC2: +15s increases display by exactly 15 seconds', async () => {
      const { getByText } = renderModal(30);
      await waitFor(() => expect(getByText('00:30')).toBeTruthy());

      fireEvent.press(getByText('+15s'));

      await waitFor(() => expect(getByText('00:45')).toBeTruthy());
    });

    it('AC2: +60s increases display by exactly 60 seconds', async () => {
      const { getByText } = renderModal(30);
      await waitFor(() => expect(getByText('00:30')).toBeTruthy());

      fireEvent.press(getByText('+60s'));

      await waitFor(() => expect(getByText('01:30')).toBeTruthy());
    });

    it('reschedules the background notification after adding time', async () => {
      const { getByText } = renderModal(30);
      await waitFor(() => expect(getByText('00:30')).toBeTruthy());

      fireEvent.press(getByText('+30s'));

      await waitFor(() => {
        expect(RestTimerService.cancelRestNotification).toHaveBeenCalled();
        expect(RestTimerService.scheduleRestNotification).toHaveBeenCalled();
      });
    });

    it('multiple adds accumulate correctly', async () => {
      const { getByText } = renderModal(30);
      await waitFor(() => expect(getByText('00:30')).toBeTruthy());

      fireEvent.press(getByText('+15s'));
      await waitFor(() => expect(getByText('00:45')).toBeTruthy());

      fireEvent.press(getByText('+15s'));
      await waitFor(() => expect(getByText('01:00')).toBeTruthy());
    });

    it('countdown continues from the extended value after adding time', async () => {
      const { getByText } = renderModal(30);
      await waitFor(() => expect(getByText('00:30')).toBeTruthy());

      fireEvent.press(getByText('+30s'));
      await waitFor(() => expect(getByText('01:00')).toBeTruthy());

      act(() => { jest.advanceTimersByTime(5000); });

      await waitFor(() => expect(getByText('00:55')).toBeTruthy());
    });

    it('add-time buttons are hidden after the timer expires naturally', async () => {
      const { queryByText } = renderModal(3);

      act(() => { jest.advanceTimersByTime(3000); });

      await waitFor(() => {
        expect(queryByText('+15s')).toBeNull();
        expect(queryByText('+30s')).toBeNull();
        expect(queryByText('+60s')).toBeNull();
      });
    });

  });

  // ── Scenario 2a: Pause / Resume ───────────────────────────────────────────

  describe('Scenario 2a — Pause / Resume', () => {

    it('renders a Pause button while the timer is running', () => {
      const { getByText } = renderModal(30);
      expect(getByText('⏸  Pause')).toBeTruthy();
    });

    it('AC3: pausing freezes the countdown at the current remaining time', async () => {
      const { getByText } = renderModal(30);
      await waitFor(() => expect(getByText('00:30')).toBeTruthy());

      act(() => { jest.advanceTimersByTime(5000); });
      await waitFor(() => expect(getByText('00:25')).toBeTruthy());

      fireEvent.press(getByText('⏸  Pause'));

      // 5 more seconds — must stay frozen
      act(() => { jest.advanceTimersByTime(5000); });
      await waitFor(() => expect(getByText('00:25')).toBeTruthy());
    });

    it('shows "Resume" label while paused and "Pause" while running', async () => {
      const { getByText, queryByText } = renderModal(30);

      expect(getByText('⏸  Pause')).toBeTruthy();
      expect(queryByText('▶  Resume')).toBeNull();

      fireEvent.press(getByText('⏸  Pause'));

      await waitFor(() => {
        expect(getByText('▶  Resume')).toBeTruthy();
        expect(queryByText('⏸  Pause')).toBeNull();
      });
    });

    it('cancels the background notification when paused (prevents ghost alert)', async () => {
      const { getByText } = renderModal(30);
      await waitFor(() => expect(getByText('00:30')).toBeTruthy());

      const callsBefore = RestTimerService.cancelRestNotification.mock.calls.length;

      fireEvent.press(getByText('⏸  Pause'));

      await waitFor(() => {
        expect(RestTimerService.cancelRestNotification.mock.calls.length)
          .toBeGreaterThan(callsBefore);
      });
    });

    it('AC3: resuming continues from the remaining time, not from the beginning', async () => {
      const { getByText } = renderModal(30);
      await waitFor(() => expect(getByText('00:30')).toBeTruthy());

      act(() => { jest.advanceTimersByTime(10000); }); // → 00:20
      await waitFor(() => expect(getByText('00:20')).toBeTruthy());

      fireEvent.press(getByText('⏸  Pause'));

      // Long pause — should stay frozen
      act(() => { jest.advanceTimersByTime(99000); });
      await waitFor(() => expect(getByText('00:20')).toBeTruthy());

      fireEvent.press(getByText('▶  Resume'));

      act(() => { jest.advanceTimersByTime(5000); }); // → 00:15
      await waitFor(() => expect(getByText('00:15')).toBeTruthy());
    });

    it('reschedules the notification for remaining seconds on resume', async () => {
      const { getByText } = renderModal(30);
      await waitFor(() => expect(getByText('00:30')).toBeTruthy());

      act(() => { jest.advanceTimersByTime(10000); }); // 00:20 remaining

      fireEvent.press(getByText('⏸  Pause'));
      await waitFor(() => expect(getByText('▶  Resume')).toBeTruthy());

      const schedBefore = RestTimerService.scheduleRestNotification.mock.calls.length;

      fireEvent.press(getByText('▶  Resume'));

      await waitFor(() => {
        expect(RestTimerService.scheduleRestNotification.mock.calls.length)
          .toBeGreaterThan(schedBefore);
        // Scheduled for ≈20 s remaining, not the original 30
        const lastArg = RestTimerService.scheduleRestNotification.mock.calls.slice(-1)[0][0];
        expect(lastArg).toBeLessThanOrEqual(20);
        expect(lastArg).toBeGreaterThan(0);
      });
    });

    it('the "paused" sub-label replaces "rest" while paused', async () => {
      const { getByText, queryByText } = renderModal(30);

      expect(getByText('rest')).toBeTruthy();
      expect(queryByText('paused')).toBeNull();

      fireEvent.press(getByText('⏸  Pause'));

      await waitFor(() => {
        expect(getByText('paused')).toBeTruthy();
        expect(queryByText('rest')).toBeNull();
      });
    });

    it('Skip still works while the timer is paused', async () => {
      const { getByText, onClose } = renderModal(30);
      await waitFor(() => expect(getByText('00:30')).toBeTruthy());

      fireEvent.press(getByText('⏸  Pause'));
      await waitFor(() => expect(getByText('▶  Resume')).toBeTruthy());

      fireEvent.press(getByText('Skip Rest'));

      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    });

    it('+Ns add-time still works while the timer is paused', async () => {
      const { getByText } = renderModal(30);
      await waitFor(() => expect(getByText('00:30')).toBeTruthy());

      fireEvent.press(getByText('⏸  Pause'));
      await waitFor(() => expect(getByText('▶  Resume')).toBeTruthy());

      fireEvent.press(getByText('+30s'));

      await waitFor(() => expect(getByText('01:00')).toBeTruthy());
    });

    it('Pause / Resume button is hidden after the timer finishes naturally', async () => {
      const { queryByText } = renderModal(3);

      act(() => { jest.advanceTimersByTime(3000); });

      await waitFor(() => {
        expect(queryByText('⏸  Pause')).toBeNull();
        expect(queryByText('▶  Resume')).toBeNull();
      });
    });

    it('opening the modal resets paused state if it was previously paused', async () => {
      const onClose = jest.fn();
      const { getByText, queryByText, rerender } = render(
        <RestTimerModal visible={true} duration={30} onClose={onClose} />
      );

      await waitFor(() => expect(getByText('00:30')).toBeTruthy());
      fireEvent.press(getByText('⏸  Pause'));
      await waitFor(() => expect(getByText('▶  Resume')).toBeTruthy());

      // Simulate close then reopen
      rerender(<RestTimerModal visible={false} duration={30} onClose={onClose} />);
      rerender(<RestTimerModal visible={true}  duration={30} onClose={onClose} />);

      await waitFor(() => {
        expect(queryByText('▶  Resume')).toBeNull();
        expect(getByText('⏸  Pause')).toBeTruthy();
      });
    });

  });

  // ── Scenario 2b: Skip early → add more rest ───────────────────────────────

  describe('Scenario 2b — Skipped early → still add more rest', () => {

    it('AC4: preset chip resets timer after an early change (equivalent to skip-ahead)', async () => {
      const { getByText } = renderModal(60);
      await waitFor(() => expect(getByText('01:00')).toBeTruthy());

      fireEvent.press(getByText('15s'));

      await waitFor(() => {
        expect(getByText('00:15')).toBeTruthy();
        expect(RestTimerService.scheduleRestNotification).toHaveBeenCalledWith(15);
      });
    });

    it('AC4: add-time works after the preset chip resets the timer', async () => {
      const { getByText } = renderModal(60);
      await waitFor(() => expect(getByText('01:00')).toBeTruthy());

      fireEvent.press(getByText('15s'));
      await waitFor(() => expect(getByText('00:15')).toBeTruthy());

      fireEvent.press(getByText('+30s'));

      await waitFor(() => expect(getByText('00:45')).toBeTruthy());
    });

    it('AC4: add-time works at any point mid-countdown, not just at the start', async () => {
      const { getByText } = renderModal(60);
      await waitFor(() => expect(getByText('01:00')).toBeTruthy());

      act(() => { jest.advanceTimersByTime(45000); }); // 00:15 left
      await waitFor(() => expect(getByText('00:15')).toBeTruthy());

      fireEvent.press(getByText('+30s'));

      await waitFor(() => expect(getByText('00:45')).toBeTruthy());
    });

  });

});
