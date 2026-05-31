import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { AppText } from '../components/ui/AppText';
import { AppInput } from '../components/ui/AppInput';
import { AppButton } from '../components/ui/AppButton';
import { RootStackParamList } from '../types';
import { verifyOtp, requestOtp, getErrorMessage } from '../services/api';
import { spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Otp'>;

export function OtpScreen({ route, navigation }: Props) {
  const { email, devOtp } = route.params;
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [resendCooldown, setResendCooldown] = useState(0);

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      const result = await requestOtp(email);
      setResendCooldown(60);
      if (result.devOtp) {
        setError('');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleVerify = async () => {
    setError('');
    if (code.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyOtp(email, code);
      navigation.navigate('SecuritySetup', {
        verifiedEmailToken: result.verifiedEmailToken,
        email,
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
        <AppText variant="title">Verify Email</AppText>
        <AppText variant="caption" style={styles.subtitle}>
          Enter the 6-digit code sent to {email}
        </AppText>

        {devOtp ? (
          <AppText variant="caption" color="#16A34A" style={styles.devHint}>
            Dev OTP: {devOtp}
          </AppText>
        ) : null}

        <AppInput
          label="Verification Code"
          placeholder="123456"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
          error={error}
        />

        <AppButton title="Verify Code" onPress={handleVerify} loading={loading} />
        <AppButton
          title={resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
          variant="outline"
          onPress={handleResend}
          disabled={resendCooldown > 0}
        />
        <AppButton title="Back" variant="outline" onPress={() => navigation.goBack()} />
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
    marginBottom: spacing.lg,
  },
  devHint: {
    marginBottom: spacing.md,
    fontWeight: '600',
  },
});
