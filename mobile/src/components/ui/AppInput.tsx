import React from 'react';
import { TextInput, StyleSheet, TextInputProps, View, useWindowDimensions } from 'react-native';
import { AppText } from './AppText';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing } from '../../theme';

interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function AppInput({ label, error, style, ...props }: AppInputProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  return (
    <View style={[styles.wrapper, { maxWidth: Math.min(width * 0.95, 420) }]}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: error ? colors.error : colors.border, color: colors.text }, style]}
        placeholderTextColor={colors.textSecondary}
        {...props}
      />
      {error ? <AppText variant="caption" color={colors.error}>{error}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%', alignSelf: 'center', marginBottom: spacing.md },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 14, fontSize: 16 },
});
