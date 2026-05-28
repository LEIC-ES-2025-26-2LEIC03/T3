import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import {
  cancelRestNotification,
  scheduleRestNotification,
  fireTimerAlert,
} from '../services/RestTimerService';

const DEFAULT_DURATIONS = [10, 15, 30, 60, 90];

export default function RestTimerModal({ visible, duration, onClose }) {
  const [secondsLeft, setSecondsLeft]           = useState(duration ?? 10);
  const [selectedDuration, setSelectedDuration] = useState(duration ?? 10);
  const [finished, setFinished]                 = useState(false);

  // Bumping this counter is the only way to (re)start the countdown effect.
  // It avoids the stale-closure / deps problem entirely: any code that wants
  // a fresh interval just increments this value.
  const [tickKey, setTickKey] = useState(0);

  const intervalRef = useRef(null);
  const pulseAnim   = useRef(new Animated.Value(1)).current;

  // ── Reset when the modal opens (or the caller changes the duration) ────────
  useEffect(() => {
    if (!visible) return;

    clearInterval(intervalRef.current);
    const d = duration ?? 90;
    setSecondsLeft(d);
    setSelectedDuration(d);
    setFinished(false);
    setTickKey(k => k + 1);
  }, [visible, duration]);

  // ── Countdown tick ─────────────────────────────────────────────────────────
  // Keyed on `tickKey` so any call to setTickKey restarts this effect cleanly,
  // independent of whether `finished` or `visible` changed.
  useEffect(() => {
    if (!visible || finished) return;

    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setFinished(true);
          fireTimerAlert();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, finished, tickKey]);

  // ── Pulse animation when finished ─────────────────────────────────────────
  useEffect(() => {
    if (!finished) {
      pulseAnim.setValue(1);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 500, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [finished, pulseAnim]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleClose = useCallback(async () => {
    clearInterval(intervalRef.current);
    await cancelRestNotification();
    onClose();
  }, [onClose]);

  // User taps one of the preset duration chips.
  // Must: reset the countdown AND reschedule the background notification.
  const handleChangeDuration = useCallback(async (secs) => {
    clearInterval(intervalRef.current);
    setSelectedDuration(secs);
    setSecondsLeft(secs);
    setFinished(false);
    setTickKey(k => k + 1); // restarts the countdown effect

    await cancelRestNotification();
    await scheduleRestNotification(secs);
  }, []);

  // User taps +15s / +30s / +60s.
  // Must: add time to the running countdown AND push the notification out.
  const handleAddTime = useCallback((extraSecs) => {
    setSecondsLeft(prev => {
      const next = prev + extraSecs;
      // Reschedule the background notification for the new remaining time.
      // Fire-and-forget is intentional — we don't want to block the UI.
      cancelRestNotification().then(() => scheduleRestNotification(next));
      return next;
    });

    // If the timer had already finished, restart it.
    if (finished) {
      setFinished(false);
      setTickKey(k => k + 1);
    }
  }, [finished]);

  // ── Derived display values ─────────────────────────────────────────────────

  const minutes    = Math.floor(secondsLeft / 60);
  const seconds    = secondsLeft % 60;
  const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Clamp to [0, 1] so adding extra time beyond selectedDuration
  // doesn't make the progress bar overflow.
  const progress = selectedDuration > 0
    ? Math.min(1, Math.max(0, secondsLeft / selectedDuration))
    : 0;

  const isLow = secondsLeft <= 10 && !finished;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>

          {/* ── Handle ── */}
          <View style={styles.handle} />

          {/* ── Header ── */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Rest Timer</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* ── Duration preset chips ── */}
          <View style={styles.durationRow}>
            {DEFAULT_DURATIONS.map(d => (
              <TouchableOpacity
                key={d}
                style={[
                  styles.durationChip,
                  selectedDuration === d && styles.durationChipActive,
                ]}
                onPress={() => handleChangeDuration(d)}
              >
                <Text style={[
                  styles.durationChipText,
                  selectedDuration === d && styles.durationChipTextActive,
                ]}>
                  {d >= 60 ? `${d / 60}m` : `${d}s`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Countdown ring ── */}
          <Animated.View style={[
            styles.timerContainer,
            finished && { transform: [{ scale: pulseAnim }] },
          ]}>
            <View style={[
              styles.timerRing,
              isLow    && styles.timerRingLow,
              finished && styles.timerRingFinished,
            ]}>
              <Text style={[
                styles.timerText,
                isLow    && styles.timerTextLow,
                finished && styles.timerTextFinished,
              ]}>
                {finished ? "Let's go!" : timeString}
              </Text>
              {!finished && <Text style={styles.timerSub}>rest</Text>}
            </View>
          </Animated.View>

          {/* ── Progress bar ── */}
          {!finished && (
            <View style={styles.progressTrack}>
              <View style={[
                styles.progressFill,
                { width: `${progress * 100}%` },
                isLow && styles.progressFillLow,
              ]} />
            </View>
          )}

          {/* ── Add-time buttons ── */}
          {!finished && (
            <View style={styles.addTimeRow}>
              <Text style={styles.addTimeLabel}>Add time</Text>
              {[15, 30, 60].map(t => (
                <TouchableOpacity
                  key={t}
                  style={styles.addTimeBtn}
                  onPress={() => handleAddTime(t)}
                >
                  <Text style={styles.addTimeBtnText}>+{t}s</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── Skip / Done button ── */}
          <TouchableOpacity
            style={[styles.skipBtn, finished && styles.skipBtnFinished]}
            onPress={handleClose}
          >
            <Text style={[styles.skipBtnText, finished && styles.skipBtnTextFinished]}>
              {finished ? '💪  Start Next Set' : 'Skip Rest'}
            </Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#141414',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: '#222',
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },

  // Duration chips
  durationRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 28,
  },
  durationChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  durationChipActive: {
    backgroundColor: 'rgba(200,255,0,0.12)',
    borderColor: '#C8FF00',
  },
  durationChipText: {
    color: '#555',
    fontSize: 13,
    fontWeight: '700',
  },
  durationChipTextActive: {
    color: '#C8FF00',
  },

  // Timer ring
  timerContainer: {
    marginBottom: 24,
  },
  timerRing: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 4,
    borderColor: '#C8FF00',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F0F0F',
  },
  timerRingLow: {
    borderColor: '#FF6B6B',
  },
  timerRingFinished: {
    borderColor: '#C8FF00',
    backgroundColor: 'rgba(200,255,0,0.06)',
  },
  timerText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  timerTextLow: {
    color: '#FF6B6B',
  },
  timerTextFinished: {
    fontSize: 28,
    color: '#C8FF00',
    letterSpacing: 0,
  },
  timerSub: {
    fontSize: 12,
    color: '#444',
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 4,
  },

  // Progress bar
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: '#1E1E1E',
    borderRadius: 2,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#C8FF00',
    borderRadius: 2,
  },
  progressFillLow: {
    backgroundColor: '#FF6B6B',
  },

  // Add time
  addTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  addTimeLabel: {
    color: '#444',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  addTimeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  addTimeBtnText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '700',
  },

  // Skip / done
  skipBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  skipBtnFinished: {
    backgroundColor: '#C8FF00',
    borderColor: '#C8FF00',
  },
  skipBtnText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  skipBtnTextFinished: {
    color: '#0A0A0A',
  },
});