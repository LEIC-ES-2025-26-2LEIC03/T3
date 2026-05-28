import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { resetPassword } from '../services/authService';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    setErrorMsg('');

    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword(email.trim());
        if (!result.success) {
        setErrorMsg(result.error);
        } else {
        setSent(true);
        }
    } catch {
      setErrorMsg('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
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
          {/* ── Logo ───────────────────────────────────────────────── */}
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>
              W<Text style={styles.logoAccent}>8</Text>
            </Text>
          </View>

          {/* ── Heading ────────────────────────────────────────────── */}
          <Text style={styles.heading}>Reset Password</Text>
          <Text style={styles.subheading}>
            Enter your email and we'll send you a link to reset your password.
          </Text>

          {/* ── Success state ──────────────────────────────────────── */}
          {sent ? (
            <View style={styles.successContainer}>
              <View style={styles.successIconWrap}>
                <Text style={styles.successIconText}>✓</Text>
              </View>
              <Text style={styles.successTitle}>Check your inbox</Text>
              <Text style={styles.successBody}>
                A reset link has been sent to{' '}
                <Text style={styles.successEmail}>{email.trim()}</Text>.
                {'\n\n'}
                If it doesn't appear within a minute, check your spam folder.
              </Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => navigation.goBack()}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryBtnText}>Back to Log In</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* ── Error banner ─────────────────────────────────────── */}
              {errorMsg !== '' && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorIcon}>⚠️</Text>
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              )}

              {/* ── Email ────────────────────────────────────────────── */}
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="you@example.com"
                placeholderTextColor="#444"
                autoFocus
              />

              {/* ── Send button ──────────────────────────────────────── */}
              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                onPress={handleReset}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#0A0A0A" />
                ) : (
                  <Text style={styles.primaryBtnText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>

              {/* ── Back link ────────────────────────────────────────── */}
              <TouchableOpacity
                style={styles.backRow}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.backText}>← Back to Log In</Text>
              </TouchableOpacity>
            </>
          )}

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
    padding: 24,
    flexGrow: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 40,
  },
  logo: {
    fontSize: 52,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -2,
  },
  logoAccent: {
    color: '#C8FF00',
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
  fieldLabel: {
    fontSize: 13,
    color: '#777',
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#141414',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 20,
  },
  primaryBtn: {
    backgroundColor: '#C8FF00',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: '#0A0A0A',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  backRow: {
    alignItems: 'center',
    marginTop: 20,
  },
  backText: {
    color: '#555',
    fontSize: 14,
    fontWeight: '600',
  },

  // ── Success state ──────────────────────────────────────────────────
  successContainer: {
    alignItems: 'center',
    paddingTop: 16,
    gap: 12,
  },
  successIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(200,255,0,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(200,255,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successIconText: {
    fontSize: 28,
    color: '#C8FF00',
    fontWeight: '700',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  successBody: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  successEmail: {
    color: '#888',
    fontWeight: '600',
  },
});
