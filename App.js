import React from 'react';
import { LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AuthStack from './src/navigation/AuthStack';
import { WeekProvider } from './src/context/WeekContext';
import { PremiumProvider } from './src/context/PremiumContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { MealsProvider } from './src/context/MealsContext';
import { SavedMealsProvider } from './src/context/SavedMealsContext';

// Ignore warnings từ expo-notifications về Expo Go SDK 53+
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'expo-notifications functionality is not fully supported',
]);

export default function App() {
  return (
    <SafeAreaProvider>
      <WeekProvider>
        <PremiumProvider>
          <NotificationProvider>
            <MealsProvider>
              <SavedMealsProvider>
                <NavigationContainer>
                  <AuthStack />
                </NavigationContainer>
              </SavedMealsProvider>
            </MealsProvider>
          </NotificationProvider>
        </PremiumProvider>
      </WeekProvider>
    </SafeAreaProvider>
  );
}