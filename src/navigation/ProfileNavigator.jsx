import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import ProfileScreen from '../screens/ProfileScreen';
import BodyMetricsScreen from '../screens/BodyMetricsScreen';
import EditProfileScreen from '../screens/EditProfileScreen';

import { SPRING_TRANSITION, forSlideFromRight } from './transitions';

const Stack = createStackNavigator();

export default function ProfileNavigator() {
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
      <Stack.Screen name="ProfileMenu" component={ProfileScreen} />
      <Stack.Screen name="BodyMetrics" component={BodyMetricsScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    </Stack.Navigator>
  );
}