import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const menuItems = [
    {
      id: 'body-metrics',
      icon: '⏱',
      label: 'Body Metrics',
      subtitle: 'Height, weight & body fat',
      onPress: () => navigation.navigate('BodyMetrics'),
    },
  ];

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <Text style={styles.title}>Profile</Text>
      </View>

      {/* ── Menu list ────────────────────────────────────────────────── */}
      <View style={styles.menuContainer}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconWrap}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>{item.label}</Text>
              {item.subtitle && (
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              )}
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>
        ))}
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
  menuContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
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
  menuIcon: {
    fontSize: 20,
  },
  menuContent: {
    flex: 1,
    gap: 2,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#555',
    fontWeight: '500',
  },
  menuChevron: {
    fontSize: 22,
    color: '#444',
    fontWeight: '300',
  },
});
