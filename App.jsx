import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Easing } from 'react-native';

// Override DarkTheme background to match the app's exact dark color.
// This is what actually prevents the white flash on Android — NavigationContainer
// paints this color as the root background before any screen renders.
const APP_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0A0A0A',
    card: '#0A0A0A',
  },
};

import HomeScreen from './src/screens/HomeScreen';
import WorkoutLogger from './src/screens/WorkoutLogger';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import TemplateBuilder from './src/screens/TemplateBuilder';

const Stack = createStackNavigator();
const Root = createStackNavigator();
const Tab = createBottomTabNavigator();

// ─── Shared transition specs ───────────────────────────────────────────────

const SPRING_TRANSITION = {
  animation: 'spring',
  config: {
    stiffness: 280,
    damping: 28,
    mass: 0.8,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
};

const EASE_TRANSITION = {
  animation: 'timing',
  config: {
    duration: 280,
    easing: Easing.out(Easing.poly(4)),
    useNativeDriver: true,
  },
};

// ─── Custom card interpolators ─────────────────────────────────────────────

/**
 * Slide-from-right with a subtle depth effect on the outgoing screen.
 * Feels close to iOS but works well on Android too.
 */
function forSlideFromRight({ current, next, layouts }) {
  const translateX = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [layouts.screen.width, 0],
  });

  // Outgoing screen: slight scale-down + fade
  const outgoingOpacity = next
    ? next.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.92],
      })
    : 1;

  const outgoingScale = next
    ? next.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.96],
      })
    : 1;

  return {
    cardStyle: {
      transform: [{ translateX }],
    },
    overlayStyle: {
      opacity: current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.25],
      }),
    },
  };
}

/**
 * Slide-up sheet animation — used for WorkoutLogger and TemplateBuilder.
 * Feels like a modal without using presentationStyle="modal".
 */
function forSlideUp({ current, layouts }) {
  const translateY = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [layouts.screen.height * 0.12, 0],
  });

  const opacity = current.progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.8, 1],
  });

  const scale = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.97, 1],
  });

  return {
    cardStyle: {
      transform: [{ translateY }, { scale }],
      opacity,
    },
  };
}

/**
 * Fade transition — for tab switches and the profile → main transition.
 */
function forFade({ current }) {
  return {
    cardStyle: {
      opacity: current.progress,
    },
  };
}

// ─── Home stack (Home + WorkoutLogger + TemplateBuilder) ──────────────────

function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        // Dark background prevents any white flash between cards
        contentStyle: { backgroundColor: '#0A0A0A' },
        cardStyle: { backgroundColor: '#0A0A0A' },
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        transitionSpec: {
          open: SPRING_TRANSITION,
          close: SPRING_TRANSITION,
        },
        cardStyleInterpolator: forSlideFromRight,
        cardOverlayEnabled: true,
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      {/* WorkoutLogger and TemplateBuilder use the original slide_from_right */}
      <Stack.Screen
        name="WorkoutLogger"
        component={WorkoutLogger}
        options={{
          gestureDirection: 'horizontal',
          cardStyleInterpolator: forSlideFromRight,
          cardStyle: { backgroundColor: '#0A0A0A' },
          transitionSpec: {
            open: SPRING_TRANSITION,
            close: SPRING_TRANSITION,
          },
        }}
      />
      <Stack.Screen
        name="TemplateBuilder"
        component={TemplateBuilder}
        options={{
          gestureDirection: 'horizontal',
          cardStyleInterpolator: forSlideFromRight,
          cardStyle: { backgroundColor: '#0A0A0A' },
          transitionSpec: {
            open: SPRING_TRANSITION,
            close: SPRING_TRANSITION,
          },
        }}
      />
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
    <NavigationContainer theme={APP_THEME}>
      <Root.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#0A0A0A' },
          cardStyleInterpolator: forFade,
          transitionSpec: {
            open: EASE_TRANSITION,
            close: EASE_TRANSITION,
          },
        }}
      >
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
