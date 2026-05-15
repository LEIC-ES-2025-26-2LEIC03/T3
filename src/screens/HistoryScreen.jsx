import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { fetchWorkouts } from '../utils/firestoreDb';
import { auth } from '../utils/firebaseConfig';

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

function formatTime(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString('en-GB', {
    hour:   '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(startedAt, finishedAt) {
  if (!startedAt || !finishedAt) return null;
  const mins = Math.round(
    (new Date(finishedAt) - new Date(startedAt)) / 60000
  );
  if (mins < 1)  return '< 1 min';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

/**
 * Group a flat list of workouts into sections by calendar date.
 * Returns [{ dateLabel, workouts }] sorted newest-first.
 */
function groupByDate(workouts) {
  const map = new Map();

  for (const w of workouts) {
    const label = formatDate(w.finished_at ?? w.started_at);
    if (!map.has(label)) map.set(label, []);
    map.get(label).push(w);
  }

  return Array.from(map.entries()).map(([dateLabel, items]) => ({
    dateLabel,
    workouts: items,
  }));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SyncBadge({ status }) {
  if (status === 'synced') return null; // no badge needed when synced

  const isPending  = status === 'pending';
  const isConflict = status === 'conflict';

  return (
    <View style={[
      styles.syncBadge,
      isPending  && styles.syncBadgePending,
      isConflict && styles.syncBadgeConflict,
    ]}>
      <Text style={[
        styles.syncBadgeText,
        isPending  && styles.syncBadgeTextPending,
        isConflict && styles.syncBadgeTextConflict,
      ]}>
        {isPending ? '↑ Pending' : '⚠ Conflict'}
      </Text>
    </View>
  );
}

function WorkoutCard({ workout }) {
  const [expanded, setExpanded] = useState(false);

  const totalSets   = workout.exercises?.reduce((n, ex) => n + ex.sets.length, 0) ?? 0;
  const totalVolume = workout.exercises?.reduce((vol, ex) =>
    vol + ex.sets.reduce((s, set) => s + (set.weight * set.reps), 0), 0
  ) ?? 0;
  const duration    = formatDuration(workout.started_at, workout.finished_at);

  const muscleGroups = [
    ...new Set(
      (workout.exercises ?? []).map(ex => ex.muscle).filter(Boolean)
    ),
  ].slice(0, 4).join(' · ');

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setExpanded(prev => !prev)}
      activeOpacity={0.8}
    >
      {/* ── Card header ── */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.cardName}>{workout.name}</Text>
          <Text style={styles.cardTime}>{formatTime(workout.finished_at)}</Text>
        </View>
        <View style={styles.cardHeaderRight}>
          <SyncBadge status={workout.sync_status} />
          <Text style={styles.chevron}>{expanded ? '⌃' : '⌄'}</Text>
        </View>
      </View>

      {/* ── Summary row ── */}
      <View style={styles.statsRow}>
        {duration && (
          <View style={styles.stat}>
            <Text style={styles.statValue}>{duration}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
        )}
        <View style={styles.stat}>
          <Text style={styles.statValue}>{workout.exercises?.length ?? 0}</Text>
          <Text style={styles.statLabel}>Exercises</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{totalSets}</Text>
          <Text style={styles.statLabel}>Sets</Text>
        </View>
        {totalVolume > 0 && (
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {totalVolume >= 1000
                ? `${(totalVolume / 1000).toFixed(1)}k`
                : totalVolume.toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>Vol (kg)</Text>
          </View>
        )}
      </View>

      {/* Muscle tag row */}
      {muscleGroups ? (
        <Text style={styles.muscleGroups}>{muscleGroups}</Text>
      ) : null}

      {/* ── Expanded: exercise breakdown ── */}
      {expanded && (
        <View style={styles.exerciseList}>
          <View style={styles.divider} />
          {(workout.exercises ?? []).map((ex, i) => (
            <View key={i} style={styles.exerciseRow}>
              <View style={styles.exerciseLeft}>
                <Text style={styles.exerciseName}>{ex.name}</Text>
                <Text style={styles.exerciseMuscle}>{ex.muscle}</Text>
              </View>
              <View style={styles.exerciseRight}>
                {ex.sets.map((s, j) => (
                  <View key={j} style={styles.setBlock}>
                    <Text style={styles.setDetail}>
                      {s.weight > 0 ? `${s.weight}kg` : '—'}
                      {' × '}
                      {s.reps > 0 ? s.reps : '—'}
                      {s.rpe ? `  RPE ${s.rpe}` : ''}
                    </Text>
                    {s.notes ? (
                      <Text style={styles.setNote}>{s.notes}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [sections, setSections]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const hasLoadedOnce             = useRef(false);

  const userId = auth.currentUser?.uid;
  if (!userId) {
    Alert.alert('Error', 'Not signed in. Please restart the app.');
    return;
  }

  useFocusEffect(
    useCallback(() => {
      // First visit shows spinner; subsequent focus events (e.g. returning
      // after finishing a workout) refresh silently so there's no flash.
      if (!hasLoadedOnce.current) setLoading(true);

      fetchWorkouts(userId)
        .then(workouts => setSections(groupByDate(workouts)))
        .finally(() => {
          setLoading(false);
          hasLoadedOnce.current = true;
        });
    }, [userId])
  );

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <Text style={styles.title}>History</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#C8FF00" />
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🏋️</Text>
          <Text style={styles.emptyHeading}>No workouts yet</Text>
          <Text style={styles.emptySub}>
            Finish your first workout and it will appear here.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {sections.map(section => (
            <View key={section.dateLabel}>
              {/* Date section header */}
              <Text style={styles.sectionDate}>{section.dateLabel}</Text>

              {section.workouts.map(workout => (
                <WorkoutCard key={workout.id} workout={workout} />
              ))}
            </View>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
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
    paddingTop: 8,
  },

  // Date section header
  sectionDate: {
    fontSize: 11,
    fontWeight: '700',
    color: '#444',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 2,
  },

  // Workout card
  card: {
    backgroundColor: '#141414',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#222',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHeaderLeft: { flex: 1 },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  cardTime: {
    fontSize: 11,
    color: '#555',
    fontWeight: '500',
    marginTop: 2,
  },
  chevron: {
    fontSize: 16,
    color: '#444',
    fontWeight: '300',
  },

  // Sync badge
  syncBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  syncBadgePending: {
    backgroundColor: 'rgba(200,255,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(200,255,0,0.2)',
  },
  syncBadgeConflict: {
    backgroundColor: 'rgba(255,107,107,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.2)',
  },
  syncBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  syncBadgeTextPending: {
    color: '#C8FF00',
  },
  syncBadgeTextConflict: {
    color: '#FF6B6B',
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  stat: { alignItems: 'center' },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  statLabel: {
    fontSize: 10,
    color: '#555',
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  muscleGroups: {
    fontSize: 11,
    color: '#C8FF00',
    fontWeight: '600',
    letterSpacing: 0.3,
    marginTop: 4,
  },

  // Expanded exercise list
  exerciseList: {
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#222',
    marginVertical: 12,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  exerciseLeft: { flex: 1 },
  exerciseName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  exerciseMuscle: {
    fontSize: 11,
    color: '#555',
    fontWeight: '600',
    marginTop: 2,
  },
  exerciseRight: { alignItems: 'flex-end' },
  setBlock: {
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  setDetail: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  setNote: {
    fontSize: 11,
    color: '#555',
    fontStyle: 'italic',
    marginTop: 1,
  },
});
