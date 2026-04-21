import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './src/screens/HomeScreen';
import WorkoutLogger from './src/screens/WorkoutLogger';
import TemplateBuilder from './src/screens/TemplateBuilder';
 
const Stack = createStackNavigator();
 
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#0A0A0A' },
          gestureEnabled: true,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="WorkoutLogger" component={WorkoutLogger} />
        <Stack.Screen name="TemplateBuilder" component={TemplateBuilder} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}