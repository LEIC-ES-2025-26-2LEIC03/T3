import React, { useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import StartWorkoutActions from '../components/StartWorkoutActions';
import TemplateCard from '../components/TemplateCard';
import { fetchTemplates, buildExercisesFromTemplate, deleteTemplate } from '../utils/db';
import { TEMPLATES as EXAMPLE_TEMPLATES, buildExercisesFromTemplate as buildFromStatic } from '../data/templates';

export default function HomeScreen({ navigation }) {
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  // Track whether this is the very first load — subsequent focus events
  // (e.g. returning from WorkoutLogger) should refresh silently, no spinner.
  const hasLoadedOnce = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedOnce.current) {
        // First mount: show spinner
        setLoading(true);
      }
      fetchTemplates()
        .then(setTemplates)
        .finally(() => {
          setLoading(false);
          hasLoadedOnce.current = true;
        });
    }, [])
  );

  const handleStartEmpty = () => {
    navigation.navigate('WorkoutLogger', { preloadedExercises: [] });
  };

  const handleCreateTemplate = () => {
    navigation.navigate('TemplateBuilder');
  };

  const handleUseTemplate = (template) => {
    const exercises = typeof template.exercises[0] === 'string'
      ? buildFromStatic(template.exercises)
      : buildExercisesFromTemplate(template.exercises);

    navigation.navigate('WorkoutLogger', {
      preloadedExercises: exercises,
      workoutName: template.name,
    });
  };

  const handleEditTemplate = (template) => {
    navigation.navigate('TemplateBuilder', { templateId: template.id });
  };

  const handleDuplicateTemplate = (template) => {
  navigation.navigate('TemplateBuilder', {
    duplicateFromTemplateId: template.id,
  });
};

  const handleDeleteTemplate = (template) => {
    Alert.alert(
      'Delete Template',
      `Are you sure you want to delete "${template.name}"? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTemplate(template.id);
            setTemplates(prev => prev.filter(t => t.id !== template.id));
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
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

        {/* ── My Templates ── */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>My Templates</Text>

        {loading ? (
          <ActivityIndicator color="#C8FF00" style={{ marginTop: 16 }} />
        ) : templates.length === 0 ? (
          <View style={styles.noTemplates}>
            <Text style={styles.noTemplatesText}>
              No templates yet — tap{' '}
              <Text style={styles.noTemplatesAccent}>Create Template</Text>
              {' '}to build your first one.
            </Text>
          </View>
        ) : (
          templates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              onPress={() => handleUseTemplate(template)}
              onEdit={() => handleEditTemplate(template)}
              onDuplicate={() => handleDuplicateTemplate(template)}
              onDelete={() => handleDeleteTemplate(template)}
            />
          ))
        )}

        {/* ── Example Templates ── */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Example Templates</Text>
        {EXAMPLE_TEMPLATES.map(template => (
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
  logoAccent: { color: '#C8FF00' },
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
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  greeting: { paddingTop: 16, paddingBottom: 24 },
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
  greetAccent: { color: '#C8FF00' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#444',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  noTemplates: {
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  noTemplatesText: {
    color: '#555',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  noTemplatesAccent: {
    color: '#C8FF00',
    fontWeight: '700',
  },
});
