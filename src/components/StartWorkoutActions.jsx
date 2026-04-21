import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function StartWorkoutActions({ onStartEmpty, onCreateTemplate }) {
  return (
    <View>
      {/* Start Empty Workout */}
      <TouchableOpacity style={styles.startBtn} onPress={onStartEmpty} activeOpacity={0.88}>
        <View>
          <Text style={styles.startBtnTitle}>Start Empty Workout</Text>
          <Text style={styles.startBtnSub}>Log freely, no template needed</Text>
        </View>
        <View style={styles.startArrow}>
          <Text style={styles.startArrowText}>→</Text>
        </View>
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Create Template */}
      <TouchableOpacity style={styles.createBtn} onPress={onCreateTemplate} activeOpacity={0.8}>
        <View>
          <Text style={styles.createBtnTitle}>＋  Create Template</Text>
          <Text style={styles.createBtnSub}>Build a reusable workout plan</Text>
        </View>
        <View style={styles.plusIcon}>
          <Text style={styles.plusIconText}>＋</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  startBtn: {
    backgroundColor: '#C8FF00',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  startBtnTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0A0A0A',
    letterSpacing: 0.2,
  },
  startBtnSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4A6000',
    marginTop: 3,
    letterSpacing: 0.3,
  },
  startArrow: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startArrowText: {
    fontSize: 18,
    color: '#0A0A0A',
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1E1E1E',
  },
  dividerText: {
    fontSize: 11,
    color: '#333',
    fontWeight: '700',
    letterSpacing: 1,
  },
  createBtn: {
    backgroundColor: '#111111',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderStyle: 'dashed',
  },
  createBtnTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#C8FF00',
    letterSpacing: 0.3,
  },
  createBtnSub: {
    fontSize: 11,
    color: '#444',
    fontWeight: '600',
    marginTop: 3,
  },
  plusIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusIconText: {
    fontSize: 18,
    color: '#C8FF00',
    fontWeight: '300',
  },
});
