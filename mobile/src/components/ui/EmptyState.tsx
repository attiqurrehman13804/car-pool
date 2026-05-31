import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { AppButton } from './AppButton';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme';

interface EmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <View style={[styles.icon, { backgroundColor: colors.primary + '15' }]}>
        <AppText variant="title" color={colors.primary}>🚌</AppText>
      </View>
      <AppText variant="subtitle" style={styles.title}>{title}</AppText>
      <AppText variant="caption" color={colors.textSecondary} style={styles.message}>{message}</AppText>
      {actionLabel && onAction ? (
        <AppButton title={actionLabel} onPress={onAction} style={styles.button} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  icon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  title: { textAlign: 'center', marginBottom: spacing.sm },
  message: { textAlign: 'center', marginBottom: spacing.lg },
  button: { minWidth: 200 },
});
