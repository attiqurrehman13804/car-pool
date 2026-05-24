import React, { useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { AppText } from '../components/ui/AppText';
import { AppButton } from '../components/ui/AppButton';
import { PodCard } from '../components/PodCard';
import { RootStackParamList, Pod } from '../types';
import { useAuthStore } from '../store/authStore';
import { usePodStore } from '../store/podStore';
import { activatePod } from '../services/api';
import { spacing, colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export function DashboardScreen({ navigation }: Props) {
  const user = useAuthStore(s => s.user);
  const clearSession = useAuthStore(s => s.clearSession);
  const { pods, isLoading, error, loadPods } = usePodStore();

  useFocusEffect(
    useCallback(() => {
      loadPods();
    }, [loadPods]),
  );

  const handlePodPress = async (pod: Pod) => {
    if (pod.role === 'driver' && pod.status === 'scheduled') {
      try {
        await activatePod(pod.id);
        await loadPods();
      } catch {
        // Continue to map even if activation fails
      }
    }
    navigation.navigate('LiveMap', { pod: { ...pod, status: pod.status === 'scheduled' && pod.role === 'driver' ? 'active' : pod.status } });
  };

  const handleLogout = async () => {
    await clearSession();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <AppText variant="title">Commute Pods</AppText>
        <AppText variant="caption">{user?.email ?? 'Welcome back'}</AppText>
      </View>

      {isLoading && pods.length === 0 ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={pods}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <PodCard pod={item} onPress={() => handlePodPress(item)} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={loadPods} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <AppText variant="subtitle">No upcoming pods</AppText>
              <AppText variant="caption">
                Pull to refresh or run the backend seed script for sample data.
              </AppText>
            </View>
          }
        />
      )}

      {error ? (
        <AppText variant="caption" color={colors.error} style={styles.error}>
          {error}
        </AppText>
      ) : null}

      <AppButton title="Log Out" variant="outline" onPress={handleLogout} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.lg,
  },
  list: {
    paddingBottom: spacing.lg,
    flexGrow: 1,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    gap: spacing.sm,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  error: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});
