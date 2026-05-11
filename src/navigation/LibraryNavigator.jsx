import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import LibraryScreen from '../screens/LibraryScreen';
import ExerciseHistoryScreen from '../screens/ExerciseHistoryScreen';

import { SPRING_TRANSITION, forSlideFromRight } from './transitions';

const Stack = createStackNavigator();

export default function LibraryNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
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
      <Stack.Screen name="Library" component={LibraryScreen} />
      <Stack.Screen name="ExerciseHistory" component={ExerciseHistoryScreen} />
    </Stack.Navigator>
  );
}
