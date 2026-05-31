import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing } from '../../theme';

export function Skeleton({ width = '100%', height = 16, style }: { width?: number | string; height?: number; style?: object }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.base, { width, height, backgroundColor: colors.border }, style]} />
  );
}

export function PodCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Skeleton width="60%" height={20} />
      <Skeleton width="90%" height={14} style={{ marginTop: spacing.sm }} />
      <Skeleton width="40%" height={14} style={{ marginTop: spacing.sm }} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.sm, opacity: 0.6 },
  card: { borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1 },
});
