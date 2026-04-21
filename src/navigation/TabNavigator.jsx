import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import HomeNavigator from './HomeNavigator';

const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }) {
  const icons = {
    History: '◷',
    Home:    '⬡',
    Settings:'◈',
  };

  const color = focused ? '#C8FF00' : '#444';

  return (
    <View style={styles.tabItem}>
      <Text style={[styles.tabIcon, { color }]}>{icons[label]}</Text>
      <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      // Mount all tab screens upfront — prevents the title/content flash
      // that occurs when a tab is visited for the first time
      lazy={false}
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="HistoryTab"
        component={HistoryScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="History" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="HomeTab"
        component={HomeNavigator}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Home" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Settings" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#111111',
    borderTopWidth: 1,
    borderTopColor: '#1E1E1E',
    height: 72,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    width: 72,
  },
  tabIcon: {
    fontSize: 22,
    lineHeight: 26,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
