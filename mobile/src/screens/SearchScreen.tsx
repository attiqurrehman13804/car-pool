import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, View, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { AppText } from '../components/ui/AppText';
import { AppButton } from '../components/ui/AppButton';
import { PodCard } from '../components/PodCard';
import { EmptyState } from '../components/ui/EmptyState';
import { searchPods, joinPod } from '../services/api';
import { MainStackParamList, Pod } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme';
import { getErrorMessage } from '../services/api';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export function SearchScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const [matches, setMatches] = useState<Pod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await searchPods();
      setMatches(data.map((m: Record<string, unknown>) => ({
        id: m.pod_id ?? m.id,
        name: m.name ?? 'Commute Pod',
        status: 'scheduled',
        ride_id: m.ride_id,
        origin_label: m.origin_label,
        destination_label: m.destination_label,
        scheduled_at: m.scheduled_at,
        ride_status: 'scheduled',
        origin_lat: m.origin_lat,
        origin_lng: m.origin_lng,
        dest_lat: m.dest_lat,
        dest_lng: m.dest_lng,
        role: 'passenger' as const,
        seats_available: m.seats_available,
        match_score: m.match_score,
        driver_email: m.driver_email,
        driver_name: m.driver_name,
      })));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleJoin = async (pod: Pod) => {
    try {
      await joinPod(pod.id);
      navigation.navigate('PodDetail', { podId: pod.id });
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  return (
    <ScreenContainer>
      <AppText variant="title">Find Rides</AppText>
      <AppText variant="caption" style={styles.sub}>Matched pods within 15 min & 500m of your schedule</AppText>
      {error ? <AppText variant="caption" color={colors.error}>{error}</AppText> : null}
      <FlatList
        data={matches}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View>
            <PodCard pod={item} onPress={() => navigation.navigate('PodDetail', { podId: item.id })} showMatchScore />
            <AppButton title="Join Pod" onPress={() => handleJoin(item)} />
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              title="No matches found"
              message="Create a rider schedule to discover available commute pods."
              actionLabel="Set Schedule"
              onAction={() => navigation.navigate('Schedule')}
            />
          ) : null
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ sub: { marginBottom: spacing.lg } });
