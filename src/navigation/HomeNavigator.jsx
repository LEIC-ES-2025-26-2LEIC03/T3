import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import HomeScreen from '../screens/HomeScreen';
import WorkoutLogger from '../screens/WorkoutLogger';
import TemplateBuilder from '../screens/TemplateBuilder';

import { SPRING_TRANSITION, forSlideFromRight } from './transitions';

const Stack = createStackNavigator();

export default function HomeNavigator() {
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
