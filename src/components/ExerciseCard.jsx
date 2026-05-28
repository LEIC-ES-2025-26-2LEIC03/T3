import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import SetRow from './SetRow';
import { generateId } from '../utils/id';

export default function ExerciseCard({ exercise, onUpdate, onRemove, onStartRest }) {
  const addSet = () => {
    const lastSet = exercise.sets[exercise.sets.length - 1];
    const newSet = {
      id: generateId(),
      weight: lastSet?.weight ?? '',
      reps: lastSet?.reps ?? '',
      rpe: lastSet?.rpe ?? null,
      notes: lastSet?.notes ?? '',
      warmUp: false,
    };
    onUpdate({ ...exercise, sets: [...exercise.sets, newSet] });
  };

  const updateSet = (setId, updatedSet) => {
    onUpdate({
      ...exercise,
      sets: exercise.sets.map(s => (s.id === setId ? updatedSet : s)),
    });
  };

  const toggleWarmUp = (setId) => {
    onUpdate({
      ...exercise,
      sets: exercise.sets.map((s) =>
        s.id === setId ? { ...s, warmUp: !s.warmUp } : s
      ),
    });
  };

  const getSetLabel = (index) => {
    const currentSet = exercise.sets[index];
    if (currentSet.warmUp) {
      return 'W';
    }

    return (
      exercise.sets.slice(0, index).filter((s) => !s.warmUp).length + 1
    );
  };

  const deleteSet = (setId) => {
    onUpdate({ ...exercise, sets: exercise.sets.filter(s => s.id !== setId) });
  };

  return (
    <View style={styles.card}>
      {/* Exercise header */}
      <View style={styles.header}>
        <View style={styles.titleArea}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <Text style={styles.muscleTag}>{exercise.muscle}</Text>
        </View>
        <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
          <Text style={styles.removeText}>Remove</Text>
        </TouchableOpacity>
      </View>

      {/* Column labels */}
      {exercise.sets.length > 0 && (
        <View style={styles.columnLabels}>
          <View style={styles.labelSpacer} />
          <Text style={styles.columnLabel}>Weight</Text>
          <Text style={styles.columnLabelCenter}>×</Text>
          <Text style={styles.columnLabel}>Reps</Text>
          <Text style={[styles.columnLabel, { flex: 0, width: 40, marginLeft: 6 }]}>RPE</Text>
          <View style={styles.labelSpacer} />
        </View>
      )}

      {/* Sets */}
      {exercise.sets.map((set, index) => (
        <SetRow
          key={set.id}
          set={set}
          setNumber={getSetLabel(index)}
          onChange={(updated) => updateSet(set.id, updated)}
          onToggleWarmUp={() => toggleWarmUp(set.id)}
          onDelete={() => deleteSet(set.id)}
          onStartRest={onStartRest}
        />
      ))}

      {/* Add set button */}
      <TouchableOpacity style={styles.addSetBtn} onPress={addSet}>
        <Text style={styles.addSetText}>+ Add Set</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#141414',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleArea: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  muscleTag: {
    fontSize: 11,
    color: '#C8FF00',
    marginTop: 3,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  removeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#1E1E1E',
  },
  removeText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '600',
  },
  columnLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 10,
  },
  labelSpacer: {
    width: 28,
  },
  columnLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    color: '#555',
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  columnLabelCenter: {
    color: '#333',
    fontSize: 14,
  },
  addSetBtn: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addSetText: {
    color: '#C8FF00',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});