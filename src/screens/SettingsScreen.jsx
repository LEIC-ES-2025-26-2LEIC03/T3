import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { logout, deleteAccount } from '../services/authService';

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Could not log out. Please try again.');
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const result = await deleteAccount();
            if (!result.success) {
              Alert.alert('Error', result.error);
              setDeleting(false);
            } else {
              // Usually onAuthStateChanged handles this, but set back to false
              // just in case there's a lag in state propagation.
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.menuContainer}>
          {/* ── Edit Profile ─────────────────────────────────────────── */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('ProfileTab', { screen: 'ProfileMenu' })}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconWrap}>
              <Text style={styles.menuIcon}>✎</Text>
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Edit Profile</Text>
              <Text style={styles.menuSubtitle}>Name, bio & profile picture</Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Account actions ─────────────────────────────────────── */}
        <View style={styles.accountActions}>
          {/* ── Log Out button ── */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            disabled={loggingOut || deleting}
            activeOpacity={0.7}
          >
            {loggingOut ? (
              <ActivityIndicator color="#FF6B6B" />
            ) : (
              <>
                <Text style={styles.logoutIcon}>⏻</Text>
                <Text style={styles.logoutText}>Log Out</Text>
              </>
            )}
          </TouchableOpacity>

          {/* ── Delete Account button ── */}
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDeleteAccount}
            disabled={loggingOut || deleting}
            activeOpacity={0.7}
          >
            {deleting ? (
              <ActivityIndicator color="#FF4444" />
            ) : (
              <>
                <Text style={styles.deleteIcon}>🗑</Text>
                <Text style={styles.deleteText}>Delete Account</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

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
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    justifyContent: 'space-between',
    paddingBottom: 32,
  },
  accountActions: {
    gap: 12,
  },
  menuContainer: {
    gap: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#C8FF0015',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuIcon: { fontSize: 20, color: '#C8FF00' },
  menuContent: { flex: 1, gap: 2 },
  menuLabel: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  menuSubtitle: { fontSize: 12, color: '#555', fontWeight: '500' },
  menuChevron: { fontSize: 22, color: '#444', fontWeight: '300' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1215',
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#FF6B6B33',
    gap: 10,
  },
  logoutIcon: {
    fontSize: 18,
    color: '#FF6B6B',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF6B6B',
    letterSpacing: 0.3,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A0A0A',
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#FF444433',
    gap: 10,
  },
  deleteIcon: {
    fontSize: 16,
    color: '#FF4444',
  },
  deleteText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF4444',
    letterSpacing: 0.3,
  },
});
