import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal } from 'react-native';

export default function SetRow({ set, setNumber, onChange, onToggleWarmUp, onDelete }) {
  const [rpeModalVisible, setRpeModalVisible] = useState(false);

  return (
    <View style={[styles.setContainer, set.warmUp && styles.setContainerWarmUp]}>
      {/* TOP ROW: Set #, Weight, Reps, RPE and Delete */}
      <View style={styles.mainRow}>
        <TouchableOpacity
          style={[styles.setBadge, set.warmUp && styles.setBadgeWarmUp]}
          onPress={onToggleWarmUp}
        >
          <Text style={[styles.setNumber, set.warmUp && styles.setNumberWarmUp]}>
            {set.warmUp ? 'W' : setNumber}
          </Text>
        </TouchableOpacity>

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

        <TouchableOpacity 
          style={[styles.rpeButton, set.rpe && styles.rpeButtonActive]} 
          onPress={() => setRpeModalVisible(true)}
        >
          <Text style={[styles.rpeButtonText, set.rpe && styles.rpeButtonActiveText]}>
            {set.rpe !== null && set.rpe !== undefined ? set.rpe : 'RPE'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
          <Text style={styles.deleteIcon}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* BOTTOM ROW: Notes */}
      <View style={styles.extraRow}>
        <TextInput
          style={styles.notesInput}
          placeholder="Add note..."
          placeholderTextColor="#444"
          value={set.notes}
          onChangeText={val => onChange({ ...set, notes: val })}
        />
      </View>

      {/* RPE Picker Modal */}
      <Modal
        visible={rpeModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRpeModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPressOut={() => setRpeModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select RPE</Text>
            <View style={styles.rpeGrid}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                <TouchableOpacity
                  key={val}
                  style={[styles.rpeGridBtn, set.rpe === val && styles.rpeGridBtnActive]}
                  onPress={() => {
                    onChange({ ...set, rpe: val });
                    setRpeModalVisible(false);
                  }}
                >
                  <Text style={[styles.rpeGridBtnText, set.rpe === val && styles.rpeGridBtnActiveText]}>
                    {val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity 
              style={styles.clearRpeBtn}
              onPress={() => {
                onChange({ ...set, rpe: null });
                setRpeModalVisible(false);
              }}
            >
              <Text style={styles.clearRpeBtnText}>Clear RPE</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    gap: 6,
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
  setBadgeWarmUp: {
    borderWidth: 1,
    borderColor: '#FF8C00',
    backgroundColor: '#2A1200',
  },
  setNumber: {
    color: '#999',
    fontSize: 11,
    fontWeight: 'bold',
  },
  setNumberWarmUp: {
    color: '#FFAC33',
  },
  setContainerWarmUp: {
    borderColor: '#FF8C00',
  },
  inputGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    paddingHorizontal: 6,
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
    fontSize: 16,
  },
  rpeButton: {
    width: 40,
    marginLeft: 6,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rpeButtonActive: {
    borderColor: '#C8FF00',
    backgroundColor: '#1A1A1A',
  },
  rpeButtonText: {
    color: '#555',
    fontSize: 14,
    fontWeight: '600',
  },
  rpeButtonActiveText: {
    color: '#C8FF00',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 320,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  rpeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  rpeGridBtn: {
    width: 45,
    height: 45,
    borderRadius: 8,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rpeGridBtnActive: {
    backgroundColor: '#C8FF00',
  },
  rpeGridBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  rpeGridBtnActiveText: {
    color: '#000',
    fontWeight: 'bold',
  },
  clearRpeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#2A1A1A',
    borderWidth: 1,
    borderColor: '#FF6B6B44',
  },
  clearRpeBtnText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
  },
});