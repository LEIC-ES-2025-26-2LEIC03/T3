import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={styles.title}>History</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.icon}>📋</Text>
        <Text style={styles.heading}>Coming Soon</Text>
        <Text style={styles.sub}>
          Your workout history will appear here once this feature is implemented.
        </Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  icon: {
    fontSize: 48,
    marginBottom: 8,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#444',
  },
  sub: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    lineHeight: 22,
  },
});
