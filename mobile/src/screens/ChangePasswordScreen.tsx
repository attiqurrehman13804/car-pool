import React, { useState } from 'react';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { AppText } from '../components/ui/AppText';
import { AppInput } from '../components/ui/AppInput';
import { AppButton } from '../components/ui/AppButton';
import { changePassword, getErrorMessage } from '../services/api';
import { useTheme } from '../theme/ThemeContext';

export function ChangePasswordScreen() {
  const { colors } = useTheme();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setError('');
    if (newPassword !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await changePassword(oldPassword, newPassword);
      setSuccess('Password changed successfully');
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scroll>
      <AppText variant="title">Change Password</AppText>
      <AppText variant="caption">Min 8 chars, uppercase, lowercase, number, special character</AppText>
      <AppInput label="Current Password" value={oldPassword} onChangeText={setOldPassword} secureTextEntry />
      <AppInput label="New Password" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
      <AppInput label="Confirm Password" value={confirm} onChangeText={setConfirm} secureTextEntry error={error} />
      {success ? <AppText variant="caption" color={colors.success}>{success}</AppText> : null}
      <AppButton title="Update Password" onPress={save} loading={loading} />
    </ScreenContainer>
  );
}
