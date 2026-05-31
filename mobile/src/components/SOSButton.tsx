import React, { useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppText } from './ui/AppText';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme';
import { sendSos, getErrorMessage } from '../services/api';

interface Position { lat: number; lng: number; heading?: number; speed?: number }

interface SOSButtonProps {
  rideId: string;
  visible?: boolean;
  getLocation?: () => Promise<Position>;
}

export function SOSButton({ rideId, visible = true, getLocation }: SOSButtonProps) {
  const { colors } = useTheme();
  const [sending, setSending] = useState(false);

  if (!visible) return null;

  const handlePress = () => {
    Alert.alert('Emergency SOS', 'Send an emergency alert with your GPS location?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send SOS',
        style: 'destructive',
        onPress: async () => {
          setSending(true);
          try {
            let lat: number | undefined;
            let lng: number | undefined;
            if (getLocation) {
              try {
                const pos = await getLocation();
                lat = pos.lat;
                lng = pos.lng;
              } catch { /* continue without GPS */ }
            }
            await sendSos(rideId, lat, lng);
            Alert.alert('SOS Sent', 'Emergency alert broadcast to pod and admins.');
          } catch (error) {
            Alert.alert('Error', getErrorMessage(error));
          } finally {
            setSending(false);
          }
        },
      },
    ]);
  };

  return (
    <TouchableOpacity style={[styles.button, { backgroundColor: colors.sos }, sending && styles.sending]} onPress={handlePress} disabled={sending} activeOpacity={0.85}>
      <View style={styles.inner}>
        <AppText variant="label" color="#FFF" style={styles.text}>SOS</AppText>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { position: 'absolute', bottom: 180, right: 24, width: 72, height: 72, borderRadius: radius.full, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, zIndex: 100 },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: '800', fontSize: 18, marginBottom: 0 },
  sending: { opacity: 0.7 },
});
