import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  deleteUser,
  sendPasswordResetEmail
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../utils/firebaseConfig';
import { deleteAllUserData } from '../utils/firestoreDb';

const STAY_LOGGED_IN_KEY = '@stayLoggedIn';

// ─── Stay Logged In preference ────────────────────────────────────────────────

export async function getStayLoggedIn() {
  const value = await AsyncStorage.getItem(STAY_LOGGED_IN_KEY);
  // Default to true so the user stays logged in unless they explicitly opt out
  return value === null ? true : value === 'true';
}

export async function setStayLoggedIn(value) {
  await AsyncStorage.setItem(STAY_LOGGED_IN_KEY, value ? 'true' : 'false');
}

// ─── Auth operations ──────────────────────────────────────────────────────────

/**
 * Register a new user with email and password.
 * Returns { success, user?, error? }
 */
export async function register(email, password) {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    // New users should stay logged in by default
    await setStayLoggedIn(true);
    return { success: true, user: credential.user };
  } catch (e) {
    return { success: false, error: firebaseErrorMessage(e.code) };
  }
}

/**
 * Sign in an existing user.
 * Returns { success, user?, error? }
 */
export async function login(email, password) {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: credential.user };
  } catch (e) {
    return { success: false, error: firebaseErrorMessage(e.code) };
  }
}

/**
 * Sign out the current user.
 */
export async function logout() {
  await signOut(auth);
}

/**
 * Permanently delete the current user's account.
 *
 * Sequence:
 * 1. Wipe all Firestore data (templates, workouts, favourites, etc.)
 *    We do this first while we still have an authenticated session.
 * 2. Delete the Firebase Auth user.
 * 3. Clear local AsyncStorage.
 *
 * Returns { success, error? }
 */
export async function deleteAccount() {
  const user = auth.currentUser;
  if (!user) return { success: false, error: 'Not signed in.' };

  try {
    // 1. Delete all Firestore data
    // If this fails (e.g. network error), we stop here so the user doesn't
    // lose their account while their data remains orphaned.
    await deleteAllUserData(user.uid);

    try {
      // 2. Delete the Firebase Auth user
      await deleteUser(user);
    } catch (authError) {
      // If the user's session is too old, Firebase requires re-auth.
      if (authError.code === 'auth/requires-recent-login') {
        return {
          success: false,
          error: 'For security, please log out and log back in before deleting your account.'
        };
      }
      throw authError; // Rethrow other errors to the outer catch
    }

    // 3. Clear local preferences (only on total success)
    await AsyncStorage.clear();

    return { success: true };
  } catch (e) {
    console.error('[deleteAccount] failed:', e);
    return { success: false, error: firebaseErrorMessage(e.code) };
  }
}

export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (e) {
    return { success: false, error: firebaseErrorMessage(e.code) };
  }
}

// ─── Friendly error messages ──────────────────────────────────────────────────

function firebaseErrorMessage(code) {
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/requires-recent-login':
      return 'For security, please log out and log back in before deleting your account.';
    case 'permission-denied':
      return 'Missing Firestore permission. Please check your database rules and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
