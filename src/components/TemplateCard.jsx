import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { getMuscleLabel } from '../data/templates';

export default function TemplateCard({ template, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.left}>
        <Text style={styles.name}>{template.name}</Text>
        <Text style={styles.meta}>
          {template.exercises.length} exercises · {getMuscleLabel(template.exercises)}
        </Text>
        <View style={styles.tagBadge}>
          <Text style={styles.tagText}>{template.tag}</Text>
        </View>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
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
  left: {
    flex: 1,
  },
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
  arrow: {
    fontSize: 22,
    color: '#333',
    marginLeft: 10,
    fontWeight: '300',
  },
});
