import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import HomeScreen from './src/screens/HomeScreen';
import WorkoutLogger from './src/screens/WorkoutLogger';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import TemplateBuilder from './src/screens/TemplateBuilder';

const Stack = createStackNavigator();
const Root = createStackNavigator();
const Tab = createBottomTabNavigator();

// ─── Home stack (Home + WorkoutLogger) ────────────────────────────────────

function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0A0A0A' },
        gestureEnabled: true,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="WorkoutLogger" component={WorkoutLogger} />
      <Stack.Screen name="TemplateBuilder" component={TemplateBuilder} />
    </Stack.Navigator>
  );
}

// ─── Tab bar icon ──────────────────────────────────────────────────────────

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

// ─── Main tab navigator ────────────────────────────────────────────────────

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
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
        component={HomeStack}
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

// ─── Root navigator (ProfileSetup → MainTabs) ─────────────────────────────

export default function App() {
  return (
    <NavigationContainer>
      <Root.Navigator screenOptions={{ headerShown: false }}>
        <Root.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        <Root.Screen name="MainTabs" component={MainTabs} />
      </Root.Navigator>
    </NavigationContainer>
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
