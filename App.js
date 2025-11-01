import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AuthStack from './src/navigation/AuthStack';
import { WeekProvider } from './src/context/WeekContext';
import { PremiumProvider } from './src/context/PremiumContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { MealsProvider } from './src/context/MealsContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <WeekProvider>
        <PremiumProvider>
          <NotificationProvider>
            <MealsProvider>
              <NavigationContainer>
                <AuthStack />
              </NavigationContainer>
            </MealsProvider>
          </NotificationProvider>
        </PremiumProvider>
      </WeekProvider>
    </SafeAreaProvider>
  );
}