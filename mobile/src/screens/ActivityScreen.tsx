import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, View, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { AppText } from '../components/ui/AppText';
import { EmptyState } from '../components/ui/EmptyState';
import { fetchRideHistory, fetchUpcomingPods } from '../services/api';
import { MainStackParamList, Pod } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { PodCard } from '../components/PodCard';
import { spacing, radius } from '../theme';

type Nav = NativeStackNavigationProp<MainStackParamList>;

interface RideHistoryItem {
  id: string;
  origin_label: string;
  destination_label: string;
  scheduled_at: string;
  status: string;
  pod_name: string;
  role: string;
}

export function ActivityScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const [active, setActive] = useState<Pod[]>([]);
  const [history, setHistory] = useState<RideHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pods, rides] = await Promise.all([fetchUpcomingPods(), fetchRideHistory()]);
      setActive(pods.filter((p: Pod) => p.status === 'active' || p.status === 'picked_up'));
      setHistory(rides);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScreenContainer scroll>
      <AppText variant="title">Ride Activity</AppText>

      <AppText variant="subtitle" style={styles.section}>Active</AppText>
      {active.length === 0 ? (
        <AppText variant="caption">No active rides</AppText>
      ) : (
        active.map(pod => (
          <PodCard key={pod.id} pod={pod} onPress={() => navigation.navigate('LiveMap', { pod })} />
        ))
      )}

      <AppText variant="subtitle" style={styles.section}>History</AppText>
      <FlatList
        data={history}
        scrollEnabled={false}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        renderItem={({ item }) => (
          <View style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <AppText variant="body">{item.pod_name}</AppText>
            <AppText variant="caption">{item.origin_label} → {item.destination_label}</AppText>
            <View style={styles.row}>
              <AppText variant="caption">{new Date(item.scheduled_at).toLocaleDateString()}</AppText>
              <AppText variant="caption" color={colors.success}>{item.status}</AppText>
            </View>
          </View>
        )}
        ListEmptyComponent={<EmptyState title="No ride history" message="Completed rides will appear here." />}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.lg, marginBottom: spacing.md },
  historyCard: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
});
