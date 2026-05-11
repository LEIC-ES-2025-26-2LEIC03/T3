import React, { useState, useEffect } from 'react';
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
import { fetchCustomExercises } from '../utils/firestoreDb';
import { auth } from '../utils/firebaseConfig';

export default function ExercisePicker({ visible, onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [activeMuscle, setActiveMuscle] = useState('All');
  const [customExercises, setCustomExercises] = useState([]);
  const [loadingCustom, setLoadingCustom] = useState(false);

  // Load custom exercises every time the picker opens
  useEffect(() => {
    if (!visible) return;
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    setLoadingCustom(true);
    fetchCustomExercises(userId)
      .then(setCustomExercises)
      .catch(() => setCustomExercises([]))
      .finally(() => setLoadingCustom(false));
  }, [visible]);

  const allExercises = [...EXERCISES, ...customExercises];

  const filtered = allExercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    const matchesMuscle = activeMuscle === 'All' || ex.muscle.includes(activeMuscle);
    return matchesSearch && matchesMuscle;
  });

  const filterOptions = ['All', ...MUSCLES];

  const handleSelect = (exercise) => {
    onSelect(exercise);
    setSearch('');
    setActiveMuscle('All');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Add Exercise</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
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
            autoFocus
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Muscle filter */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filterOptions}
          keyExtractor={item => item}
          style={styles.categoryListContainer}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => (
            <TouchableOpacity
              testID={`category-chip-${item}`}
              style={[styles.categoryChip, activeMuscle === item && styles.categoryChipActive]}
              onPress={() => setActiveMuscle(item)}
            >
              <Text style={[styles.categoryText, activeMuscle === item && styles.categoryTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
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
              <TouchableOpacity style={styles.exerciseRow} onPress={() => handleSelect(item)}>
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
                <Text style={styles.addIcon}>＋</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No exercises found</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

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
  },
  categoryChipActive: { backgroundColor: '#C8FF00', borderColor: '#C8FF00' },
  categoryText: { color: '#888', fontSize: 13, fontWeight: '600' },
  categoryTextActive: { color: '#0F0F0F' },
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
  addIcon: {
    fontSize: 22,
    color: '#C8FF00',
    fontWeight: '300',
    marginLeft: 12,
  },
  emptyState: { paddingTop: 48, alignItems: 'center' },
  emptyText: { color: '#555', fontSize: 15 },
});
