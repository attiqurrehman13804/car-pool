import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { AppText } from './ui/AppText';
import { useTheme } from '../theme/ThemeContext';
import { Pod } from '../types';
import { radius, spacing, shadows } from '../theme';

interface PodCardProps {
  pod: Pod;
  onPress: () => void;
  showMatchScore?: boolean;
}

export function PodCard({ pod, onPress, showMatchScore }: PodCardProps) {
  const { colors } = useTheme();
  const scheduledDate = new Date(pod.scheduled_at);
  const statusColor = pod.status === 'active' ? colors.success : pod.status === 'completed' ? colors.textSecondary : colors.primary;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, shadows.md]}
      onPress={onPress}
      activeOpacity={0.85}>
      <View style={styles.header}>
        <AppText variant="subtitle">{pod.name}</AppText>
        <View style={[styles.badge, { backgroundColor: statusColor + '18' }]}>
          <AppText variant="caption" color={statusColor}>{pod.status.toUpperCase()}</AppText>
        </View>
      </View>
      <AppText variant="body">{pod.origin_label ?? 'Origin'} → {pod.destination_label ?? 'Destination'}</AppText>
      <AppText variant="caption">
        {scheduledDate.toLocaleDateString()} at {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </AppText>
      <View style={styles.footer}>
        <AppText variant="caption">Role: {pod.role}</AppText>
        {pod.seats_available != null ? <AppText variant="caption">{pod.seats_available} seats left</AppText> : null}
        {showMatchScore && pod.match_score != null ? (
          <AppText variant="caption" color={colors.success}>{pod.match_score}% match</AppText>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm, flexWrap: 'wrap', gap: 8 },
});
