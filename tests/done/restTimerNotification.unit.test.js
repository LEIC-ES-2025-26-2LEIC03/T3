import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Must mock react-native fully — jest.requireActual triggers TurboModuleRegistry
// which is not available in the Jest/Node environment.
const mockVibrate = jest.fn();
let mockPlatformOS = 'ios';

jest.mock('react-native', () => ({
  Platform: {
    get OS() { return mockPlatformOS; },
    select: jest.fn(obj => obj.ios ?? obj.default),
  },
  Vibration: { vibrate: mockVibrate },
  // Stubs for anything else RestTimerService or its deps may import
  NativeModules: {},
  NativeEventEmitter: jest.fn(() => ({ addListener: jest.fn(), removeAllListeners: jest.fn() })),
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('mock-notif-id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  AndroidImportance: { HIGH: 4 },
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success' },
  ImpactFeedbackStyle: { Heavy: 'heavy' },
}));

// Import AFTER mocks are registered
const {
  scheduleRestNotification,
  cancelRestNotification,
  fireTimerAlert,
  setupNotificationChannel,
  requestNotificationPermissions,
} = require('../../src/services/RestTimerService');

// ─── Unit tests ───────────────────────────────────────────────────────────────

describe('US-XX | RestTimerService — unit tests', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    mockPlatformOS = 'ios';
  });

  // ── scheduleRestNotification ───────────────────────────────────────────────

  describe('scheduleRestNotification', () => {
    it('calls scheduleNotificationAsync with the correct seconds', async () => {
      await scheduleRestNotification(90);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: expect.objectContaining({ seconds: 90 }),
        })
      );
    });

    it('cancels any existing notification before scheduling a new one', async () => {
      await scheduleRestNotification(60);
      Notifications.cancelScheduledNotificationAsync.mockClear();

      await scheduleRestNotification(90);
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('mock-notif-id');
    });

    it('clamps the duration to a minimum of 1 second', async () => {
      await scheduleRestNotification(0);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: expect.objectContaining({ seconds: 1 }),
        })
      );
    });

    it('returns the notification id from expo-notifications', async () => {
      const id = await scheduleRestNotification(30);
      expect(id).toBe('mock-notif-id');
    });

    it('includes the correct notification title and body', async () => {
      await scheduleRestNotification(60);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: "Rest time's up! 💪",
            body: 'Time to start your next set.',
          }),
        })
      );
    });
  });

  // ── cancelRestNotification ─────────────────────────────────────────────────

  describe('cancelRestNotification', () => {
    it('cancels the scheduled notification when one exists', async () => {
      await scheduleRestNotification(60);
      await cancelRestNotification();
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('mock-notif-id');
    });

    it('does not throw when called with no notification scheduled', async () => {
      await cancelRestNotification();
      expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
    });

    it('clears the stored id so a subsequent cancel is a no-op', async () => {
      await scheduleRestNotification(60);
      await cancelRestNotification();
      Notifications.cancelScheduledNotificationAsync.mockClear();

      await cancelRestNotification();
      expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
    });
  });

  // ── fireTimerAlert ─────────────────────────────────────────────────────────

  describe('fireTimerAlert', () => {
    it('cancels the scheduled notification so the system one does not double-fire', async () => {
      await scheduleRestNotification(60);
      await fireTimerAlert();
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalled();
    });

    it('triggers device vibration', async () => {
      await fireTimerAlert();
      expect(mockVibrate).toHaveBeenCalled();
    });

    it('fires haptic feedback on iOS', async () => {
      mockPlatformOS = 'ios';
      await fireTimerAlert();
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success
      );
    });

    it('does not fire haptic feedback on Android', async () => {
      mockPlatformOS = 'android';
      await fireTimerAlert();
      expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    });
  });

  // ── requestNotificationPermissions ────────────────────────────────────────

  describe('requestNotificationPermissions', () => {
    it('returns true when permission is already granted', async () => {
      Notifications.getPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
      const result = await requestNotificationPermissions();
      expect(result).toBe(true);
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('requests permission and returns true when granted by the user', async () => {
      Notifications.getPermissionsAsync.mockResolvedValueOnce({ status: 'undetermined' });
      Notifications.requestPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
      const result = await requestNotificationPermissions();
      expect(result).toBe(true);
    });

    it('returns false when the user denies permission', async () => {
      Notifications.getPermissionsAsync.mockResolvedValueOnce({ status: 'undetermined' });
      Notifications.requestPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
      const result = await requestNotificationPermissions();
      expect(result).toBe(false);
    });
  });

  // ── setupNotificationChannel ───────────────────────────────────────────────

  describe('setupNotificationChannel', () => {
    it('creates the rest-timer channel on Android', async () => {
      mockPlatformOS = 'android';
      await setupNotificationChannel();
      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
        'rest-timer',
        expect.objectContaining({ importance: Notifications.AndroidImportance.HIGH })
      );
    });

    it('does not create a channel on iOS', async () => {
      mockPlatformOS = 'ios';
      await setupNotificationChannel();
      expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
    });
  });
});