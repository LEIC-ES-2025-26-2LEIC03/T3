import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import WorkoutLogger from './src/screens/WorkoutLogger';
/* import WorkoutHistory from './src/screens/WorkoutHistory'; */

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="ProfileSetup"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0A0A0A' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        <Stack.Screen name="WorkoutLogger" component={WorkoutLogger} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}