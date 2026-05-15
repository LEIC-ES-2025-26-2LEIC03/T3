import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EXERCISES, MUSCLES } from '../data/exercises';
import { auth } from '../utils/firebaseConfig';
import { fetchFavourites, toggleFavourite, fetchCustomExercises } from '../utils/firestoreDb';
import { onAuthStateChanged } from 'firebase/auth';

// ─── Constants ────────────────────────────────────────────────────────────────

const FAVOURITES_KEY = 'Favourites';
const EXERCISE_ROW_HEIGHT = 57; // fixed row height for getItemLayout

// ─── Sub-components ───────────────────────────────────────────────────────────

function HeartIcon({ filled }) {
  return (
    <Text style={[styles.heartIcon, filled && styles.heartIconFilled]}>
      {filled ? '♥' : '♡'}
    </Text>
  );
}

/**
 * Memoized exercise row — only re-renders when its own isFav / isToggling
 * status changes, not when unrelated rows toggle their favourite.
 */
const ExerciseRow = memo(function ExerciseRow({
  item,
  isFav,
  isToggling,
  onSelect,
  onToggleFavourite,
}) {
  return (
    <TouchableOpacity
      style={styles.exerciseRow}
      onPress={() => onSelect(item)}
      activeOpacity={0.7}
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

      {/* Favourite button */}
      <TouchableOpacity
        style={[styles.favBtn, isFav && styles.favBtnActive]}
        onPress={() => onToggleFavourite(item)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        disabled={isToggling}
      >
        {isToggling ? (
          <ActivityIndicator size="small" color="#C8FF00" style={{ width: 22 }} />
        ) : (
          <HeartIcon filled={isFav} />
        )}
      </TouchableOpacity>

      {/* Add icon */}
      <Text style={styles.addIcon}>＋</Text>
    </TouchableOpacity>
  );
});

// ─── Main component ───────────────────────────────────────────────────────────

export default function ExercisePicker({ visible, onSelect, onClose }) {
  const [search, setSearch]               = useState('');
  const [activeMuscle, setActiveMuscle]   = useState('All');
  const [favourites, setFavourites]       = useState(new Set());
  const [togglingId, setTogglingId]       = useState(null);
  const [loadingFavs, setLoadingFavs]     = useState(false);
  const [customExercises, setCustomExercises] = useState([]);
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [userId, setUserId]               = useState(null);

  // ── Get real userId from Firebase Auth ────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setUserId(user?.uid ?? null);
    });
    return unsubscribe;
  }, []);

  // ── Load favourites and custom exercises when modal opens ─────────────────
  useEffect(() => {
    if (!visible || !userId) return;

    // Load favourites
    setLoadingFavs(true);
    fetchFavourites(userId)
      .then(setFavourites)
      .catch(() => {/* silently fall back to empty set */})
      .finally(() => setLoadingFavs(false));

    // Load custom exercises
    setLoadingCustom(true);
    fetchCustomExercises(userId)
      .then(setCustomExercises)
      .catch(() => setCustomExercises([]))
      .finally(() => setLoadingCustom(false));
  }, [visible, userId]);

  // ── Combined exercise list (built-in + custom) ────────────────────────────
  const allExercises = [...EXERCISES, ...customExercises];

  // ── Filtered exercise list ────────────────────────────────────────────────
  const filtered = allExercises.filter(ex => {
    const matchesSearch   = ex.name.toLowerCase().includes(search.toLowerCase());
    const matchesFav      = activeMuscle === FAVOURITES_KEY ? favourites.has(ex.id) : true;
    const matchesMuscle   = activeMuscle === 'All' || activeMuscle === FAVOURITES_KEY
      ? true
      : ex.muscle.includes(activeMuscle);
    return matchesSearch && matchesFav && matchesMuscle;
  });

  const filterOptions = ['All', FAVOURITES_KEY, ...MUSCLES];

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSelect = useCallback((exercise) => {
    onSelect(exercise);
    setSearch('');
    setActiveMuscle('All');
  }, [onSelect]);

  const handleToggleFavourite = useCallback(async (exercise) => {
    if (!userId || togglingId === exercise.id) return;

    setTogglingId(exercise.id);
    const wasActive = favourites.has(exercise.id);

    // Optimistic update
    setFavourites(prev => {
      const next = new Set(prev);
      wasActive ? next.delete(exercise.id) : next.add(exercise.id);
      return next;
    });

    try {
      await toggleFavourite(userId, exercise);
    } catch {
      // Roll back on error
      setFavourites(prev => {
        const next = new Set(prev);
        wasActive ? next.add(exercise.id) : next.delete(exercise.id);
        return next;
      });
    } finally {
      setTogglingId(null);
    }
  }, [userId, favourites, togglingId]);

  const handleClose = () => {
    setSearch('');
    setActiveMuscle('All');
    onClose();
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const renderExercise = useCallback(({ item }) => (
    <ExerciseRow
      item={item}
      isFav={favourites.has(item.id)}
      isToggling={togglingId === item.id}
      onSelect={handleSelect}
      onToggleFavourite={handleToggleFavourite}
    />
  ), [favourites, togglingId, handleSelect, handleToggleFavourite]);

  const getItemLayout = useCallback((_, index) => ({
    length: EXERCISE_ROW_HEIGHT,
    offset: EXERCISE_ROW_HEIGHT * index,
    index,
  }), []);

  const isLoading = loadingFavs || loadingCustom;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.title}>Add Exercise</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* ── Search ── */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search exercises..."
            placeholderTextColor="#666"
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Muscle / Favourites filter ── */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filterOptions}
          keyExtractor={item => item}
          style={styles.categoryListContainer}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => {
            const isActive  = activeMuscle === item;
            const isFavChip = item === FAVOURITES_KEY;
            return (
              <TouchableOpacity
                testID={`category-chip-${item}`}
                style={[
                  styles.categoryChip,
                  isActive && styles.categoryChipActive,
                  isFavChip && styles.favChip,
                  isFavChip && isActive && styles.favChipActive,
                ]}
                onPress={() => setActiveMuscle(item)}
              >
                {isFavChip && (
                  <Text style={[styles.favChipHeart, isActive && styles.favChipHeartActive]}>
                    ♥
                  </Text>
                )}
                <Text style={[
                  styles.categoryText,
                  isActive && styles.categoryTextActive,
                  isFavChip && styles.favChipText,
                  isFavChip && isActive && styles.favChipTextActive,
                ]}>
                  {item}
                </Text>
                {isFavChip && loadingFavs && (
                  <ActivityIndicator size="small" color="#C8FF00" style={{ marginLeft: 4 }} />
                )}
              </TouchableOpacity>
            );
          }}
        />

        {/* ── Exercise list ── */}
        {isLoading ? (
          <ActivityIndicator color="#C8FF00" style={{ marginTop: 32 }} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            style={styles.exerciseList}
            contentContainerStyle={styles.exerciseListContent}
            renderItem={renderExercise}
            getItemLayout={getItemLayout}
            initialNumToRender={20}
            maxToRenderPerBatch={15}
            windowSize={5}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                {activeMuscle === FAVOURITES_KEY && !search ? (
                  <>
                    <Text style={styles.emptyIcon}>♡</Text>
                    <Text style={styles.emptyText}>No favourites yet</Text>
                    <Text style={styles.emptySubText}>
                      Tap the heart on any exercise to save it here
                    </Text>
                  </>
                ) : (
                  <Text style={styles.emptyText}>No exercises found</Text>
                )}
              </View>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#999', fontSize: 14, fontWeight: '600' },

  // Search
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

  // Category / muscle chips
  categoryListContainer: { flexGrow: 0, marginBottom: 8 },
  categoryList: { paddingHorizontal: 16, paddingBottom: 4, gap: 8 },
  categoryChip: {
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
  categoryChipActive: { backgroundColor: '#C8FF00', borderColor: '#C8FF00' },
  categoryText: { color: '#888', fontSize: 13, fontWeight: '600' },
  categoryTextActive: { color: '#0F0F0F' },

  // Favourites chip
  favChip: {
    borderColor: '#FF6B9D44',
    backgroundColor: '#1A1A1A',
    gap: 5,
  },
  favChipActive: { backgroundColor: '#FF6B9D', borderColor: '#FF6B9D' },
  favChipHeart: { fontSize: 12, color: '#FF6B9D' },
  favChipHeartActive: { color: '#FFFFFF' },
  favChipText: { color: '#FF6B9D' },
  favChipTextActive: { color: '#FFFFFF' },

  // Exercise rows
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
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
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

  // Favourite button
  favBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  favBtnActive: {
    backgroundColor: 'rgba(255, 107, 157, 0.12)',
    borderColor: 'rgba(255, 107, 157, 0.3)',
  },
  heartIcon: { fontSize: 18, color: '#444' },
  heartIconFilled: { color: '#FF6B9D' },

  // Add icon
  addIcon: {
    fontSize: 22,
    color: '#C8FF00',
    fontWeight: '300',
    marginLeft: 8,
  },

  // Empty state
  emptyState: { paddingTop: 48, alignItems: 'center', gap: 8 },
  emptyIcon: { fontSize: 40, color: '#333', marginBottom: 4 },
  emptyText: { color: '#555', fontSize: 15, fontWeight: '600' },
  emptySubText: {
    color: '#3A3A3A',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
});