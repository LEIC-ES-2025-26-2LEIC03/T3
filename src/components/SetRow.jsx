import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export default function SetRow({ set, setNumber, onChange, onDelete }) {
  return (
    <View style={styles.row}>
      {/* Set number badge */}
      <View style={styles.setBadge}>
        <Text style={styles.setNumber}>{setNumber}</Text>
      </View>

      {/* Weight input */}
      <View style={styles.inputGroup}>
        <TextInput
          style={styles.input}
          value={set.weight}
          onChangeText={val => onChange({ ...set, weight: val })}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor="#444"
          maxLength={6}
        />
        <Text style={styles.unit}>kg</Text>
      </View>

      {/* Separator */}
      <Text style={styles.separator}>×</Text>

      {/* Reps input */}
      <View style={styles.inputGroup}>
        <TextInput
          style={styles.input}
          value={set.reps}
          onChangeText={val => onChange({ ...set, reps: val })}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor="#444"
          maxLength={3}
        />
        <Text style={styles.unit}>reps</Text>
      </View>

      {/* Delete button */}
      <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.deleteIcon}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  setBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumber: {
    color: '#666',
    fontSize: 12,
    fontWeight: '700',
  },
  inputGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 4,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    padding: 0,
  },
  unit: {
    color: '#555',
    fontSize: 11,
    fontWeight: '500',
  },
  separator: {
    color: '#444',
    fontSize: 16,
    fontWeight: '300',
  },
  deleteBtn: {
    width: 28,
    alignItems: 'center',
  },
  deleteIcon: {
    color: '#444',
    fontSize: 12,
    fontWeight: '600',
  },
});
