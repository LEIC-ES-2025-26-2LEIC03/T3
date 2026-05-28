import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';

// ─── Safe Notifications Import ────────────────────────────────────────────────
let Notifications = null;
try {
  Notifications = require('expo-notifications');
  
  // Show alert + sound even when the app is in the foreground
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (e) {
  console.warn('Notifications module unavailable (Android Expo Go):', e.message);
}

// ─── Permission request ───────────────────────────────────────────────────────

export async function requestNotificationPermissions() {
  if (!Notifications) return false;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.warn('Notifications permission check failed:', e.message);
    return false;
  }
}

// ─── Notification channel (Android) ──────────────────────────────────────────

export async function setupNotificationChannel() {
  if (!Notifications) return;
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('rest-timer', {
        name: 'Rest Timer',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 400, 200, 400],
        enableVibrate: true,
        sound: 'default',
      });
    } catch (e) {
      console.warn('Notification channel setup failed:', e.message);
    }
  }
}

// ─── Schedule / cancel ────────────────────────────────────────────────────────

let _scheduledNotificationId = null;

export async function scheduleRestNotification(seconds) {
  if (!Notifications) return null;
  // Always cancel any existing notification first to avoid duplicates
  await cancelRestNotification();

  // Guard: expo-notifications requires seconds >= 1
  const safeSecs = Math.max(1, Math.round(seconds));

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Rest time's up! 💪",
        body: 'Time to start your next set.',
        sound: 'default',
        // On Android the channelId must match what we created above
        ...(Platform.OS === 'android' && { channelId: 'rest-timer' }),
      },
      // Use the seconds-based trigger format that works across Expo SDK 49–51.
      // Some SDK versions use { seconds } directly; others need the type field.
      // We try the typed form first and fall back if it throws.
      trigger: { seconds: safeSecs },
    });

    _scheduledNotificationId = id;
    return id;
  } catch {
    // Fallback trigger shape for older Expo SDK versions
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Rest time's up! 💪",
          body: 'Time to start your next set.',
          sound: 'default',
          ...(Platform.OS === 'android' && { channelId: 'rest-timer' }),
        },
        trigger: {
          type: 'timeInterval',
          seconds: safeSecs,
          repeats: false,
        },
      });
      _scheduledNotificationId = id;
      return id;
    } catch (err) {
      console.warn('[RestTimerService] Could not schedule notification:', err);
      return null;
    }
  }
}

export async function cancelRestNotification() {
  if (!Notifications) return;
  if (_scheduledNotificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(_scheduledNotificationId);
    } catch {
      // Already fired or never scheduled — safe to ignore
    }
    _scheduledNotificationId = null;
  }
}

// ─── In-app alert (timer hits zero while app is open) ────────────────────────

/**
 * Called by RestTimerModal when the countdown reaches zero.
 *
 * Responsibilities:
 *  1. Cancel the background notification — the app is open so we handle it here,
 *     and we don't want a duplicate system notification firing a moment later.
 *  2. Fire vibration feedback that works on both iOS and Android.
 *  3. Attempt haptic feedback on iOS (no-op on Android — Vibration covers it).
 */
export async function fireTimerAlert() {
  // 1. Cancel the scheduled notification — we're handling the alert in-app.
  await cancelRestNotification();

  // 2. Cross-platform vibration: works on both iOS and Android.
  //    Pattern: [wait, vibrate, wait, vibrate] in ms
  Vibration.vibrate([0, 400, 200, 400]);

  // 3. iOS haptic on top of vibration for a richer feel.
  if (Platform.OS === 'ios') {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, 300);
    } catch {
      // Haptics not available on this device — vibration above is sufficient
    }
  }
}