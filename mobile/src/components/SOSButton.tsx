import React, { useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppText } from './ui/AppText';
import { colors, radius } from '../theme';
import { sendSos } from '../services/api';
import { getErrorMessage } from '../services/api';

interface SOSButtonProps {
  rideId: string;
  visible?: boolean;
}

export function SOSButton({ rideId, visible = true }: SOSButtonProps) {
  const [sending, setSending] = useState(false);

  if (!visible) {
    return null;
  }

  const handlePress = () => {
    Alert.alert(
      'Emergency SOS',
      'Send an emergency alert to all members of this ride?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send SOS',
          style: 'destructive',
          onPress: async () => {
            setSending(true);
            try {
              await sendSos(rideId);
              Alert.alert('SOS Sent', 'Emergency alert has been broadcast to the pod.');
            } catch (error) {
              Alert.alert('Error', getErrorMessage(error));
            } finally {
              setSending(false);
            }
          },
        },
      ],
    );
  };

  return (
    <TouchableOpacity
      style={[styles.button, sending && styles.sending]}
      onPress={handlePress}
      disabled={sending}
      activeOpacity={0.85}>
      <View style={styles.inner}>
        <AppText variant="label" color="#FFF" style={styles.text}>
          SOS
        </AppText>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.sos,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 100,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '800',
    fontSize: 18,
    marginBottom: 0,
  },
  sending: {
    opacity: 0.7,
  },
});
