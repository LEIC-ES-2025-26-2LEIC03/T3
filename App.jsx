import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { onAuthStateChanged } from 'firebase/auth';

import { APP_THEME } from './src/navigation/theme';
import { EASE_TRANSITION, forFade } from './src/navigation/transitions';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import TabNavigator from './src/navigation/TabNavigator';

import { auth } from './src/utils/firebaseConfig';
import { getStayLoggedIn, logout } from './src/services/authService';
import { getProfile, upsertProfile } from './src/utils/firestoreDb';
import { ProfileProvider } from './src/context/ProfileContext';

const Root = createStackNavigator();

export default function AppNavigator() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = no user
  const [profileComplete, setProfileComplete] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const isFirstAuthCheck = useRef(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (isFirstAuthCheck.current) {
          isFirstAuthCheck.current = false;
          const stayLoggedIn = await getStayLoggedIn();
          if (!stayLoggedIn) {
            await logout();
            setUser(null);
            setInitializing(false);
            return;
          }
        }

        await upsertProfile(firebaseUser.uid, {});

        try {
          const profile = await getProfile(firebaseUser.uid);
          const hasProfile = profile.height_cm != null && profile.weight_kg != null;
          setProfileComplete(hasProfile);
        } catch {
          setProfileComplete(false);
        }

        setUser(firebaseUser);
      } else {
        isFirstAuthCheck.current = false;
        setUser(null);
        setProfileComplete(false);
      }
      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  if (initializing) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#C8FF00" />
      </View>
    );
  }

  const isLoggedIn = user !== null;

  return (
    <ProfileProvider>
      <SafeAreaProvider initialWindowMetrics={initialWindowMetrics}>
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
            {isLoggedIn ? (
              profileComplete ? (
                <>
                  <Root.Screen name="MainTabs" component={TabNavigator} />
                  <Root.Screen name="ProfileSetup" component={ProfileSetupScreen} />
                </>
              ) : (
                <>
                  <Root.Screen name="ProfileSetup" component={ProfileSetupScreen} />
                  <Root.Screen name="MainTabs" component={TabNavigator} />
                </>
              )
            ) : (
              <>
                <Root.Screen name="Login" component={LoginScreen} />
                <Root.Screen name="Register" component={RegisterScreen} />
              </>
            )}
          </Root.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </ProfileProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
});