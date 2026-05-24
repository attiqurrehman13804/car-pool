import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { AppText } from '../components/ui/AppText';
import { AppInput } from '../components/ui/AppInput';
import { AppButton } from '../components/ui/AppButton';
import { RootStackParamList } from '../types';
import { verifyPin, getErrorMessage } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'PinLogin'>;

export function PinLoginScreen({ route, navigation }: Props) {
  const { partialToken, email } = route.params;
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore(s => s.setSession);

  const handleVerify = async () => {
    setError('');
    if (pin.length !== 6) {
      setError('Enter your 6-digit PIN');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyPin(partialToken, pin);
      await setSession(result.accessToken, result.user);
      navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scroll>
      <View style={styles.content}>
        <AppText variant="title">Security PIN</AppText>
        <AppText variant="caption" style={styles.subtitle}>
          Step 2 of 2 — Enter your Layer 2 PIN for {email}
        </AppText>

        <AppInput
          label="6-Digit PIN"
          placeholder="••••••"
          value={pin}
          onChangeText={setPin}
          keyboardType="number-pad"
          maxLength={6}
          secureTextEntry
          error={error}
        />

        <AppButton title="Unlock Session" onPress={handleVerify} loading={loading} />
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
    marginBottom: spacing.xl,
  },
});
