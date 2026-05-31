import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { AppText } from '../components/ui/AppText';
import { AppInput } from '../components/ui/AppInput';
import { AppButton } from '../components/ui/AppButton';
import { RootStackParamList } from '../types';
import { login, getErrorMessage } from '../services/api';
import { spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email.trim().toLowerCase(), password);
      navigation.navigate('PinLogin', {
        partialToken: result.partialToken,
        email: email.trim().toLowerCase(),
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scroll>
      <View style={styles.content}>
        <AppText variant="title">Log In</AppText>
        <AppText variant="caption" style={styles.subtitle}>
          Step 1 of 2 — Enter your Layer 1 password
        </AppText>

        <AppInput
          label="Email"
          placeholder="you@university.edu"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <AppInput
          label="Password"
          placeholder="Your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          error={error}
        />

        <AppButton title="Continue to PIN" onPress={handleLogin} loading={loading} />
        <AppButton title="Forgot Password?" variant="outline" onPress={() => navigation.navigate('ForgotPassword')} />
        <AppButton title="Create account" variant="outline" onPress={() => navigation.navigate('Onboarding')} />
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
