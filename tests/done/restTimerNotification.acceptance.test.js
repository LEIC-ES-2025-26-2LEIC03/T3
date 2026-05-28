import React, { useState } from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { View, TouchableOpacity, Text } from 'react-native';
import * as Notifications from 'expo-notifications';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Do NOT use jest.requireActual('react-native') — it triggers TurboModuleRegistry
// which is unavailable in the Jest/Node environment.
// The acceptance test renders RestTimerModal (which only uses Modal, View, Text,
// TouchableOpacity, StyleSheet, Animated) so we only need to stub those.
jest.mock('react-native', () => {
  const React = require('react');
  const mockVibrate = jest.fn();

  const View        = ({ children, style }) => React.createElement('View', { style }, children);
  const Text        = ({ children, style }) => React.createElement('Text', { style }, children);
  const TouchableOpacity = ({ children, onPress, style }) =>
    React.createElement('TouchableOpacity', { onPress, style }, children);
  const Modal       = ({ children, visible }) => visible
    ? React.createElement('Modal', {}, children)
    : null;
  const Animated    = {
    Value: class {
      constructor(v) { this._value = v; }
      setValue() {}
      interpolate() { return this; }
    },
    View: ({ children, style }) => React.createElement('View', { style }, children),
    timing:   () => ({ start: jest.fn(), stop: jest.fn() }),
    sequence: () => ({ start: jest.fn(), stop: jest.fn() }),
    loop:     (a) => ({ start: (cb) => { if (cb) cb({ finished: false }); }, stop: jest.fn() }),
  };
  const StyleSheet  = { create: (s) => s, flatten: (s) => s };
  const Platform    = { OS: 'ios', select: (obj) => obj.ios ?? obj.default };
  const Vibration   = { vibrate: mockVibrate };

  return {
    View, Text, TouchableOpacity, Modal, Animated, StyleSheet, Platform, Vibration,
    // Expose mockVibrate so tests can assert on it
    __mockVibrate: mockVibrate,
  };
});

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync:              jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync:          jest.fn(() => Promise.resolve({ status: 'granted' })),
  setNotificationChannelAsync:      jest.fn(() => Promise.resolve()),
  scheduleNotificationAsync:        jest.fn(() => Promise.resolve('notif-abc')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  AndroidImportance: { HIGH: 4 },
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  impactAsync:       jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success' },
  ImpactFeedbackStyle:      { Heavy: 'heavy' },
}));

// Import service + component AFTER mocks are set up
const RestTimerService = require('../../src/services/RestTimerService');
const RestTimerModal   = require('../../src/components/RestTimerModal').default;

// ─── Helpers ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── Harness ──────────────────────────────────────────────────────────────────

function WorkoutHarness({ initialDuration = 10 }) {
  const [visible, setVisible]   = useState(false);
  const [duration, setDuration] = useState(initialDuration);

  const handleStartRest = async (d = initialDuration) => {
    setDuration(d);
    setVisible(true);
    await RestTimerService.scheduleRestNotification(d);
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

describe('US-XX | Rest Timer Notification — acceptance tests', () => {

  it('schedules a background notification immediately when the timer starts', async () => {
    const { getByText } = render(<WorkoutHarness initialDuration={30} />);

    fireEvent.press(getByText('Start Rest'));

    await waitFor(() => {
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: "Rest time's up! 💪",
            body:  'Time to start your next set.',
          }),
          trigger: expect.objectContaining({ seconds: 30 }),
        })
      );
    });
  });

  it('cancels the background notification when the user skips rest early', async () => {
    const { getByText } = render(<WorkoutHarness initialDuration={30} />);

    fireEvent.press(getByText('Start Rest'));
    await waitFor(() => expect(getByText('Skip Rest')).toBeTruthy());

    fireEvent.press(getByText('Skip Rest'));

    await waitFor(() => {
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-abc');
    });
  });

  it('cancels the background notification when the in-app countdown finishes — prevents duplicate alert', async () => {
    const { getByText } = render(<WorkoutHarness initialDuration={3} />);

    fireEvent.press(getByText('Start Rest'));
    await waitFor(() => expect(getByText('00:03')).toBeTruthy());

    act(() => { jest.advanceTimersByTime(3000); });

    await waitFor(() => {
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalled();
      expect(getByText("Let's go!")).toBeTruthy();
    });
  });

  it('reschedules the notification when the user changes the duration', async () => {
    const { getByText } = render(<WorkoutHarness initialDuration={30} />);

    fireEvent.press(getByText('Start Rest'));
    await waitFor(() => expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1));

    fireEvent.press(getByText('15s'));

    await waitFor(() => {
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-abc');
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: expect.objectContaining({ seconds: 15 }),
        })
      );
    });
  });

  it('reschedules the notification when the user adds extra time', async () => {
    const { getByText } = render(<WorkoutHarness initialDuration={30} />);

    fireEvent.press(getByText('Start Rest'));
    await waitFor(() => expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1));

    fireEvent.press(getByText('+15s'));

    await waitFor(() => {
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalled();
      const calls    = Notifications.scheduleNotificationAsync.mock.calls;
      const lastSecs = calls[calls.length - 1][0].trigger.seconds;
      expect(lastSecs).toBeGreaterThan(30);
    });
  });

  it('cancels the notification when the user closes the modal after the timer finishes', async () => {
    const { getByText } = render(<WorkoutHarness initialDuration={2} />);

    fireEvent.press(getByText('Start Rest'));
    act(() => { jest.advanceTimersByTime(2000); });

    await waitFor(() => expect(getByText('💪  Start Next Set')).toBeTruthy());

    Notifications.cancelScheduledNotificationAsync.mockClear();
    fireEvent.press(getByText('💪  Start Next Set'));

    await waitFor(() => {
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalled();
    });
  });
});