import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { AppText } from '../components/ui/AppText';
import { AppInput } from '../components/ui/AppInput';
import { AppButton } from '../components/ui/AppButton';
import { AuthStackParamList } from '../types';
import { resetPassword, getErrorMessage } from '../services/api';
import { spacing } from '../theme';
import { useTheme } from '../theme/ThemeContext';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

export function ResetPasswordScreen({ route, navigation }: Props) {
  const { email, devOtp } = route.params;
  const { colors } = useTheme();
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    setError('');
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await resetPassword(email, otp, password);
      Alert.alert('Success', 'Password reset. Please log in.', [{ text: 'OK', onPress: () => navigation.navigate('Login') }]);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scroll>
      <View style={styles.content}>
        <AppText variant="title">Reset Password</AppText>
        {devOtp ? <AppText variant="caption" color={colors.success}>Dev OTP: {devOtp}</AppText> : null}
        <AppInput label="Reset Code" value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} />
        <AppInput label="New Password" value={password} onChangeText={setPassword} secureTextEntry />
        <AppInput label="Confirm Password" value={confirm} onChangeText={setConfirm} secureTextEntry error={error} />
        <AppButton title="Reset Password" onPress={handleReset} loading={loading} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ content: { flex: 1, justifyContent: 'center' } });
