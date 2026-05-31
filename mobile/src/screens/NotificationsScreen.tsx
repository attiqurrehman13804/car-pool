import React, { useCallback, useState } from 'react';
import { FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { AppText } from '../components/ui/AppText';
import { fetchNotifications, markNotificationRead } from '../services/api';
import { Notification } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius } from '../theme';

export function NotificationsScreen() {
  const { colors } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const load = useCallback(async () => {
    try { setNotifications(await fetchNotifications()); } catch { /* empty */ }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const markRead = async (id: string) => {
    await markNotificationRead(id);
    load();
  };

  return (
    <ScreenContainer>
      <AppText variant="title">Notifications</AppText>
      <FlatList
        data={notifications}
        keyExtractor={n => n.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, { backgroundColor: item.read_at ? colors.background : colors.primary + '10', borderColor: colors.border }]}
            onPress={() => markRead(item.id)}>
            <AppText variant="body">{item.title}</AppText>
            {item.body ? <AppText variant="caption">{item.body}</AppText> : null}
            <AppText variant="caption">{new Date(item.created_at).toLocaleString()}</AppText>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<AppText variant="caption">No notifications</AppText>}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  item: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.sm },
});
