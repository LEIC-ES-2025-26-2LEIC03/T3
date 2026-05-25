import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { onAuthStateChanged } from 'firebase/auth';
import { EXERCISES, MUSCLES } from '../data/exercises';
import {
  fetchCustomExercises,
  createCustomExercise,
  deleteCustomExercise,
  fetchFavourites,
  toggleFavourite,
} from '../utils/firestoreDb';
import { auth } from '../utils/firebaseConfig';
import { generateId } from '../utils/id';

const friendlyFirestoreError = (error, fallback) => {
  if (error?.code === 'permission-denied') {
    return 'Missing Firestore permission for this account. Please check the database rules.';
  }
  return fallback;
};

const FAVOURITES_KEY = 'Favourites';

function HeartIcon({ filled }) {
  return (
    <Text style={[styles.heartIcon, filled && styles.heartIconFilled]}>
      {filled ? '♥' : '♡'}
    </Text>
  );
}

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState(auth.currentUser?.uid ?? null);

  const navigation = useNavigation();
  const [search, setSearch] = useState('');
  const [activeMuscle, setActiveMuscle] = useState('All');
  const [customExercises, setCustomExercises] = useState([]);
  const [loadingCustom, setLoadingCustom] = useState(true);
  const [favourites, setFavourites] = useState(new Set());
  const [loadingFavs, setLoadingFavs] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  // ── Create modal state ───────────────────────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedMuscles, setSelectedMuscles] = useState([]);
  const [newSteps, setNewSteps] = useState([]);
  const [newTips, setNewTips] = useState([]);
  const [stepDraft, setStepDraft] = useState('');
  const [tipDraft, setTipDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const unsubscribe = onAuthStateChanged(auth, user => {
        setUserId(user?.uid ?? null);
      });
      return unsubscribe;
    }, [])
  );

  // ── Load custom exercises when screen is focused ─────────────────────────
  useFocusEffect(
    useCallback(() => {
      if (!userId) { setLoadingCustom(false); return; }
      setLoadingCustom(true);
      fetchCustomExercises(userId)
        .then(setCustomExercises)
        .catch(() => setCustomExercises([]))
        .finally(() => setLoadingCustom(false));
    }, [userId])
  );

  useFocusEffect(
    useCallback(() => {
      if (!userId) { setFavourites(new Set()); setLoadingFavs(false); return; }

      setLoadingFavs(true);
      fetchFavourites(userId)
        .then(setFavourites)
        .catch(() => setFavourites(new Set()))
        .finally(() => setLoadingFavs(false));
    }, [userId])
  );

  // ── Merged + filtered list ───────────────────────────────────────────────
  const allExercises = [...EXERCISES, ...customExercises];

  const filtered = allExercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    const matchesFav = activeMuscle === FAVOURITES_KEY ? favourites.has(ex.id) : true;
    const matchesMuscle = activeMuscle === 'All' || activeMuscle === FAVOURITES_KEY
      ? true
      : ex.muscle.includes(activeMuscle);
    return matchesSearch && matchesFav && matchesMuscle;
  });

  const filterOptions = ['All', FAVOURITES_KEY, ...MUSCLES];

  // ── Muscle toggle for the create form ───────────────────────────────────
  const toggleMuscle = (muscle) => {
    setSelectedMuscles(prev =>
      prev.includes(muscle) ? prev.filter(m => m !== muscle) : [...prev, muscle]
    );
  };

  // ── Save custom exercise ─────────────────────────────────────────────────
  const handleCreate = async () => {
    const trimmedName = newName.trim();
    if (!userId) {
      Alert.alert('Not signed in', 'Please log in again before creating an exercise.');
      return;
    }
    if (!trimmedName) {
      Alert.alert('Missing name', 'Please enter an exercise name.');
      return;
    }
    if (selectedMuscles.length === 0) {
      Alert.alert('Missing muscle', 'Please select at least one muscle group.');
      return;
    }
    // Prevent duplicates (case-insensitive)
    const nameLower = trimmedName.toLowerCase();
    const exists = allExercises.some(ex => ex.name.toLowerCase() === nameLower);
    if (exists) {
      Alert.alert('Already exists', 'An exercise with that name already exists in the library.');
      return;
    }

    setSaving(true);
    try {
      const id = generateId();
      const muscleString = selectedMuscles.join(', ');
      await createCustomExercise(userId, id, trimmedName, muscleString, newSteps, newTips);
      const newEx = {
        id,
        name: trimmedName,
        category: selectedMuscles[0],
        muscle: muscleString,
        isCustom: true,
        steps: newSteps,
        tips: newTips,
      };
      setCustomExercises(prev => [...prev, newEx]);
      setModalVisible(false);
      setNewName('');
      setSelectedMuscles([]);
      setNewSteps([]);
      setNewTips([]);
      setStepDraft('');
      setTipDraft('');
    } catch (error) {
      Alert.alert('Error', friendlyFirestoreError(error, 'Failed to save exercise. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setNewName('');
    setSelectedMuscles([]);
    setNewSteps([]);
    setNewTips([]);
    setStepDraft('');
    setTipDraft('');
  };

  const handleAddStep = () => {
    const trimmed = stepDraft.trim();
    if (trimmed.length === 0) return;
    setNewSteps(prev => [...prev, trimmed]);
    setStepDraft('');
  };

  const handleRemoveStep = (index) => {
    setNewSteps(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleAddTip = () => {
    const trimmed = tipDraft.trim();
    if (trimmed.length === 0) return;
    setNewTips(prev => [...prev, trimmed]);
    setTipDraft('');
  };

  const handleRemoveTip = (index) => {
    setNewTips(prev => prev.filter((_, idx) => idx !== index));
  };

  // ── Delete custom exercise ───────────────────────────────────────────────
  const handleDeleteCustom = (ex) => {
    Alert.alert(
      'Delete Exercise',
      `Remove "${ex.name}" from your library? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!userId) {
                Alert.alert('Not signed in', 'Please log in again before deleting an exercise.');
                return;
              }
              await deleteCustomExercise(userId, ex.id);
              setCustomExercises(prev => prev.filter(e => e.id !== ex.id));
              setFavourites(prev => {
                const next = new Set(prev);
                next.delete(ex.id);
                return next;
              });
            } catch (error) {
              Alert.alert('Error', friendlyFirestoreError(error, 'Failed to delete exercise.'));
            }
          },
        },
      ]
    );
  };

  const handleToggleFavourite = async (exercise) => {
    if (!userId || togglingId === exercise.id || typeof toggleFavourite !== 'function') return;
    setTogglingId(exercise.id);
    const wasFav = favourites.has(exercise.id);

    setFavourites(prev => {
      const next = new Set(prev);
      wasFav ? next.delete(exercise.id) : next.add(exercise.id);
      return next;
    });

    try {
      await toggleFavourite(userId, exercise);
    } catch (error) {
      setFavourites(prev => {
        const next = new Set(prev);
        wasFav ? next.add(exercise.id) : next.delete(exercise.id);
        return next;
      });
      Alert.alert('Error', friendlyFirestoreError(error, 'Could not update favourite.'));
    } finally {
      setTogglingId(null);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.title}>Library</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.addBtnText}>＋ New</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises..."
          placeholderTextColor="#666"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Muscle filter chips */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={filterOptions}
        keyExtractor={item => item}
        style={styles.filterListContainer}
        contentContainerStyle={styles.filterList}
        renderItem={({ item }) => {
          const isFavChip = item === FAVOURITES_KEY;
          const isActive = activeMuscle === item;
          return (
            <TouchableOpacity
              style={[
                styles.filterChip,
                isActive && styles.filterChipActive,
                isFavChip && styles.favChip,
                isFavChip && isActive && styles.favChipActive,
              ]}
              onPress={() => setActiveMuscle(item)}
            >
              {isFavChip && (
                <Text style={[styles.favChipHeart, isActive && styles.favChipHeartActive]}>♥</Text>
              )}
              <Text style={[
                styles.filterText,
                isActive && styles.filterTextActive,
                isFavChip && styles.favChipText,
                isFavChip && isActive && styles.favChipTextActive,
              ]}>
                {item}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Exercise list */}
      {loadingCustom ? (
        <ActivityIndicator color="#C8FF00" style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          style={styles.exerciseList}
          contentContainerStyle={styles.exerciseListContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.exerciseRow}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ExerciseHistory', { exercise: item })}
            >
              <View style={styles.exerciseInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.exerciseName}>{item.name}</Text>
                  {item.isCustom && (
                    <View style={styles.customBadge}>
                      <Text style={styles.customBadgeText}>Custom</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.exerciseMeta}>{item.muscle}</Text>
              </View>

              <TouchableOpacity
                style={[styles.favBtn, favourites.has(item.id) && styles.favBtnActive]}
                onPress={(e) => { e.stopPropagation(); handleToggleFavourite(item); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                disabled={togglingId === item.id}
              >
                {togglingId === item.id ? (
                  <ActivityIndicator size="small" color="#C8FF00" style={{ width: 22 }} />
                ) : (
                  <HeartIcon filled={favourites.has(item.id)} />
                )}
              </TouchableOpacity>

              {item.isCustom ? (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={(e) => { e.stopPropagation(); handleDeleteCustom(item); }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.deleteBtnText}>🗑</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.chevron}>›</Text>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              {activeMuscle === FAVOURITES_KEY && !search ? (
                <>
                  <Text style={styles.emptyIcon}>♡</Text>
                  <Text style={styles.emptyText}>No favourites yet</Text>
                  <Text style={styles.emptySubText}>Tap the heart on any exercise to save it here</Text>
                </>
              ) : (
                <Text style={styles.emptyText}>No exercises found</Text>
              )}
            </View>
          }
        />
      )}

      {/* ── Create Exercise Modal ────────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView
          style={styles.modalWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleCloseModal} style={styles.modalCancelBtn}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Exercise</Text>
            <TouchableOpacity
              onPress={handleCreate}
              style={[styles.modalSaveBtn, saving && styles.modalSaveBtnDisabled]}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color="#0F0F0F" />
                : <Text style={styles.modalSaveText}>Save</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {/* Name field */}
            <Text style={styles.fieldLabel}>Exercise Name</Text>
            <TextInput
              style={styles.nameInput}
              placeholder="e.g. Cable lateral raise"
              placeholderTextColor="#555"
              value={newName}
              onChangeText={setNewName}
              autoFocus
              returnKeyType="done"
            />

            {/* Muscle group selector */}
            <Text style={styles.fieldLabel}>Muscle Group(s)</Text>
            <Text style={styles.fieldHint}>Select one or more</Text>
            <View style={styles.muscleGrid}>
              {MUSCLES.map(muscle => {
                const active = selectedMuscles.includes(muscle);
                return (
                  <TouchableOpacity
                    key={muscle}
                    style={[styles.muscleChip, active && styles.muscleChipActive]}
                    onPress={() => toggleMuscle(muscle)}
                  >
                    <Text style={[styles.muscleChipText, active && styles.muscleChipTextActive]}>
                      {muscle}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Steps */}
            <Text style={styles.fieldLabel}>Instruction Steps</Text>
            <Text style={styles.fieldHint}>List one or more execution steps for the exercise.</Text>
            {newSteps.map((step, index) => (
              <View key={`${step}-${index}`} style={styles.listRow}>
                <Text style={styles.listRowText}>{index + 1}. {step}</Text>
                <TouchableOpacity onPress={() => handleRemoveStep(index)} style={styles.listRowButton}>
                  <Text style={styles.listRowButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            <View style={styles.addFieldRow}>
              <TextInput
                style={[styles.nameInput, styles.inlineInput]}
                placeholder="Add step"
                placeholderTextColor="#555"
                value={stepDraft}
                onChangeText={setStepDraft}
                onSubmitEditing={handleAddStep}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.addFieldButton} onPress={handleAddStep}>
                <Text style={styles.addFieldButtonText}>Add</Text>
              </TouchableOpacity>
            </View>

            {/* Tips */}
            <Text style={styles.fieldLabel}>Tips</Text>
            <Text style={styles.fieldHint}>Provide useful coaching cues or safety reminders.</Text>
            {newTips.map((tip, index) => (
              <View key={`${tip}-${index}`} style={styles.listRow}>
                <Text style={styles.listRowText}>💡 {tip}</Text>
                <TouchableOpacity onPress={() => handleRemoveTip(index)} style={styles.listRowButton}>
                  <Text style={styles.listRowButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            <View style={styles.addFieldRow}>
              <TextInput
                style={[styles.nameInput, styles.inlineInput]}
                placeholder="Add tip"
                placeholderTextColor="#555"
                value={tipDraft}
                onChangeText={setTipDraft}
                onSubmitEditing={handleAddTip}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.addFieldButton} onPress={handleAddTip}>
                <Text style={styles.addFieldButtonText}>Add</Text>
              </TouchableOpacity>
            </View>

            {/* Preview */}
            {newName.trim().length > 0 && selectedMuscles.length > 0 && (
              <View style={styles.previewCard}>
                <Text style={styles.previewLabel}>Preview</Text>
                <Text style={styles.previewName}>{newName.trim()}</Text>
                <Text style={styles.previewMuscle}>{selectedMuscles.join(', ')}</Text>
                {(newSteps.length > 0 || newTips.length > 0) && (
                  <Text style={[styles.previewMuscle, { marginTop: 10 }]}>Includes {newSteps.length} step(s) and {newTips.length} tip(s).</Text>
                )}
              </View>
            )}

            <View style={{ height: 60 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },

  // ── Top bar ──────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#181818',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  addBtn: {
    backgroundColor: '#C8FF00',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  addBtnText: {
    color: '#0A0A0A',
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Search ───────────────────────────────────────────────────────────────
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: {
    flex: 1,
    height: 44,
    color: '#FFFFFF',
    fontSize: 15,
  },
  clearBtn: { color: '#555', fontSize: 14, paddingLeft: 8 },

  // ── Filters ──────────────────────────────────────────────────────────────
  filterListContainer: { flexGrow: 0, marginBottom: 8 },
  filterList: { paddingHorizontal: 16, paddingBottom: 4, gap: 8 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  favBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
    marginRight: 8,
  },
  favBtnActive: {
    backgroundColor: '#FF6B9D',
  },
  heartIcon: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  heartIconFilled: {
    color: '#FFFFFF',
  },
  filterChipActive: { backgroundColor: '#C8FF00', borderColor: '#C8FF00' },
  favChip: {
    borderColor: '#FF6B9D',
    backgroundColor: '#1A1A1A',
  },
  favChipActive: {
    backgroundColor: '#FF6B9D',
    borderColor: '#FF6B9D',
  },
  favChipHeart: {
    fontSize: 12,
    color: '#888',
    marginRight: 6,
  },
  favChipHeartActive: {
    color: '#FFFFFF',
  },
  favChipText: {
    color: '#FF6B9D',
  },
  favChipTextActive: {
    color: '#FFFFFF',
  },
  filterText: { color: '#888', fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#0F0F0F' },

  // ── Exercise list ─────────────────────────────────────────────────────────
  exerciseList: { flex: 1 },
  exerciseListContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16 },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  exerciseInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  exerciseName: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  customBadge: {
    backgroundColor: '#1E2E00',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#C8FF0033',
  },
  customBadgeText: { color: '#C8FF00', fontSize: 10, fontWeight: '700' },
  exerciseMeta: { fontSize: 12, color: '#666', letterSpacing: 0.3 },
  deleteBtn: { paddingLeft: 12 },
  deleteBtnText: { fontSize: 18 },
  emptyState: { paddingTop: 48, alignItems: 'center' },
  emptyIcon: { fontSize: 36, color: '#FF6B9D', marginBottom: 12 },
  emptyText: { color: '#555', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  emptySubText: { color: '#3A3A3A', fontSize: 13, textAlign: 'center' },

  // ── Modal ─────────────────────────────────────────────────────────────────
  modalWrapper: { flex: 1, backgroundColor: '#0F0F0F' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalCancelBtn: { minWidth: 60 },
  modalCancelText: { color: '#888', fontSize: 15 },
  modalSaveBtn: {
    backgroundColor: '#C8FF00',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  modalSaveBtnDisabled: { opacity: 0.5 },
  chevron: {
    fontSize: 20,
    color: '#444',
    fontWeight: '300',
    marginLeft: 8,
  },
  modalSaveText: { color: '#0A0A0A', fontWeight: '700', fontSize: 14 },
  modalBody: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },

  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  fieldHint: { fontSize: 12, color: '#444', marginTop: -6, marginBottom: 12 },

  nameInput: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 28,
  },

  muscleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 28,
  },
  muscleChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  muscleChipActive: { backgroundColor: '#C8FF00', borderColor: '#C8FF00' },
  muscleChipText: { color: '#888', fontSize: 14, fontWeight: '600' },
  muscleChipTextActive: { color: '#0A0A0A' },

  previewCard: {
    backgroundColor: '#141414',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E2E00',
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C8FF00',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  previewName: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  previewMuscle: { fontSize: 12, color: '#666' },

  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#141414',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#1E1E1E',
    marginBottom: 10,
  },
  listRowText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    marginRight: 12,
  },
  listRowButton: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#262626',
  },
  listRowButtonText: {
    color: '#FF5A5A',
    fontWeight: '700',
  },
  addFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 22,
  },
  inlineInput: {
    flex: 1,
    marginBottom: 0,
    minHeight: 44,
  },
  addFieldButton: {
    backgroundColor: '#C8FF00',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  addFieldButtonText: {
    color: '#0A0A0A',
    fontWeight: '700',
  },
});
