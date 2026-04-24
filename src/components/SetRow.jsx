import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

export default function SetRow({ set, setNumber, onChange, onDelete }) {
  return (
    <View style={styles.setContainer}>
      {/* TOP ROW: Set #, Weight, Reps, and Delete */}
      <View style={styles.mainRow}>
        <View style={styles.setBadge}>
          <Text style={styles.setNumber}>{setNumber}</Text>
        </View>

        <View style={styles.inputGroup}>
          <TextInput
            style={styles.input}
            value={set.weight}
            onChangeText={val => onChange({ ...set, weight: val })}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#444"
          />
          <Text style={styles.unit}>kg</Text>
        </View>

        <Text style={styles.separator}>×</Text>

        <View style={styles.inputGroup}>
          <TextInput
            style={styles.input}
            value={set.reps}
            onChangeText={val => onChange({ ...set, reps: val })}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor="#444"
          />
          <Text style={styles.unit}>reps</Text>
        </View>

        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
          <Text style={styles.deleteIcon}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* BOTTOM ROW: RPE and Notes */}
      <View style={styles.extraRow}>
        <View style={styles.rpeSection}>
          <Text style={styles.rpeLabel}>RPE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rpeScroll}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
              <TouchableOpacity
                key={val}
                style={[styles.rpeBtn, set.rpe === val && styles.rpeBtnActive]}
                onPress={() => onChange({ ...set, rpe: val })}
              >
                <Text style={[styles.rpeBtnText, set.rpe === val && styles.rpeBtnActiveText]}>{val}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <TextInput
          style={styles.notesInput}
          placeholder="Add note..."
          placeholderTextColor="#444"
          value={set.notes}
          onChangeText={val => onChange({ ...set, notes: val })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  setContainer: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#222',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  extraRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  setBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumber: {
    color: '#999',
    fontSize: 11,
    fontWeight: 'bold',
  },
  inputGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 40,
  },
  input: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  unit: {
    color: '#555',
    fontSize: 10,
  },
  separator: {
    color: '#333',
    fontSize: 18,
  },
  rpeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rpeLabel: {
    color: '#C8FF00',
    fontSize: 11,
    fontWeight: '800',
    marginRight: 10,
  },
  rpeScroll: {
    flex: 1,
  },
  rpeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#1A1A1A',
    marginRight: 6,
  },
  rpeBtnActive: {
    backgroundColor: '#C8FF00',
  },
  rpeBtnText: {
    color: '#666',
    fontSize: 12,
  },
  rpeBtnActiveText: {
    color: '#000',
    fontWeight: 'bold',
  },
  notesInput: {
    color: '#888',
    fontSize: 12,
    fontStyle: 'italic',
    backgroundColor: '#161616',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deleteBtn: {
    padding: 4,
  },
  deleteIcon: {
    color: '#444',
    fontSize: 14,
  },
});