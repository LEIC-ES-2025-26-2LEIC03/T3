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

import { Platform } from 'react-native';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, memoryLocalCache, getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Prevent duplicate initialization in hot-reload / fast-refresh environments
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Guard against double-init on Expo hot reload (same pattern as initializeApp above)
const firestoreCache = Platform.OS === 'web' ? persistentLocalCache() : memoryLocalCache();

export const db = getApps().length === 1
  ? initializeFirestore(app, { localCache: firestoreCache })
  : getFirestore(app);

export default app;
