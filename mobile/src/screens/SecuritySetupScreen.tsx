import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { AppText } from '../components/ui/AppText';
import { AppInput } from '../components/ui/AppInput';
import { AppButton } from '../components/ui/AppButton';
import { RootStackParamList } from '../types';
import { setupSecurity, getErrorMessage } from '../services/api';
import { spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'SecuritySetup'>;

export function SecuritySetupScreen({ route, navigation }: Props) {
  const { verifiedEmailToken, email } = route.params;
  const [step, setStep] = useState<1 | 2>(1);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordNext = () => {
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError('Password must contain an uppercase letter');
      return;
    }
    if (!/[a-z]/.test(password)) {
      setError('Password must contain a lowercase letter');
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError('Password must contain a number');
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      setError('Password must contain a special character');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setStep(2);
  };

  const handleComplete = async () => {
    setError('');
    if (!/^\d{6}$/.test(pin)) {
      setError('PIN must be exactly 6 digits');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    setLoading(true);
    try {
      await setupSecurity(verifiedEmailToken, password, pin);
      Alert.alert('Setup Complete', 'Your account is ready. Please log in.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scroll>
      <View style={styles.content}>
        <AppText variant="title">Security Setup</AppText>
        <AppText variant="caption" style={styles.subtitle}>
          {step === 1
            ? `Layer 1: Set your alphanumeric password for ${email}`
            : 'Layer 2: Set your 6-digit security PIN'}
        </AppText>

        {step === 1 ? (
          <>
            <AppInput
              label="Password (Layer 1)"
              placeholder="Alphanumeric password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              error={error}
            />
            <AppInput
              label="Confirm Password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            <AppButton title="Continue to PIN Setup" onPress={handlePasswordNext} />
          </>
        ) : (
          <>
            <AppInput
              label="Security PIN (Layer 2)"
              placeholder="6-digit PIN"
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              error={error}
            />
            <AppInput
              label="Confirm PIN"
              placeholder="Re-enter PIN"
              value={confirmPin}
              onChangeText={setConfirmPin}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
            />
            <AppButton title="Complete Setup" onPress={handleComplete} loading={loading} />
            <AppButton title="Back" variant="outline" onPress={() => setStep(1)} />
          </>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  subtitle: {
    marginBottom: spacing.xl,
  },
});
