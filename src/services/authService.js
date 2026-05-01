import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../utils/firebaseConfig';

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
    default:
      return 'Something went wrong. Please try again.';
  }
}
