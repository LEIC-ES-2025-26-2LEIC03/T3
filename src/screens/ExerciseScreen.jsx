import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { fetchExerciseHistory } from '../utils/firestoreDb';
import { auth } from '../utils/firebaseConfig';
import { EXERCISE_INSTRUCTIONS } from '../data/instructions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day:     'numeric',
    month:   'short',
    year:    'numeric',
  });
}

/** Compute personal records from the full history. */
function computeRecords(history) {
  let bestWeight = 0;
  let bestVolume = 0;      // single-set volume (weight × reps)
  let bestSetStr = null;
  let totalSets  = 0;
  let est1RM     = 0;

  for (const entry of history) {
    for (const s of entry.sets) {
      const w = s.weight ?? 0;
      const r = s.reps   ?? 0;
      totalSets++;

      if (w > bestWeight) bestWeight = w;

      const vol = w * r;
      if (vol > bestVolume) {
        bestVolume = vol;
        bestSetStr = `${w} kg × ${r}`;
      }

      // Brzycki estimated 1RM
      if (r > 0 && r <= 30 && w > 0) {
        const e1rm = w * (36 / (37 - r));
        if (e1rm > est1RM) est1RM = e1rm;
      }
    }
  }

  return {
    bestWeight,
    bestVolume,
    bestSetStr,
    est1RM: Math.round(est1RM * 10) / 10,
    totalSets,
    totalSessions: history.length,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RecordCard({ label, value, unit }) {
  return (
    <View style={styles.recordCard}>
      <Text style={styles.recordValue}>
        {value}{unit ? <Text style={styles.recordUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.recordLabel}>{label}</Text>
    </View>
  );
}

function HistoryEntry({ entry }) {
  const totalVolume = entry.sets.reduce(
    (acc, s) => acc + (s.weight ?? 0) * (s.reps ?? 0),
    0
  );

  return (
    <View style={styles.entryCard}>
      {/* Header */}
      <View style={styles.entryHeader}>
        <View>
          <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>
          <Text style={styles.entryWorkout}>{entry.workoutName}</Text>
        </View>
        {totalVolume > 0 && (
          <View style={styles.entryVolBadge}>
            <Text style={styles.entryVolText}>
              {totalVolume >= 1000
                ? `${(totalVolume / 1000).toFixed(1)}k`
                : totalVolume}{' '}
              kg
            </Text>
          </View>
        )}
      </View>

      {/* Sets table */}
      <View style={styles.setsTable}>
        <View style={styles.setsHeaderRow}>
          <Text style={[styles.setsHeaderCell, styles.setNumCol]}>SET</Text>
          <Text style={[styles.setsHeaderCell, styles.setDataCol]}>KG</Text>
          <Text style={[styles.setsHeaderCell, styles.setDataCol]}>REPS</Text>
          <Text style={[styles.setsHeaderCell, styles.setDataCol]}>RPE</Text>
        </View>
        {entry.sets.map((s, i) => (
          <View key={i} style={styles.setRow}>
            <Text style={[styles.setCell, styles.setNumCol, styles.setIndex]}>
              {i + 1}
            </Text>
            <Text style={[styles.setCell, styles.setDataCol]}>
              {s.weight > 0 ? s.weight : '—'}
            </Text>
            <Text style={[styles.setCell, styles.setDataCol]}>
              {s.reps > 0 ? s.reps : '—'}
            </Text>
            <Text style={[styles.setCell, styles.setDataCol, styles.setRpe]}>
              {s.rpe ? s.rpe : '—'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ExerciseHistoryScreen({ navigation, route }) {
  const { exercise } = route.params;
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState('History');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const userId = auth.currentUser?.uid;

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;

      setLoading(true);
      fetchExerciseHistory(userId, exercise.id)
        .then(setHistory)
        .finally(() => setLoading(false));
    }, [userId, exercise.id])
  );

  const records = computeRecords(history);

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      {/* ── Exercise header ── */}
      <View style={styles.exerciseHeader}>
        <Text style={styles.exerciseName}>{exercise.name}</Text>
        <Text style={styles.exerciseMuscle}>{exercise.muscle}</Text>
      </View>

      {/* ── Tabs ── */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'About' && styles.activeTab]}
          onPress={() => setActiveTab('About')}
        >
          <Text style={[styles.tabText, activeTab === 'About' && styles.activeTabText]}>About</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'History' && styles.activeTab]}
          onPress={() => setActiveTab('History')}
        >
          <Text style={[styles.tabText, activeTab === 'History' && styles.activeTabText]}>History</Text>
        </TouchableOpacity>
      </View>

      {/* ── Content ── */}
      {activeTab === 'About' ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {(() => {
            const instructions = EXERCISE_INSTRUCTIONS[exercise.id];
            if (!instructions) {
              return (
                <View style={styles.centered}>
                  <Text style={styles.emptyIcon}>📝</Text>
                  <Text style={styles.emptyHeading}>No instructions</Text>
                  <Text style={styles.emptySub}>We don't have detailed instructions for this exercise yet.</Text>
                </View>
              );
            }
            return (
              <View style={styles.aboutContainer}>
                <Text style={styles.sectionTitle}>Instructions</Text>
                {instructions.steps.map((step, idx) => (
                  <View key={idx} style={styles.infoCard}>
                    <View style={styles.infoIconContainer}>
                      <Text style={styles.infoIconText}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.infoTextContent}>{step}</Text>
                  </View>
                ))}

                {instructions.tips && instructions.tips.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Tips</Text>
                    {instructions.tips.map((tip, idx) => (
                      <View key={idx} style={styles.infoCard}>
                        <View style={styles.infoIconContainer}>
                          <Text style={styles.infoIconText}>💡</Text>
                        </View>
                        <Text style={styles.infoTextContent}>{tip}</Text>
                      </View>
                    ))}
                  </>
                )}
                <View style={{ height: 40 }} />
              </View>
            );
          })()}
        </ScrollView>
      ) : (
        <>
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color="#C8FF00" />
            </View>
          ) : history.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyHeading}>No history yet</Text>
              <Text style={styles.emptySub}>
                Complete a workout with this exercise and your history will appear here.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* ── Personal Records ── */}
              <Text style={styles.sectionTitle}>Personal Records</Text>
              <View style={styles.recordsRow}>
                <RecordCard label="Best Weight" value={records.bestWeight} unit="kg" />
                <RecordCard label="Est. 1RM" value={records.est1RM} unit="kg" />
              </View>
              <View style={styles.recordsRow}>
                <RecordCard label="Best Set" value={records.bestSetStr ?? '—'} />
                <RecordCard label="Sessions" value={records.totalSessions} />
              </View>

              {/* ── History ── */}
              <Text style={[styles.sectionTitle, { marginTop: 28 }]}>History</Text>
              {history.map((entry, i) => (
                <HistoryEntry key={`${entry.workoutId}-${i}`} entry={entry} />
              ))}

              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#181818',
  },
  backBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Exercise header
  exerciseHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#181818',
  },
  exerciseName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  exerciseMuscle: {
    fontSize: 13,
    color: '#C8FF00',
    fontWeight: '600',
    letterSpacing: 0.4,
    marginTop: 4,
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#333',
  },
  tabText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFF',
  },

  // Loading / empty
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#444',
  },
  emptySub: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Section title
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginLeft: 2,
  },

  // Personal records
  recordsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  recordCard: {
    flex: 1,
    backgroundColor: '#141414',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222',
    alignItems: 'center',
  },
  recordValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  recordUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  recordLabel: {
    fontSize: 10,
    color: '#555',
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 6,
  },

  // History entries
  entryCard: {
    backgroundColor: '#141414',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#222',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  entryDate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  entryWorkout: {
    fontSize: 11,
    color: '#555',
    fontWeight: '500',
    marginTop: 2,
  },
  entryVolBadge: {
    backgroundColor: 'rgba(200,255,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(200,255,0,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  entryVolText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C8FF00',
    letterSpacing: 0.3,
  },

  // Sets table
  setsTable: {
    borderTopWidth: 1,
    borderTopColor: '#222',
    paddingTop: 10,
  },
  setsHeaderRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  setsHeaderCell: {
    fontSize: 9,
    fontWeight: '700',
    color: '#444',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  setNumCol: {
    width: 40,
  },
  setDataCol: {
    flex: 1,
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  setCell: {
    fontSize: 13,
    color: '#AAAAAA',
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  setIndex: {
    color: '#555',
    fontWeight: '700',
  },
  setRpe: {
    color: '#C8FF00',
  },

  // Instructions & Tips
  aboutContainer: {
    paddingTop: 8,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  infoIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(200,255,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(200,255,0,0.15)',
  },
  infoIconText: {
    color: '#C8FF00',
    fontSize: 13,
    fontWeight: '800',
  },
  infoTextContent: {
    flex: 1,
    color: '#DDDDDD',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
});
