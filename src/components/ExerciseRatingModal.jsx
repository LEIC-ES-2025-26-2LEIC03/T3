import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';

// ─── Constants ────────────────────────────────────────────────────────────────

const STARS = [1, 2, 3, 4, 5];

const RATING_LABELS = {
  1: 'Too easy',
  2: 'A bit easy',
  3: 'Just right',
  4: 'Challenging',
  5: 'Very tough',
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * ExerciseRatingModal
 *
 * Props:
 *   visible       {boolean}           – controls modal visibility
 *   exerciseName  {string}            – name shown in the header
 *   onSubmit      {(rating, comment) => Promise<void>}
 *                                     – called with (1-5, string|'') on submit;
 *                                       should throw on network error so the
 *                                       modal can show a retry message
 *   onSkip        {() => void}        – called when user taps "Skip"
 */
export default function ExerciseRatingModal({
  visible,
  exerciseName,
  onSubmit,
  onSkip,
}) {
  const [rating, setRating]     = useState(0);
  const [comment, setComment]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [networkError, setNetworkError]       = useState('');
  const [success, setSuccess]   = useState(false);

  // ── Reset state when modal opens ──────────────────────────────────────────
  const handleOpen = () => {
    setRating(0);
    setComment('');
    setSubmitting(false);
    setValidationError('');
    setNetworkError('');
    setSuccess(false);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    // Client-side validation (Scenario 2)
    if (rating === 0) {
      setValidationError('Please select a rating before submitting.');
      setNetworkError('');
      return;
    }

    setValidationError('');
    setNetworkError('');
    setSubmitting(true);

    try {
      await onSubmit(rating, comment.trim());
      setSuccess(true);
    } catch {
      setNetworkError("Couldn't send feedback. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.successIcon}>🎉</Text>
            <Text style={styles.successTitle}>Thanks for your feedback!</Text>
            <Text style={styles.successSubtitle}>
              Your rating helps improve future suggestions.
            </Text>
            <TouchableOpacity style={styles.submitBtn} onPress={onSkip}>
              <Text style={styles.submitBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onShow={handleOpen}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.overlay}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.sheet}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.handle} />
                <Text style={styles.headerLabel}>Rate this exercise</Text>
                <Text style={styles.exerciseName}>{exerciseName}</Text>
              </View>

              {/* Stars */}
              <View style={styles.starsRow}>
                {STARS.map(star => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => {
                      setRating(star);
                      setValidationError('');
                    }}
                    style={styles.starBtn}
                    accessibilityLabel={`Rate ${star} star${star > 1 ? 's' : ''}`}
                    accessibilityRole="button"
                  >
                    <Text style={[
                      styles.star,
                      star <= rating && styles.starActive,
                    ]}>
                      ★
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Dynamic label */}
              {rating > 0 && (
                <Text style={styles.ratingLabel}>{RATING_LABELS[rating]}</Text>
              )}

              {/* Validation error */}
              {validationError !== '' && (
                <View style={styles.inlineError} testID="validation-error">
                  <Text style={styles.inlineErrorText}>{validationError}</Text>
                </View>
              )}

              {/* Network error */}
              {networkError !== '' && (
                <View style={styles.inlineError} testID="network-error">
                  <Text style={styles.inlineErrorText}>{networkError}</Text>
                </View>
              )}

              {/* Optional comment */}
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment (optional)"
                placeholderTextColor="#444"
                value={comment}
                onChangeText={setComment}
                multiline
                maxLength={300}
                testID="comment-input"
              />

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.skipBtn}
                  onPress={onSkip}
                  disabled={submitting}
                >
                  <Text style={styles.skipBtnText}>Skip</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitBtn, styles.submitBtnFlex, submitting && styles.submitBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={submitting}
                  testID="submit-button"
                >
                  {submitting
                    ? <ActivityIndicator color="#0A0A0A" size="small" />
                    : <Text style={styles.submitBtnText}>Submit</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    paddingTop: 16,
    gap: 16,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    alignItems: 'center',
    gap: 4,
  },
  headerLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  exerciseName: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 4,
  },
  starBtn: {
    padding: 4,
  },
  star: {
    fontSize: 40,
    color: '#333',
  },
  starActive: {
    color: '#C8FF00',
  },
  ratingLabel: {
    textAlign: 'center',
    fontSize: 13,
    color: '#C8FF00',
    fontWeight: '600',
    marginTop: -8,
  },
  inlineError: {
    backgroundColor: '#2A1A1A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#FF6B6B44',
  },
  inlineErrorText: {
    color: '#FF6B6B',
    fontSize: 13,
    fontWeight: '500',
  },
  commentInput: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    color: '#FFFFFF',
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  skipBtn: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  skipBtnText: {
    color: '#888',
    fontSize: 15,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: '#C8FF00',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  submitBtnFlex: {
    flex: 2,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#0A0A0A',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  successIcon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 4,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});