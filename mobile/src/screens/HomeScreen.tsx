import React, { useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { AppText } from '../components/ui/AppText';
import { PodCard } from '../components/PodCard';
import { EmptyState } from '../components/ui/EmptyState';
import { PodCardSkeleton } from '../components/ui/Skeleton';
import { useAuthStore } from '../store/authStore';
import { usePodStore } from '../store/podStore';
import { activatePod } from '../services/api';
import { MainStackParamList, Pod } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const user = useAuthStore(s => s.user);
  const { colors } = useTheme();
  const { pods, isLoading, loadPods } = usePodStore();

  useFocusEffect(useCallback(() => { loadPods(); }, [loadPods]));

  const handlePodPress = async (pod: Pod) => {
    if (pod.role === 'driver' && pod.status === 'scheduled') {
      try { await activatePod(pod.id); await loadPods(); } catch { /* continue */ }
    }
    navigation.navigate('LiveMap', {
      pod: { ...pod, status: pod.status === 'scheduled' && pod.role === 'driver' ? 'active' : pod.status },
    });
  };

  const nextPod = pods[0];

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View>
          <AppText variant="caption">Welcome back</AppText>
          <AppText variant="title">{user?.full_name ?? user?.email?.split('@')[0] ?? 'Commuter'}</AppText>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
          <AppText variant="caption" color={colors.primary}>🔔</AppText>
        </TouchableOpacity>
      </View>

      {nextPod ? (
        <View style={[styles.hero, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
          <AppText variant="label" color={colors.primary}>Next Commute</AppText>
          <AppText variant="subtitle">{nextPod.name}</AppText>
          <AppText variant="caption">{nextPod.origin_label} → {nextPod.destination_label}</AppText>
        </View>
      ) : null}

      <AppText variant="subtitle" style={styles.section}>Upcoming Pods</AppText>

      {isLoading && pods.length === 0 ? (
        <><PodCardSkeleton /><PodCardSkeleton /></>
      ) : (
        <FlatList
          data={pods}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <PodCard pod={item} onPress={() => handlePodPress(item)} />}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadPods} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              title="No upcoming pods"
              message="Set up your commute schedule to get matched with drivers and riders."
              actionLabel="Manage Schedule"
              onAction={() => navigation.navigate('Schedule')}
            />
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  hero: { borderRadius: 16, padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1 },
  section: { marginBottom: spacing.md },
});
