import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { AuthStackParamList, MainStackParamList } from '../types';
import { ThemeProvider, useTheme } from '../theme/ThemeContext';
import { TabNavigator } from './TabNavigator';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { OtpScreen } from '../screens/OtpScreen';
import { SecuritySetupScreen } from '../screens/SecuritySetupScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { PinLoginScreen } from '../screens/PinLoginScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';
import { LiveMapScreen } from '../screens/LiveMapScreen';
import { PodDetailScreen } from '../screens/PodDetailScreen';
import { ScheduleScreen } from '../screens/ScheduleScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ChangePasswordScreen } from '../screens/ChangePasswordScreen';
import { VehiclesScreen } from '../screens/VehiclesScreen';
import { EmergencyContactsScreen } from '../screens/EmergencyContactsScreen';
import { AdminScreen } from '../screens/AdminScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

function MainNavigator() {
  return (
    <MainStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <MainStack.Screen name="Tabs" component={TabNavigator} />
      <MainStack.Screen name="LiveMap" component={LiveMapScreen} />
      <MainStack.Screen name="PodDetail" component={PodDetailScreen} />
      <MainStack.Screen name="Schedule" component={ScheduleScreen} />
      <MainStack.Screen name="Settings" component={SettingsScreen} />
      <MainStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <MainStack.Screen name="Vehicles" component={VehiclesScreen} />
      <MainStack.Screen name="EmergencyContacts" component={EmergencyContactsScreen} />
      <MainStack.Screen name="Admin" component={AdminScreen} />
      <MainStack.Screen name="Chat" component={ChatScreen} />
      <MainStack.Screen name="Notifications" component={NotificationsScreen} />
    </MainStack.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
      <AuthStack.Screen name="Otp" component={OtpScreen} />
      <AuthStack.Screen name="SecuritySetup" component={SecuritySetupScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="PinLogin" component={PinLoginScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </AuthStack.Navigator>
  );
}

function RootNavigator() {
  const accessToken = useAuthStore(s => s.accessToken);
  const isHydrated = useAuthStore(s => s.isHydrated);
  const { colors, isDark } = useTheme();

  if (!isHydrated) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
      {accessToken ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

export function AppNavigator() {
  return (
    <ThemeProvider>
      <RootNavigator />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
