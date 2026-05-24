import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { AppText } from '../components/ui/AppText';
import { AppInput } from '../components/ui/AppInput';
import { AppButton } from '../components/ui/AppButton';
import { RootStackParamList } from '../types';
import { env } from '../config/env';
import { requestOtp, getErrorMessage } from '../services/api';
import { spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export function OnboardingScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateDomain = (value: string): boolean => {
    const domain = value.split('@')[1]?.toLowerCase();
    return !!domain && env.allowedEmailDomains.includes(domain);
  };

  const handleContinue = async () => {
    setError('');
    const trimmed = email.trim().toLowerCase();

    // if (!trimmed.includes('@')) {
    //   setError('Enter a valid institutional email');
    //   return;
    // }

    // if (!validateDomain(trimmed)) {
    //   setError(`Email must end with: ${env.allowedEmailDomains.map(d => `@${d}`).join(', ')}`);
    //   return;
    // }

    setLoading(true);
    try {
      console.log('trimmed', trimmed);
      const result = await requestOtp(trimmed);
      console.log('result', result);
      navigation.navigate('Otp', { email: trimmed, devOtp: result.devOtp });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scroll>
      <View style={styles.content}>
        <AppText variant="title">Commute Pods</AppText>
        <AppText variant="caption" style={styles.subtitle}>
          Institutional car pooling with 2-layer security. Verify your campus email to get started.
        </AppText>

        <AppInput
          label="Institutional Email"
          placeholder="you@university.edu"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          error={error}
        />

        <AppButton title="Send Verification Code" onPress={handleContinue} loading={loading} />

        <AppButton
          title="Already have an account? Log in"
          variant="outline"
          onPress={() => navigation.navigate('Login')}
        />
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
