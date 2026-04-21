import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { APP_THEME } from './src/navigation/theme';
import { EASE_TRANSITION, forFade } from './src/navigation/transitions';

import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import TabNavigator from './src/navigation/TabNavigator';

const Root = createStackNavigator();

export default function AppNavigator() {
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
        <Root.Screen name="MainTabs" component={TabNavigator} />
      </Root.Navigator>
    </NavigationContainer>
  );
}
