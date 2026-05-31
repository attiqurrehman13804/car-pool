import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { AppText } from '../components/ui/AppText';
import { AppInput } from '../components/ui/AppInput';
import { AppButton } from '../components/ui/AppButton';
import { AuthStackParamList } from '../types';
import { forgotPassword, getErrorMessage } from '../services/api';
import { spacing } from '../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await forgotPassword(email.trim().toLowerCase());
      navigation.navigate('ResetPassword', { email: email.trim().toLowerCase(), devOtp: result.devOtp });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scroll>
      <View style={styles.content}>
        <AppText variant="title">Forgot Password</AppText>
        <AppText variant="caption" style={styles.sub}>Enter your email to receive a reset code</AppText>
        <AppInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" error={error} />
        <AppButton title="Send Reset Code" onPress={handleSubmit} loading={loading} />
        <AppButton title="Back to Login" variant="outline" onPress={() => navigation.navigate('Login')} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ content: { flex: 1, justifyContent: 'center' }, sub: { marginBottom: spacing.xl } });
