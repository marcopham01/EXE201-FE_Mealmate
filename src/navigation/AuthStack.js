import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoadingScreen from '../screens/LoadingScreen';
import LoginLandingScreen from '../screens/LoginLandingScreen';
import LoginFormScreen from '../screens/LoginFormScreen';
import RegisterScreen from '../screens/RegisterScreen';
import BottomTabs from './BottomTabs';
import LegalTermsScreen from '../screens/LegalTermsScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import PartnershipContactScreen from '../screens/PartnershipContactScreen';
import PremiumScreen from '../screens/PremiumScreen';
import PaymentWebScreen from '../screens/PaymentWebScreen';
import SettingScreen from '../screens/SettingScreen';
import NotificationScreen from '../screens/NotificationScreen';
import ConfirmPhotoScreen from '../screens/ConfirmPhotoScreen';
import AnalyzingScreen from '../screens/AnalyzingScreen';
import AnalyzeResultScreen from '../screens/AnalyzeResultScreen';
import OnboardingGoalScreen from '../screens/OnboardingGoalScreen';
import OnboardingActivityScreen from '../screens/OnboardingActivityScreen';
import OnboardingHeightScreen from '../screens/OnboardingHeightScreen';
import OnboardingWeightScreen from '../screens/OnboardingWeightScreen';
import OnboardingBMIResultScreen from '../screens/OnboardingBMIResultScreen';
import OnboardingGeneratingScreen from '../screens/OnboardingGeneratingScreen';
import OnboardingPlanReadyScreen from '../screens/OnboardingPlanReadyScreen';
import SearchRecipeScreen from '../screens/SearchRecipeScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';

const Stack = createNativeStackNavigator();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Loading" component={LoadingScreen} />
      <Stack.Screen name="LoginLanding" component={LoginLandingScreen} />
      <Stack.Screen name="LoginForm" component={LoginFormScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Main" component={BottomTabs} />
      <Stack.Screen name="LegalTerms" component={LegalTermsScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="PartnershipContact" component={PartnershipContactScreen} />
      <Stack.Screen name="Premium" component={PremiumScreen} />
      <Stack.Screen name="PaymentWeb" component={PaymentWebScreen} />
      {/* Onboarding BMI Flow */}
      <Stack.Screen name="OnboardingGoal" component={OnboardingGoalScreen} />
      <Stack.Screen name="OnboardingActivity" component={OnboardingActivityScreen} />
      <Stack.Screen name="OnboardingHeight" component={OnboardingHeightScreen} />
      <Stack.Screen name="OnboardingWeight" component={OnboardingWeightScreen} />
      <Stack.Screen name="OnboardingBMIResult" component={OnboardingBMIResultScreen} />
      <Stack.Screen name="OnboardingGenerating" component={OnboardingGeneratingScreen} />
      <Stack.Screen name="OnboardingPlanReady" component={OnboardingPlanReadyScreen} />
      <Stack.Screen name="Settings" component={SettingScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="Notifications" component={NotificationScreen} />
      {/* Camera analyze flow */}
      <Stack.Screen name="ConfirmPhoto" component={ConfirmPhotoScreen} />
      <Stack.Screen name="Analyzing" component={AnalyzingScreen} />
      <Stack.Screen name="AnalyzeResult" component={AnalyzeResultScreen} />
      {/* Recipe search */}
      <Stack.Screen name="SearchRecipe" component={SearchRecipeScreen} />
    </Stack.Navigator>
  );
}


