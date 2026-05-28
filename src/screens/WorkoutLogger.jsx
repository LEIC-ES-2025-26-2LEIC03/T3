import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { saveWorkout, saveExerciseRating } from '../utils/firestoreDb';
import { auth } from '../utils/firebaseConfig';
import { SafeAreaView } from 'react-native-safe-area-context';
import ExerciseCard from '../components/ExerciseCard';
import ExercisePicker from '../components/ExercisePicker';
import ExerciseRatingModal from '../components/ExerciseRatingModal';
import RestTimerModal from '../components/RestTimerModal';
import { generateId } from '../utils/id';
import {
  requestNotificationPermissions,
  setupNotificationChannel,
  scheduleRestNotification,
  cancelRestNotification,
} from '../services/RestTimerService';

export default function WorkoutLogger({ navigation, route }) {
  const {
    preloadedExercises = [],
    workoutName: initialName = 'My Workout',
  } = route?.params ?? {};

  const [workoutName] = useState(initialName);
  const [exercises, setExercises] = useState(preloadedExercises);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [startTime] = useState(new Date());

  // ── Rating modal state ───────────────────────────────────────────────────
  // After a workout is saved we step through each exercise one by one,
  // showing the rating modal per exercise. We store the saved workoutId so
  // the rating can reference it.
  const [savedWorkoutId, setSavedWorkoutId] = useState(null);
  const [ratingQueue, setRatingQueue]       = useState([]);  // remaining exercises to rate
  const [currentRating, setCurrentRating]   = useState(null); // exercise being rated now
  
  // ── Rest timer state ──────────────────────────────────────────────────────
  const [restTimerVisible, setRestTimerVisible] = useState(false);
  const [restDuration, setRestDuration] = useState(10);

  // Request notification permissions on mount
  useEffect(() => {
    setupNotificationChannel();
    requestNotificationPermissions();
  }, []);

  // Called by SetRow's "Start Rest" button.
  // `duration` comes from set.restDuration (the last value the user picked in
  // the timer for this set), falling back to 90 s when not yet set.
  const handleStartRest = useCallback((duration = 10) => {
    setRestDuration(duration);
    setRestTimerVisible(true);
    scheduleRestNotification(duration);
  }, []);

  // Called when the user closes the rest timer modal (skip or "start next set").
  // We await the cancel so the notification is definitely gone before the modal
  // disappears — prevents a ghost notification firing a second later.
  const handleCloseRestTimer = useCallback(async () => {
    await cancelRestNotification();
    setRestTimerVisible(false);
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAddExercise = useCallback((exerciseDef) => {
    const newExercise = {
      id: generateId(),
      exerciseId: exerciseDef.id,
      name: exerciseDef.name,
      muscle: exerciseDef.muscle,
      category: exerciseDef.category,
      sets: [{ id: generateId(), weight: '', reps: '', rpe: null, notes: '', warmUp: false, restDuration: 10 }],
    };
    setExercises(prev => [...prev, newExercise]);
    setPickerVisible(false);
    setErrorMsg('');
  }, []);

  const handleUpdateExercise = useCallback((updatedExercise) => {
    setExercises(prev =>
      prev.map(ex => (ex.id === updatedExercise.id ? updatedExercise : ex))
    );
  }, []);

  const handleRemoveExercise = useCallback((exerciseId) => {
    setExercises(prev => prev.filter(ex => ex.id !== exerciseId));
  }, []);

  const handleFinishWorkout = async () => {
    // ── Validation ─────────────────────────────────────────────────────────
    if (exercises.length === 0) {
      setErrorMsg('Please add at least one exercise before finishing.');
      return;
    }

    for (const ex of exercises) {
      for (const s of ex.sets) {
        const hasRPE    = s.rpe !== null && s.rpe !== undefined;
        const hasWeight = s.weight !== '' && parseFloat(s.weight) > 0;
        const hasReps   = s.reps   !== '' && parseInt(s.reps, 10) > 0;

        if (hasRPE && (!hasWeight || !hasReps)) {
          Alert.alert(
            'Incomplete Set',
            `Please enter weight and reps for all the sets in ${ex.name}.`
          );
          return;
        }
      }
    }

    // ── Build workout object ─────────────────────────────────────────────────
    const workoutId = generateId();
    const workout = {
      id:         workoutId,
      name:       workoutName.trim() || 'Unnamed Workout',
      startedAt:  startTime.toISOString(),
      finishedAt: new Date().toISOString(),
      exercises: exercises.map(ex => ({
        exerciseId: ex.exerciseId,
        name:       ex.name,
        muscle:     ex.muscle,
        category:   ex.category,
        sets: ex.sets.map(s => ({
          weight: parseFloat(s.weight) || 0,
          reps:   parseInt(s.reps, 10) || 0,
          rpe:    s.rpe   || null,
          notes:  s.notes || '',
          // restDuration is UI-only; omit from the persisted payload
          warmUp: s.warmUp || false,
        })),
      })),
    };

    try {
      const userId = auth.currentUser?.uid;

      if (!userId) {
        Alert.alert('Error', 'Not signed in. Please restart the app.');
        return;
      }

      // Cancel any active rest timer when finishing
      await cancelRestNotification();
      setRestTimerVisible(false);

      await saveWorkout(userId, workout);

      // ── Trigger rating flow ───────────────────────────────────────────────
      // Build a queue of unique exercises (by exerciseId) to rate.
      const uniqueExercises = exercises.filter(
        (ex, idx, arr) => arr.findIndex(e => e.exerciseId === ex.exerciseId) === idx
      );

      setSavedWorkoutId(workoutId);
      const [first, ...rest] = uniqueExercises;
      setCurrentRating(first ?? null);
      setRatingQueue(rest);
    } catch (e) {
      Alert.alert('Error', 'Could not save workout. Please try again.');
    }
  };

  // ── Advance to next exercise or navigate away ─────────────────────────────
  const advanceRatingQueue = () => {
    if (ratingQueue.length === 0) {
      navigateAway();
      return;
    }
    const [next, ...rest] = ratingQueue;
    setCurrentRating(next);
    setRatingQueue(rest);
  };

  const navigateAway = () => {
    if (navigation.popToTop) navigation.popToTop();
    const parent = navigation.getParent?.();
    if (parent) {
      parent.navigate('HistoryTab');
    } else {
      navigation.navigate('HistoryTab');
    }
  };

  // ── Called by modal on submit ─────────────────────────────────────────────
  const handleRatingSubmit = async (ratingValue, comment) => {
    const userId = auth.currentUser?.uid;
    if (!userId || !currentRating || !savedWorkoutId) {
      console.error('RATING GUARD FAILED:', { userId, currentRating, savedWorkoutId });
      return;
    }

    // saveExerciseRating throws on network error → modal catches and shows retry
    await saveExerciseRating(userId, {
      exerciseId:   currentRating.exerciseId,
      exerciseName: currentRating.name,
      workoutId:    savedWorkoutId,
      rating:       ratingValue,
      comment,
    });

    advanceRatingQueue();
  };

  const handleRatingSkip = () => {
    advanceRatingQueue();
  };

  // ─────────────────────────────────────────────────────────────────────────

  const totalSets = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        {/* ── TOP BAR ── */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <View style={styles.topCenter}>
            <Text style={styles.workoutTitle}>{workoutName}</Text>
            <Text style={styles.workoutMeta}>
              {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
              {totalSets > 0 ? `  ·  ${totalSets} sets` : ''}
            </Text>
          </View>
          <TouchableOpacity style={styles.finishBtn} onPress={handleFinishWorkout}>
            <Text style={styles.finishBtnText}>Finish</Text>
          </TouchableOpacity>
        </View>

        {/* ── SCROLL AREA ── */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Error banner */}
          {errorMsg !== '' && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {/* Exercise cards */}
          {exercises.map(exercise => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onUpdate={handleUpdateExercise}
              onRemove={() => handleRemoveExercise(exercise.id)}
              onStartRest={handleStartRest}
            />
          ))}

          {/* Empty state */}
          {exercises.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🏋️</Text>
              <Text style={styles.emptyTitle}>No exercises yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap {'"'}Add Exercise{'&quot;'} to start logging your workout
              </Text>
            </View>
          )}

          {/* Add Exercise */}
          <TouchableOpacity
            style={styles.addExerciseBtn}
            onPress={() => {
              setErrorMsg('');
              setPickerVisible(true);
            }}
          >
            <Text style={styles.addExerciseText}>＋  Add Exercise</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Exercise picker modal */}
        <ExercisePicker
          visible={pickerVisible}
          onSelect={handleAddExercise}
          onClose={() => setPickerVisible(false)}
        />

        {/* ── Rating modal ── */}
        <ExerciseRatingModal
          visible={currentRating !== null}
          exerciseName={currentRating?.name ?? ''}
          onSubmit={handleRatingSubmit}
          onSkip={handleRatingSkip}
        />
        {/* Rest timer modal */}
        <RestTimerModal
          visible={restTimerVisible}
          duration={restDuration}
          onClose={handleCloseRestTimer}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#181818',
  },
  backBtn: {
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  topCenter: {
    flex: 1,
    marginHorizontal: 12,
    alignItems: 'center',
  },
  workoutTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  workoutMeta: {
    fontSize: 11,
    color: '#555',
    marginTop: 2,
    fontWeight: '500',
  },
  finishBtn: {
    backgroundColor: '#C8FF00',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  finishBtnText: {
    color: '#0A0A0A',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A1A1A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FF6B6B44',
    gap: 10,
  },
  errorIcon: { fontSize: 16 },
  errorText: {
    flex: 1,
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#444',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#333',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  addExerciseBtn: {
    backgroundColor: '#141414',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C8FF00',
    marginTop: 8,
  },
  addExerciseText: {
    color: '#C8FF00',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});