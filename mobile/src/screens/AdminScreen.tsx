import React, { useCallback, useState } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { AppText } from '../components/ui/AppText';
import { AppButton } from '../components/ui/AppButton';
import { fetchAdminSummary, fetchAdminSos, fetchAdminHeatmap, resolveSos } from '../services/api';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius } from '../theme';

export function AdminScreen() {
  const { colors } = useTheme();
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  const [sosAlerts, setSosAlerts] = useState<Record<string, unknown>[]>([]);
  const [heatmap, setHeatmap] = useState<Record<string, unknown>[]>([]);

  const load = useCallback(async () => {
    try {
      const [s, sos, hm] = await Promise.all([fetchAdminSummary(), fetchAdminSos(), fetchAdminHeatmap()]);
      setSummary(s);
      setSosAlerts(sos);
      setHeatmap(hm);
    } catch { /* unauthorized */ }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScreenContainer scroll>
      <AppText variant="title">Admin Dashboard</AppText>
      {summary ? (
        <View style={[styles.stats, { backgroundColor: colors.primary + '12' }]}>
          <AppText variant="body">Users: {summary.users}</AppText>
          <AppText variant="body">Rides: {summary.rides}</AppText>
          <AppText variant="body">Pods: {summary.pods}</AppText>
          <AppText variant="body" color={colors.sos}>Open SOS: {summary.openSos}</AppText>
        </View>
      ) : null}

      <AppText variant="subtitle" style={styles.section}>SOS Alerts</AppText>
      <FlatList
        data={sosAlerts}
        scrollEnabled={false}
        keyExtractor={item => item.id as string}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <AppText variant="body">{item.email as string}</AppText>
            <AppText variant="caption">{item.lat as number}, {item.lng as number}</AppText>
            {!item.resolved_at ? (
              <AppButton title="Resolve" variant="outline" onPress={() => resolveSos(item.id as string).then(load)} />
            ) : (
              <AppText variant="caption" color={colors.success}>Resolved</AppText>
            )}
          </View>
        )}
        ListEmptyComponent={<AppText variant="caption">No SOS alerts</AppText>}
      />

      <AppText variant="subtitle" style={styles.section}>Commute Heatmap ({heatmap.length} points)</AppText>
      {heatmap.slice(0, 10).map((p, i) => (
        <AppText key={i} variant="caption">{p.lat as number}, {p.lng as number} — {p.count as number} commuters</AppText>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  stats: { padding: spacing.lg, borderRadius: radius.lg, marginBottom: spacing.lg, gap: 4 },
  section: { marginTop: spacing.lg, marginBottom: spacing.md },
  card: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.sm },
});
