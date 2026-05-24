import React from 'react';
import { View, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { AppText } from './ui/AppText';
import { colors, radius, spacing } from '../theme';
import { Pod } from '../types';

interface PodCardProps {
  pod: Pod;
  onPress: () => void;
}

export function PodCard({ pod, onPress }: PodCardProps) {
  const { width } = useWindowDimensions();
  const scheduledDate = new Date(pod.scheduled_at);

  return (
    <TouchableOpacity
      style={[styles.card, { width: Math.min(width * 0.92, 480) }]}
      onPress={onPress}
      activeOpacity={0.85}>
      <View style={styles.header}>
        <AppText variant="subtitle">{pod.name}</AppText>
        <View style={[styles.badge, pod.status === 'active' && styles.badgeActive]}>
          <AppText variant="caption" color={pod.status === 'active' ? colors.success : colors.primary}>
            {pod.status.toUpperCase()}
          </AppText>
        </View>
      </View>

      <AppText variant="body">
        {pod.origin_label ?? 'Origin'} → {pod.destination_label ?? 'Destination'}
      </AppText>
      <AppText variant="caption">
        {scheduledDate.toLocaleDateString()} at {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </AppText>
      <AppText variant="caption">Role: {pod.role}</AppText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  badge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  badgeActive: {
    backgroundColor: '#F0FDF4',
  },
});
