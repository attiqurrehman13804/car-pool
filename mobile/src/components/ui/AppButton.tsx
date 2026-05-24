import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing } from '../../theme';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: AppButtonProps) {
  const { width } = useWindowDimensions();

  const variantStyles = {
    primary: { bg: colors.primary, text: '#FFF', border: colors.primary },
    secondary: { bg: colors.secondary, text: '#FFF', border: colors.secondary },
    outline: { bg: 'transparent', text: colors.primary, border: colors.primary },
    danger: { bg: colors.sos, text: '#FFF', border: colors.sos },
  }[variant];

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: variantStyles.bg,
          borderColor: variantStyles.border,
          maxWidth: Math.min(width * 0.95, 420),
        },
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}>
      {loading ? (
        <ActivityIndicator color={variantStyles.text} />
      ) : (
        <Text style={[styles.text, { color: variantStyles.text }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    alignSelf: 'center',
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.6,
  },
});
