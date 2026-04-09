import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ExerciseCard from '../components/ExerciseCard';
import ExercisePicker from '../components/ExercisePicker';
import { generateId } from '../utils/id';

export default function WorkoutLogger({ navigation }) {
  const [workoutName, setWorkoutName] = useState('My Workout');
  const [exercises, setExercises] = useState([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [startTime] = useState(new Date());

  // --- Handlers ---

  const handleAddExercise = useCallback((exerciseDef) => {
    const newExercise = {
      id: generateId(),
      exerciseId: exerciseDef.id,
      name: exerciseDef.name,
      muscle: exerciseDef.muscle,
      category: exerciseDef.category,
      sets: [{ id: generateId(), weight: '', reps: '' }],
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
    // Scenario 1B: No exercises
    if (exercises.length === 0) {
      setErrorMsg('Please add at least one exercise before saving.');
      return;
    }

    // Build payload
    const workout = {
      id: generateId(),
      name: workoutName.trim() || 'Unnamed Workout',
      startedAt: startTime.toISOString(),
      finishedAt: new Date().toISOString(),
      exercises: exercises.map(ex => ({
        exerciseId: ex.exerciseId,
        name: ex.name,
        muscle: ex.muscle,
        category: ex.category,
        sets: ex.sets.map(s => ({
          weight: parseFloat(s.weight) || 0,
          reps: parseInt(s.reps, 10) || 0,
        })),
      })),
    };

    try {
      await saveWorkout(workout);
      navigation.replace('WorkoutHistory');
    } catch (e) {
      Alert.alert('Error', 'Could not save workout. Please try again.');
    }
  };

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
          <View style={styles.topLeft}>
            <Text style={styles.workoutTitle}>
              {workoutName}
            </Text>
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
          {/* Error banner (Scenario 1B) */}
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
            />
          ))}

          {/* Empty state */}
          {exercises.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🏋️</Text>
              <Text style={styles.emptyTitle}>No exercises yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap "Add Exercise" to start logging your workout
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

          {/* Spacer */}
          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Exercise picker modal */}
        <ExercisePicker
          visible={pickerVisible}
          onSelect={handleAddExercise}
          onClose={() => setPickerVisible(false)}
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#181818',
  },
  topLeft: {
    flex: 1,
    marginRight: 12,
  },
  workoutTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    padding: 0,
  },
  workoutMeta: {
    fontSize: 12,
    color: '#555',
    marginTop: 2,
    fontWeight: '500',
  },
  finishBtn: {
    backgroundColor: '#C8FF00',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  finishBtnText: {
    color: '#0A0A0A',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
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
  errorIcon: {
    fontSize: 16,
  },
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
