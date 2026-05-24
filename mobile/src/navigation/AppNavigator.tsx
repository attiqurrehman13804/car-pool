import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { RootStackParamList } from '../types';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { OtpScreen } from '../screens/OtpScreen';
import { SecuritySetupScreen } from '../screens/SecuritySetupScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { PinLoginScreen } from '../screens/PinLoginScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { LiveMapScreen } from '../screens/LiveMapScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const accessToken = useAuthStore(s => s.accessToken);
  const isHydrated = useAuthStore(s => s.isHydrated);

  if (!isHydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}>
        {accessToken ? (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="LiveMap" component={LiveMapScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Otp" component={OtpScreen} />
            <Stack.Screen name="SecuritySetup" component={SecuritySetupScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="PinLogin" component={PinLoginScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
