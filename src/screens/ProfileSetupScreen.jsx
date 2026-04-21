import React, { useState } from 'react';
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
import { saveUserProfile, updateProfile } from '../services/profileService';

const USER_ID = 'user-001'; // replace with real auth ID when available

export default function ProfileSetupScreen({ navigation }) {
  // ── US-03: unit preference ──────────────────────────────────────────────
  const [units, setUnits] = useState('kg');

  // ── US-20: profile details ──────────────────────────────────────────────
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [fitnessGoals, setFitnessGoals] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Derived labels based on unit preference ─────────────────────────────
  const heightLabel = units === 'kg' ? 'Height (cm)' : 'Height (in)';
  const weightLabel = units === 'kg' ? 'Weight (kg)' : 'Weight (lbs)';

  const handleSave = async () => {
    setErrorMsg('');
    setSaving(true);

    try {
      // Save unit preference first (US-03)
      const unitsResult = await updateProfile(USER_ID, { units });
      if (!unitsResult.success) {
        setErrorMsg(unitsResult.error);
        return;
      }

      // Convert to metric for storage if user chose imperial (US-20)
      const heightCm = units === 'kg'
        ? parseFloat(height)
        : parseFloat(height) * 2.54;

      const weightKg = units === 'kg'
        ? parseFloat(weight)
        : parseFloat(weight) * 0.453592;

      // Save profile details (US-20)
      const profileResult = await saveUserProfile(USER_ID, {
        heightCm: isNaN(heightCm) ? null : Math.round(heightCm),
        weightKg: isNaN(weightKg) ? null : parseFloat(weightKg.toFixed(1)),
        bodyFatPercentage: bodyFat !== '' ? parseFloat(bodyFat) : null,
        fitnessGoals: fitnessGoals.trim(),
      });

      if (!profileResult.success) {
        setErrorMsg(profileResult.error);
        return;
      }

      navigation.replace('MainTabs');
    } catch (e) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Header ───────────────────────────────────────────────── */}
          <Text style={styles.heading}>Set Up Your Profile</Text>
          <Text style={styles.subheading}>
            Help us personalise your training recommendations.
          </Text>

          {/* ── Error banner ─────────────────────────────────────────── */}
          {errorMsg !== '' && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {/* ── US-03: Unit preference ───────────────────────────────── */}
          <Text style={styles.sectionLabel}>Measurement System</Text>
          <View style={styles.unitToggle}>
            {['kg', 'lbs'].map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.unitOption,
                  units === option && styles.unitOptionActive,
                ]}
                onPress={() => setUnits(option)}
              >
                <Text
                  style={[
                    styles.unitOptionText,
                    units === option && styles.unitOptionTextActive,
                  ]}
                >
                  {option === 'kg' ? 'Metric (kg / cm)' : 'Imperial (lbs / in)'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── US-20: Height & Weight ───────────────────────────────── */}
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

          {/* ── US-20: Body fat ──────────────────────────────────────── */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Body Fat % <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={styles.input}
              value={bodyFat}
              onChangeText={setBodyFat}
              keyboardType="decimal-pad"
              placeholder="e.g. 18"
              placeholderTextColor="#444"
            />
          </View>

          {/* ── US-20: Fitness goals ─────────────────────────────────── */}
          <Text style={styles.sectionLabel}>Fitness Goals</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={fitnessGoals}
            onChangeText={setFitnessGoals}
            placeholder="e.g. Build strength, lose fat, improve endurance…"
            placeholderTextColor="#444"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* ── Save button ──────────────────────────────────────────── */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>
              {saving ? 'Saving…' : 'Save & Continue'}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scroll: {
    padding: 20,
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  subheading: {
    fontSize: 14,
    color: '#555',
    marginBottom: 28,
    lineHeight: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A1A1A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FF6B6B44',
    gap: 10,
  },
  errorIcon: {
    fontSize: 16,
  },
  errorText: {
    flex: 1,
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 8,
  },
  unitToggle: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  unitOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    alignItems: 'center',
  },
  unitOptionActive: {
    backgroundColor: '#C8FF0018',
    borderColor: '#C8FF00',
  },
  unitOptionText: {
    color: '#555',
    fontSize: 13,
    fontWeight: '600',
  },
  unitOptionTextActive: {
    color: '#C8FF00',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfField: {
    flex: 1,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#777',
    fontWeight: '600',
    marginBottom: 6,
  },
  optional: {
    color: '#444',
    fontWeight: '400',
  },
  input: {
    backgroundColor: '#141414',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  textArea: {
    minHeight: 100,
    marginBottom: 28,
  },
  saveBtn: {
    backgroundColor: '#C8FF00',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: '#0A0A0A',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});