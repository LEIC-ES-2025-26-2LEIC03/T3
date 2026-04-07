import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WorkoutLogger from './src/screens/WorkoutLogger';
/* import WorkoutHistory from './src/screens/WorkoutHistory'; */

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="WorkoutLogger"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0A0A0A' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="WorkoutLogger" component={WorkoutLogger} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
