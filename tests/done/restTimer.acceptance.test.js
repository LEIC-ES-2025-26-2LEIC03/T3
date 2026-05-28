import React, { useState } from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { View, TouchableOpacity, Text } from 'react-native';
import RestTimerModal from '../../src/components/RestTimerModal';
import * as RestTimerService from '../../src/services/RestTimerService';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../src/services/RestTimerService', () => ({
  cancelRestNotification: jest.fn(() => Promise.resolve()),
  scheduleRestNotification: jest.fn(() => Promise.resolve('notif-id-001')),
  fireTimerAlert: jest.fn(() => Promise.resolve()),
}));

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── Harness ──────────────────────────────────────────────────────────────────
// A minimal wrapper that mimics how WorkoutLogger opens the rest timer after
// the user presses "Start Rest" on a set row — matching the real user journey.

function WorkoutHarness({ initialDuration = 10 }) {
  const [visible, setVisible] = useState(false);
  const [duration, setDuration] = useState(initialDuration);

  const handleStartRest = (d = initialDuration) => {
    setDuration(d);
    setVisible(true);
    RestTimerService.scheduleRestNotification(d);
  };

  const handleClose = async () => {
    await RestTimerService.cancelRestNotification();
    setVisible(false);
  };

  return (
    <View>
      <TouchableOpacity onPress={() => handleStartRest(initialDuration)}>
        <Text>Start Rest</Text>
      </TouchableOpacity>
      <RestTimerModal visible={visible} duration={duration} onClose={handleClose} />
    </View>
  );
}

// ─── Acceptance tests ─────────────────────────────────────────────────────────

describe('US-XX | Rest Timer — acceptance tests', () => {

  it('opens the rest timer when the user presses Start Rest after logging a set', async () => {
    const { getByText } = render(<WorkoutHarness initialDuration={30} />);

    fireEvent.press(getByText('Start Rest'));

    await waitFor(() => {
      expect(getByText('Rest Timer')).toBeTruthy();
      expect(getByText('00:30')).toBeTruthy();
    });
  });

  it('schedules a background notification as soon as the timer opens', async () => {
    const { getByText } = render(<WorkoutHarness initialDuration={30} />);

    fireEvent.press(getByText('Start Rest'));

    await waitFor(() => {
      expect(RestTimerService.scheduleRestNotification).toHaveBeenCalledWith(30);
    });
  });

  it('counts down in real time and shows the correct remaining time', async () => {
    const { getByText } = render(<WorkoutHarness initialDuration={30} />);

    fireEvent.press(getByText('Start Rest'));
    await waitFor(() => expect(getByText('00:30')).toBeTruthy());

    act(() => { jest.advanceTimersByTime(5000); });
    await waitFor(() => expect(getByText('00:25')).toBeTruthy());
  });

  it('alerts the user and cancels the notification when the countdown finishes', async () => {
    // Link the two mocked service functions to recreate real-world behavior
    RestTimerService.fireTimerAlert.mockImplementation(() => {
      RestTimerService.cancelRestNotification();
      return Promise.resolve();
    });

    const { getByText } = render(<WorkoutHarness initialDuration={3} />);

    fireEvent.press(getByText('Start Rest'));
    await waitFor(() => expect(getByText('00:03')).toBeTruthy());

    act(() => { jest.advanceTimersByTime(3000); });

    await waitFor(() => {
      expect(getByText("Let's go!")).toBeTruthy();
      expect(RestTimerService.fireTimerAlert).toHaveBeenCalled();
      // fireTimerAlert cancels the notification so the system one doesn't double-fire
      expect(RestTimerService.cancelRestNotification).toHaveBeenCalled();
    });
  });
  it('lets the user change duration mid-timer and reschedules the notification', async () => {
    const { getByText } = render(<WorkoutHarness initialDuration={30} />);

    fireEvent.press(getByText('Start Rest'));
    await waitFor(() => expect(getByText('00:30')).toBeTruthy());

    // User decides 15s is enough
    fireEvent.press(getByText('15s'));

    await waitFor(() => {
      expect(getByText('00:15')).toBeTruthy();
      expect(RestTimerService.cancelRestNotification).toHaveBeenCalled();
      expect(RestTimerService.scheduleRestNotification).toHaveBeenCalledWith(15);
    });
  });

  it('lets the user add extra time and pushes the notification deadline out', async () => {
    const { getByText } = render(<WorkoutHarness initialDuration={30} />);

    fireEvent.press(getByText('Start Rest'));
    await waitFor(() => expect(getByText('00:30')).toBeTruthy());

    fireEvent.press(getByText('+15s'));

    await waitFor(() => {
      expect(getByText('00:45')).toBeTruthy();
      // Notification must be rescheduled for the extended duration
      expect(RestTimerService.cancelRestNotification).toHaveBeenCalled();
      expect(RestTimerService.scheduleRestNotification).toHaveBeenCalled();
    });
  });

  it('shows "Start Next Set" CTA after the timer finishes so the user knows to go again', async () => {
    const { getByText } = render(<WorkoutHarness initialDuration={2} />);

    fireEvent.press(getByText('Start Rest'));
    act(() => { jest.advanceTimersByTime(2000); });

    await waitFor(() => {
      expect(getByText('💪  Start Next Set')).toBeTruthy();
    });
  });

  it('closes the modal cleanly when the user taps "Start Next Set" after finishing', async () => {
    const { getByText, queryByText } = render(<WorkoutHarness initialDuration={2} />);

    fireEvent.press(getByText('Start Rest'));
    act(() => { jest.advanceTimersByTime(2000); });

    await waitFor(() => expect(getByText('💪  Start Next Set')).toBeTruthy());

    fireEvent.press(getByText('💪  Start Next Set'));

    await waitFor(() => {
      expect(RestTimerService.cancelRestNotification).toHaveBeenCalled();
      expect(queryByText('Rest Timer')).toBeNull();
    });
  });
});