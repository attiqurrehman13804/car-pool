import React, { useState } from 'react';
import { View, StyleSheet, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { AppText } from '../components/ui/AppText';
import { AppInput } from '../components/ui/AppInput';
import { AppButton } from '../components/ui/AppButton';
import { updateProfile, requestOtp } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { MainStackParamList } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { getErrorMessage } from '../services/api';
import { spacing } from '../theme';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const user = useAuthStore(s => s.user);
  const { isDark, toggleTheme, colors } = useTheme();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [defaultRole, setDefaultRole] = useState('rider');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const save = async () => {
    setLoading(true);
    setError('');
    try {
      await updateProfile({ fullName, phone, defaultRole });
      setSuccess('Profile updated');
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const requestPinChangeOtp = async () => {
    if (!user?.email) return;
    try {
      await requestOtp(user.email);
      setSuccess('OTP sent to your email for PIN change');
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  return (
    <ScreenContainer scroll>
      <AppText variant="title">Settings</AppText>

      <View style={[styles.row, { borderColor: colors.border }]}>
        <AppText variant="body">Dark Mode</AppText>
        <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ true: colors.primary }} />
      </View>

      <AppInput label="Full Name" value={fullName} onChangeText={setFullName} placeholder="Your name" />
      <AppInput label="Phone" value={phone} onChangeText={setPhone} placeholder="+1 234 567 8900" keyboardType="phone-pad" />
      <AppInput label="Default Role" value={defaultRole} onChangeText={setDefaultRole} placeholder="driver, rider, or both" />

      {error ? <AppText variant="caption" color={colors.error}>{error}</AppText> : null}
      {success ? <AppText variant="caption" color={colors.success}>{success}</AppText> : null}

      <AppButton title="Save Profile" onPress={save} loading={loading} />
      <AppButton title="Change Password" variant="outline" onPress={() => navigation.navigate('ChangePassword')} />
      <AppButton title="Send OTP to Change PIN" variant="outline" onPress={requestPinChangeOtp} />
      <AppButton title="Back" variant="outline" onPress={() => navigation.goBack()} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, marginBottom: spacing.lg },
});
