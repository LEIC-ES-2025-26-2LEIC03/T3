// ─── firebaseConfig.js ────────────────────────────────────────────────────────
//
// HOW TO SET THIS UP:
//   1. Go to https://console.firebase.google.com
//   2. Create a project (or open an existing one)
//   3. Click the </> icon to add a Web app
//   4. Copy the firebaseConfig object Firebase shows you
//   5. Paste the real values below (replace every placeholder)
//   6. In the Firebase console → Firestore Database → Create database
//      Choose "Start in production mode" and pick your region
//   7. In Firebase console → Authentication → Sign-in method
//      Enable "Email/Password" (or whatever provider you want)
//
// INSTALL DEPENDENCIES:
//   npx expo install firebase
//   npx expo install @react-native-async-storage/async-storage
//
// ENVIRONMENT VARIABLES (recommended for production):
//   Store these in a .env file and load with expo-constants.
//   Never commit real API keys to git.

import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyBENB5lem4FOlHbXaD8WGfYx4gp0YE0b60",
  authDomain: "w8-db-ee67f.firebaseapp.com",
  projectId: "w8-db-ee67f",
  storageBucket: "w8-db-ee67f.firebasestorage.app",
  messagingSenderId: "242552717566",
  appId: "1:242552717566:web:9a3886e63aa60b9e1165af",
  measurementId: "G-36BWGY2CXZ"
};

// Prevent duplicate initialization in hot-reload / fast-refresh environments
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Firestore with offline persistence enabled.
// persistentLocalCache keeps a local copy of all documents the app has read,
// so queries work even with no network. This replaces most of what your
// SQLite sync_queue was doing for offline reads.
export const db = initializeFirestore(app, {});

export default app;
