import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getProfile, saveUserProfile, updateProfile, getMetricsHistory } from '../services/profileService';
import { auth } from '../utils/firebaseConfig';

export default function BodyMetricsScreen({ navigation }) {
  const USER_ID = auth.currentUser?.uid;
  const [units, setUnits] = useState('kg');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [history, setHistory] = useState([]);

  const heightLabel = units === 'kg' ? 'Height (cm)' : 'Height (in)';
  const weightLabel = units === 'kg' ? 'Weight (kg)' : 'Weight (lbs)';

  // ── Load existing profile and history on mount ─────────────────────────
  const loadData = useCallback(async () => {
    try {
      const profile = await getProfile(USER_ID);
      if (profile.units) setUnits(profile.units);

      if (profile.heightCm != null) {
        const displayHeight =
          profile.units === 'lbs'
            ? (profile.heightCm / 2.54).toFixed(1)
            : String(profile.heightCm);
        setHeight(displayHeight);
      }
      if (profile.weightKg != null) {
        const displayWeight =
          profile.units === 'lbs'
            ? (profile.weightKg / 0.453592).toFixed(1)
            : String(profile.weightKg);
        setWeight(displayWeight);
      }
      if (profile.bodyFatPercentage != null) {
        setBodyFat(String(profile.bodyFatPercentage));
      }

      const records = await getMetricsHistory(USER_ID);
      setHistory(records);
    } catch {
      // silently fallback to defaults
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Save handler ──────────────────────────────────────────────────────
  const handleSave = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setSaving(true);

    try {
      const unitsResult = await updateProfile(USER_ID, { units });
      if (!unitsResult.success) {
        setErrorMsg(unitsResult.error);
        return;
      }

      const heightCm =
        units === 'kg' ? parseFloat(height) : parseFloat(height) * 2.54;
      const weightKg =
        units === 'kg' ? parseFloat(weight) : parseFloat(weight) * 0.453592;

      const profileResult = await saveUserProfile(USER_ID, {
        heightCm: isNaN(heightCm) ? null : Math.round(heightCm),
        weightKg: isNaN(weightKg) ? null : parseFloat(weightKg.toFixed(1)),
        bodyFatPercentage: bodyFat !== '' ? parseFloat(bodyFat) : null,
        fitnessGoals: '',
      });

      if (!profileResult.success) {
        setErrorMsg(profileResult.error);
        return;
      }

      // Refresh history after saving
      const records = await getMetricsHistory(USER_ID);
      setHistory(records);

      setSuccessMsg('Body metrics saved!');
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Format a history record date ──────────────────────────────────────
  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        {/* ── Top bar ────────────────────────────────────────────────── */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Body Metrics</Text>
          <View style={styles.backBtnSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Error banner ──────────────────────────────────────────── */}
          {errorMsg !== '' && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {/* ── Success banner ────────────────────────────────────────── */}
          {successMsg !== '' && (
            <View style={styles.successBanner}>
              <Text style={styles.successIcon}>✓</Text>
              <Text style={styles.successText}>{successMsg}</Text>
            </View>
          )}

          {/* ── Unit preference ───────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>Measurement System</Text>
          <View style={styles.unitToggle}>
            {['kg', 'lbs'].map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.unitOption, units === option && styles.unitOptionActive]}
                onPress={() => setUnits(option)}
              >
                <Text style={[styles.unitOptionText, units === option && styles.unitOptionTextActive]}>
                  {option === 'kg' ? 'Metric (kg / cm)' : 'Imperial (lbs / in)'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Height & Weight ───────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>Body Measurements</Text>
          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>{heightLabel}</Text>
              <TextInput
                style={styles.input}
                value={height}
                onChangeText={setHeight}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#444"
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>{weightLabel}</Text>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#444"
              />
            </View>
          </View>

          {/* ── Body fat ──────────────────────────────────────────────── */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>
              Body Fat %{' '}
              <Text style={styles.optional}>(optional)</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={bodyFat}
              onChangeText={setBodyFat}
              keyboardType="decimal-pad"
              placeholder="e.g. 18"
              placeholderTextColor="#444"
            />
          </View>

          {/* ── Save button ───────────────────────────────────────────── */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Text>
          </TouchableOpacity>

          {/* ── Previous Records ──────────────────────────────────────── */}
          {history.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 32 }]}>Previous Records</Text>
              <View style={styles.historyContainer}>
                {/* Header row */}
                <View style={styles.historyHeader}>
                  <Text style={[styles.historyCell, styles.historyCellDate, styles.historyHeaderText]}>Date</Text>
                  <Text style={[styles.historyCell, styles.historyHeaderText]}>Weight</Text>
                  <Text style={[styles.historyCell, styles.historyHeaderText]}>Body Fat</Text>
                </View>
                {/* Records */}
                {history.map((record, index) => (
                  <View
                    key={index}
                    style={[styles.historyRow, index % 2 === 0 && styles.historyRowAlt]}
                  >
                    <Text style={[styles.historyCell, styles.historyCellDate, styles.historyCellText]}>
                      {formatDate(record.date)}
                    </Text>
                    <Text style={[styles.historyCell, styles.historyCellText]}>
                      {record.weightKg != null ? `${record.weightKg} kg` : '—'}
                    </Text>
                    <Text style={[styles.historyCell, styles.historyCellText]}>
                      {record.bodyFatPercentage != null ? `${record.bodyFatPercentage}%` : '—'}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0A0A' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#181818',
  },
  backBtn: { backgroundColor: '#1E1E1E', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12 },
  backText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  backBtnSpacer: { width: 62 },
  title: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.2 },
  scroll: { padding: 20 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2A1A1A', borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#FF6B6B44', gap: 10 },
  errorIcon: { fontSize: 16 },
  errorText: { flex: 1, color: '#FF6B6B', fontSize: 14, fontWeight: '500' },
  successBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A2A1A', borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#C8FF0044', gap: 10 },
  successIcon: { fontSize: 18, color: '#C8FF00', fontWeight: '700' },
  successText: { flex: 1, color: '#C8FF00', fontSize: 14, fontWeight: '600' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#555', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginTop: 8 },
  unitToggle: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  unitOption: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#141414', borderWidth: 1, borderColor: '#2A2A2A', alignItems: 'center' },
  unitOptionActive: { backgroundColor: '#C8FF0018', borderColor: '#C8FF00' },
  unitOptionText: { color: '#555', fontSize: 13, fontWeight: '600' },
  unitOptionTextActive: { color: '#C8FF00' },
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  halfField: { flex: 1 },
  field: { marginBottom: 24 },
  fieldLabel: { fontSize: 13, color: '#777', fontWeight: '600', marginBottom: 6 },
  optional: { color: '#444', fontWeight: '400' },
  input: { backgroundColor: '#141414', borderRadius: 12, borderWidth: 1, borderColor: '#2A2A2A', paddingHorizontal: 14, paddingVertical: 12, color: '#FFFFFF', fontSize: 15, fontWeight: '500' },
  saveBtn: { backgroundColor: '#C8FF00', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#0A0A0A', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  historyContainer: { backgroundColor: '#141414', borderRadius: 14, borderWidth: 1, borderColor: '#1E1E1E', overflow: 'hidden' },
  historyHeader: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  historyHeaderText: { color: '#555', fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  historyRow: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 12 },
  historyRowAlt: { backgroundColor: '#0F0F0F' },
  historyCell: { flex: 1, fontSize: 14 },
  historyCellDate: { flex: 1.2 },
  historyCellText: { color: '#CCCCCC', fontWeight: '500' },
});