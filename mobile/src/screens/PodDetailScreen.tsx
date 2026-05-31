import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { AppText } from '../components/ui/AppText';
import { AppButton } from '../components/ui/AppButton';
import { fetchPodDetail, leavePod, joinPod } from '../services/api';
import { MainStackParamList, Pod } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius } from '../theme';
import { getErrorMessage } from '../services/api';

type Nav = NativeStackNavigationProp<MainStackParamList>;
type Route = RouteProp<MainStackParamList, 'PodDetail'>;

export function PodDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { colors } = useTheme();
  const [pod, setPod] = useState<Pod | null>(null);
  const [error, setError] = useState('');

  useFocusEffect(useCallback(() => {
    fetchPodDetail(route.params.podId).then(setPod).catch(e => setError(getErrorMessage(e)));
  }, [route.params.podId]));

  if (!pod) return (
    <ScreenContainer><AppText variant="body">Loading...</AppText></ScreenContainer>
  );

  const isMember = !!pod.my_role;

  return (
    <ScreenContainer scroll>
      <AppText variant="title">{pod.name}</AppText>
      <AppText variant="body">{pod.origin_label} → {pod.destination_label}</AppText>
      <AppText variant="caption">Status: {pod.status} | Seats: {pod.seats_available}/{pod.capacity}</AppText>

      <AppText variant="subtitle" style={styles.section}>Members</AppText>
      {pod.members?.map(m => (
        <View key={m.id} style={[styles.member, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <AppText variant="body">{m.full_name ?? m.email}</AppText>
          <AppText variant="caption">{m.role} • {m.member_status ?? 'confirmed'}</AppText>
        </View>
      ))}

      {error ? <AppText variant="caption" color={colors.error}>{error}</AppText> : null}

      {isMember ? (
        <>
          <AppButton title="Open Live Map" onPress={() => navigation.navigate('LiveMap', { pod })} />
          <AppButton title="Chat" variant="outline" onPress={() => navigation.navigate('Chat', { podId: pod.id, podName: pod.name })} />
          {pod.my_role === 'passenger' ? (
            <AppButton title="Leave Pod" variant="danger" onPress={async () => { await leavePod(pod.id); navigation.goBack(); }} />
          ) : null}
          {pod.my_role === 'driver' && pod.status === 'scheduled' ? (
            <AppButton title="Start Commute" variant="secondary" onPress={() => navigation.navigate('LiveMap', { pod: { ...pod, status: 'active' } })} />
          ) : null}
        </>
      ) : (
        <AppButton title="Join Pod" onPress={async () => {
          try { const p = await joinPod(pod.id); setPod(p); } catch (e) { setError(getErrorMessage(e)); }
        }} />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.lg, marginBottom: spacing.md },
  member: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.sm },
});
