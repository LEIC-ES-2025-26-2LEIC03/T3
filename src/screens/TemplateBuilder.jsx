import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ExercisePicker from '../components/ExercisePicker';
import { generateId } from '../utils/id';
import {
  createTemplate,
  updateTemplate,
  fetchTemplates,
  fetchTemplateById,
  templateNameExists,
} from '../utils/firestoreDb';
import { auth } from '../utils/firebaseConfig';


const TAG_OPTIONS = ['Push', 'Pull', 'Legs', 'Full Upper', 'Full Body', 'Core', 'Cardio', 'Custom'];

export default function TemplateBuilder({ navigation, route }) {
  const editingId = route?.params?.templateId ?? null;
  const duplicateFromTemplateId = route?.params?.duplicateFromTemplateId ?? null;
  const isDuplicateMode = !!duplicateFromTemplateId;

  const userId = auth.currentUser?.uid;
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [selectedExercises, setSelectedExercises] = useState([]); // [{id, name, muscle, category}]
  const [pickerVisible, setPickerVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!editingId || !!duplicateFromTemplateId);

  // Load template data if editing
  useEffect(() => {
  const sourceId = editingId ?? duplicateFromTemplateId;
  if (!sourceId) return;

  fetchTemplates(userId)
    .then(templates => {
      const t = templates.find(t => t.id === sourceId);

      if (!t) {
        Alert.alert(
          'Template not found',
          isDuplicateMode
            ? 'The original template no longer exists, so it cannot be duplicated.'
            : 'This template no longer exists.'
        );
        navigation.goBack();
        return;
      }

      if (isDuplicateMode) {
        setName(`${t.name} (Copy)`);
      } else {
        setName(t.name);
      }

      setTag(t.tag);
      setSelectedExercises(t.exercises);
      setLoading(false);
    })
    .catch(() => {
      Alert.alert('Error', 'Could not load template.');
      navigation.goBack();
    });
}, [editingId, duplicateFromTemplateId, isDuplicateMode, navigation]);

  const handleAddExercise = useCallback((exerciseDef) => {
    // Prevent duplicates
    if (selectedExercises.find(e => e.id === exerciseDef.id)) {
      Alert.alert('Already added', `"${exerciseDef.name}" is already in this template.`);
      setPickerVisible(false);
      return;
    }
    setSelectedExercises(prev => [...prev, exerciseDef]);
    setPickerVisible(false);
  }, [selectedExercises]);

  const handleRemoveExercise = useCallback((exerciseId) => {
    setSelectedExercises(prev => prev.filter(e => e.id !== exerciseId));
  }, []);

  // Drag to reorder — simple move up/down arrows for now
  const moveExercise = useCallback((index, direction) => {
    setSelectedExercises(prev => {
      const next = [...prev];
      const swapIndex = index + direction;
      if (swapIndex < 0 || swapIndex >= next.length) return prev;
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      return next;
    });
  }, []);

  const handleSave = async () => {
  const trimmedName = name.trim();

  if (!trimmedName) {
    Alert.alert('Name required', 'Please give your template a name.');
    return;
  }

  if (selectedExercises.length === 0) {
    Alert.alert('No exercises', 'Add at least one exercise to your template.');
    return;
  }

  setSaving(true);

  try {
    if (isDuplicateMode) {
      const source = await fetchTemplateById(userId, duplicateFromTemplateId);

      if (!source) {
        Alert.alert(
          'Template not found',
          'The original template no longer exists, so it cannot be duplicated.'
        );
        return;
      }
    }

    const nameTaken = await templateNameExists(
      userId,
      trimmedName,
      editingId && !isDuplicateMode ? editingId : null
    );

    if (nameTaken) {
      Alert.alert(
        'Name already exists',
        'A template with this name already exists. Please choose a unique name.'
      );
      return;
    }

    const exerciseIds = selectedExercises.map(e => e.id);

    if (editingId && !isDuplicateMode) {
      await updateTemplate(userId, editingId, trimmedName, tag, exerciseIds);
    } else {
      await createTemplate(userId, generateId(), trimmedName, tag, exerciseIds);
    }

    navigation.goBack();
  } catch (err) {
    console.error(err);
    Alert.alert('Error', 'Could not save template. Please try again.');
  } finally {
    setSaving(false);
  }
};

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#C8FF00" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        {/* ── Top Bar ── */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>
            {isDuplicateMode ? 'Duplicate Template' : editingId ? 'Edit Template' : 'New Template'}
          </Text>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#0A0A0A" size="small" />
              : <Text style={styles.saveBtnText}>Save</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Name ── */}
          <Text style={styles.fieldLabel}>Template Name</Text>
          <TextInput
            style={styles.nameInput}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Push Day A"
            placeholderTextColor="#444"
            returnKeyType="done"
            maxLength={40}
          />

          {/* ── Tag ── */}
          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Tag</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={TAG_OPTIONS}
            keyExtractor={item => item}
            style={styles.tagListContainer}
            contentContainerStyle={styles.tagRow}
            renderItem={({ item: t }) => (
              <TouchableOpacity
                style={[styles.tagChip, tag === t && styles.tagChipActive]}
                onPress={() => setTag(prev => prev === t ? '' : t)}
              >
                <Text style={[styles.tagChipText, tag === t && styles.tagChipTextActive]}>
                  {t}
                </Text>
              </TouchableOpacity>
            )}
          />

          {/* ── Exercises ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.fieldLabel}>Exercises</Text>
            <Text style={styles.exerciseCount}>{selectedExercises.length} selected</Text>
          </View>

          {selectedExercises.length === 0 ? (
            <View style={styles.emptyExercises}>
              <Text style={styles.emptyExercisesIcon}>🏋️</Text>
              <Text style={styles.emptyExercisesText}>No exercises added yet</Text>
            </View>
          ) : (
            selectedExercises.map((ex, index) => (
              <View key={ex.id} style={styles.exerciseRow}>
                {/* Order arrows */}
                <View style={styles.arrowCol}>
                  <TouchableOpacity
                    style={[styles.arrowBtn, index === 0 && styles.arrowBtnDisabled]}
                    onPress={() => moveExercise(index, -1)}
                    disabled={index === 0}
                  >
                    <Text style={styles.arrowText}>▲</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.arrowBtn, index === selectedExercises.length - 1 && styles.arrowBtnDisabled]}
                    onPress={() => moveExercise(index, 1)}
                    disabled={index === selectedExercises.length - 1}
                  >
                    <Text style={styles.arrowText}>▼</Text>
                  </TouchableOpacity>
                </View>

                {/* Exercise info */}
                <View style={styles.exerciseInfo}>
                  <View style={styles.indexBadge}>
                    <Text style={styles.indexBadgeText}>{index + 1}</Text>
                  </View>
                  <View style={styles.exerciseDetails}>
                    <Text style={styles.exerciseName}>{ex.name}</Text>
                    <Text style={styles.exerciseMeta}>{ex.category} · {ex.muscle}</Text>
                  </View>
                </View>

                {/* Remove */}
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemoveExercise(ex.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.removeText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))
          )}

          {/* ── Add Exercise button ── */}
          <TouchableOpacity
            style={styles.addExerciseBtn}
            onPress={() => setPickerVisible(true)}
          >
            <Text style={styles.addExerciseText}>＋  Add Exercise</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>

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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#181818',
  },
  backBtn: {
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  screenTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  saveBtn: {
    backgroundColor: '#C8FF00',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#0A0A0A',
    fontSize: 13,
    fontWeight: '800',
  },

  // Form
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },

  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  nameInput: {
    backgroundColor: '#141414',
    borderRadius: 14,
    padding: 16,
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    letterSpacing: 0.2,
  },

  // Tags
  tagListContainer: {
    flexGrow: 0,
    marginBottom: 4,
  },
  tagRow: {
    gap: 8,
    paddingBottom: 4,
  },
  tagChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginRight: 8,
  },
  tagChipActive: {
    backgroundColor: '#C8FF00',
    borderColor: '#C8FF00',
  },
  tagChipText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '700',
  },
  tagChipTextActive: {
    color: '#0A0A0A',
  },

  // Exercise section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 10,
  },
  exerciseCount: {
    fontSize: 11,
    color: '#C8FF00',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  emptyExercises: {
    alignItems: 'center',
    paddingVertical: 32,
    borderRadius: 14,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1E1E1E',
    marginBottom: 12,
    gap: 8,
  },
  emptyExercisesIcon: { fontSize: 32 },
  emptyExercisesText: { color: '#444', fontSize: 14, fontWeight: '600' },

  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#222',
    gap: 10,
  },
  arrowCol: {
    gap: 4,
    alignItems: 'center',
  },
  arrowBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowBtnDisabled: {
    opacity: 0.2,
  },
  arrowText: {
    fontSize: 10,
    color: '#888',
    fontWeight: '700',
  },
  exerciseInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  indexBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: 'rgba(200,255,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C8FF00',
  },
  exerciseDetails: { flex: 1 },
  exerciseName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  exerciseMeta: {
    fontSize: 11,
    color: '#555',
    marginTop: 2,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    color: '#FF6B6B',
    fontSize: 11,
    fontWeight: '700',
  },

  addExerciseBtn: {
    backgroundColor: '#141414',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C8FF00',
    marginTop: 4,
  },
  addExerciseText: {
    color: '#C8FF00',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
