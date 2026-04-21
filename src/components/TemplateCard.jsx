import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
 
export default function TemplateCard({ template, onPress, onEdit }) {
  // template.exercises comes from db.js as full objects: [{id, name, muscle, ...}]
  const muscleList = [
    ...new Set(template.exercises.map(e => e.muscle).filter(Boolean)),
  ].slice(0, 3).join(', ');
 
  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.left} onPress={onPress} activeOpacity={0.75}>
        <Text style={styles.name}>{template.name}</Text>
        <Text style={styles.meta}>
          {template.exercises.length} exercises{muscleList ? ` · ${muscleList}` : ''}
        </Text>
        {template.tag ? (
          <View style={styles.tagBadge}>
            <Text style={styles.tagText}>{template.tag}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
 
      <View style={styles.actions}>
        {onEdit && (
          <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
 
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#141414',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#222',
    flexDirection: 'row',
    alignItems: 'center',
  },
  left: { flex: 1 },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  meta: {
    fontSize: 11,
    color: '#555',
    fontWeight: '600',
    marginTop: 3,
    letterSpacing: 0.3,
  },
  tagBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(200,255,0,0.08)',
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C8FF00',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 10,
  },
  editBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#1E1E1E',
  },
  editText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '700',
  },
  arrow: {
    fontSize: 22,
    color: '#333',
    fontWeight: '300',
  },
});