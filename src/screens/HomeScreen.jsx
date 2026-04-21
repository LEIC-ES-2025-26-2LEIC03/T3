import React from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StartWorkoutActions from '../components/StartWorkoutActions';
import TemplateCard from '../components/TemplateCard';
import { TEMPLATES, buildExercisesFromTemplate } from '../data/templates';

export default function HomeScreen({ navigation }) {
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const handleStartEmpty = () => {
    navigation.navigate('WorkoutLogger', { preloadedExercises: [] });
  };

  const handleCreateTemplate = () => {
    Alert.alert(
      'Create Template',
      'Template builder coming soon! For now, start an empty workout to log freely.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start Empty Workout', onPress: handleStartEmpty },
      ]
    );
  };

  const handleUseTemplate = (template) => {
    const exercises = buildExercisesFromTemplate(template.exercises);
    navigation.navigate('WorkoutLogger', {
      preloadedExercises: exercises,
      workoutName: template.name,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <Text style={styles.logo}>
          W<Text style={styles.logoAccent}>8</Text>
        </Text>
        <View style={styles.avatarCircle}>
          <View style={styles.avatarInner} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Greeting ── */}
        <View style={styles.greeting}>
          <Text style={styles.greetDate}>{today}</Text>
          <Text style={styles.greetTitle}>
            Ready to <Text style={styles.greetAccent}>lift?</Text>
          </Text>
        </View>

        {/* ── CTA cluster ── */}
        <Text style={styles.sectionLabel}>Quick Start</Text>
        <StartWorkoutActions
          onStartEmpty={handleStartEmpty}
          onCreateTemplate={handleCreateTemplate}
        />

        {/* ── Example Templates ── */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Example Templates</Text>
        {TEMPLATES.map(template => (
          <TemplateCard
            key={template.id}
            template={template}
            onPress={() => handleUseTemplate(template)}
          />
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  logo: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  logoAccent: {
    color: '#C8FF00',
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1E1E1E',
    borderWidth: 1.5,
    borderColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  greeting: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  greetDate: {
    fontSize: 12,
    color: '#555',
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  greetTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  greetAccent: {
    color: '#C8FF00',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#444',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
});
