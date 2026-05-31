import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { AppText } from '../components/ui/AppText';
import { AppButton } from '../components/ui/AppButton';
import { useAuthStore } from '../store/authStore';
import { fetchProfile } from '../services/api';
import { MainStackParamList } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius } from '../theme';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const user = useAuthStore(s => s.user);
  const clearSession = useAuthStore(s => s.clearSession);
  const { colors } = useTheme();
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);

  useFocusEffect(useCallback(() => {
    fetchProfile().then(setProfile).catch(() => {});
  }, []));

  const handleLogout = async () => {
    await clearSession();
  };

  return (
    <ScreenContainer scroll>
      <View style={styles.header}>
        {profile?.profile_photo_url ? (
          <Image source={{ uri: profile.profile_photo_url as string }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
            <AppText variant="title" color={colors.primary}>
              {(profile?.full_name as string)?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
            </AppText>
          </View>
        )}
        <AppText variant="title">{profile?.full_name as string ?? user?.email?.split('@')[0]}</AppText>
        <AppText variant="caption">{user?.email}</AppText>
        {profile?.phone ? <AppText variant="caption">{profile.phone as string}</AppText> : null}
      </View>

      <AppButton title="Edit Profile & Settings" variant="outline" onPress={() => navigation.navigate('Settings')} />
      <AppButton title="Manage Schedule" onPress={() => navigation.navigate('Schedule')} />
      <AppButton title="My Vehicles" variant="outline" onPress={() => navigation.navigate('Vehicles')} />
      <AppButton title="Emergency Contacts" variant="outline" onPress={() => navigation.navigate('EmergencyContacts')} />
      {user?.is_admin ? (
        <AppButton title="Admin Dashboard" variant="secondary" onPress={() => navigation.navigate('Admin')} />
      ) : null}
      <AppButton title="Log Out" variant="danger" onPress={handleLogout} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: spacing.xl },
  avatar: { width: 88, height: 88, borderRadius: 44, marginBottom: spacing.md },
  avatarPlaceholder: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
});
