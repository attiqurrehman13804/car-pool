import React, { useEffect, useState, useRef } from 'react';
import { FlatList, View, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { AppText } from '../components/ui/AppText';
import { AppButton } from '../components/ui/AppButton';
import { fetchMessages, getErrorMessage } from '../services/api';
import { joinPodRoom, leavePodRoom, onChatMessage, sendChatMessage } from '../services/socket';
import { useAuthStore } from '../store/authStore';
import { MainStackParamList, ChatMessage } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius } from '../theme';

type Route = RouteProp<MainStackParamList, 'Chat'>;

export function ChatScreen() {
  const route = useRoute<Route>();
  const { podId, podName } = route.params;
  const user = useAuthStore(s => s.user);
  const { colors } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    joinPodRoom(podId);
    fetchMessages(podId).then(rows =>
      setMessages(rows.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        podId,
        senderId: r.sender_id as string,
        senderEmail: r.sender_email as string,
        senderName: r.sender_name as string,
        content: r.content as string,
        createdAt: r.created_at as string,
      }))),
    ).catch(() => {});

    const unsub = onChatMessage(msg => {
      if (msg.podId === podId) setMessages(prev => [...prev, msg]);
    });

    return () => { leavePodRoom(podId); unsub(); };
  }, [podId]);

  const send = () => {
    if (!text.trim()) return;
    sendChatMessage(podId, text.trim());
    setText('');
  };

  return (
    <ScreenContainer edges={['top']}>
      <AppText variant="subtitle">{podName} — Chat</AppText>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={item => item.id}
        style={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd()}
        renderItem={({ item }) => {
          const isMe = item.senderId === user?.id;
          return (
            <View style={[styles.bubble, isMe ? styles.me : styles.other, { backgroundColor: isMe ? colors.primary : colors.card, borderColor: colors.border }]}>
              {!isMe ? <AppText variant="caption" color={colors.textSecondary}>{item.senderName ?? item.senderEmail}</AppText> : null}
              <AppText variant="body" color={isMe ? '#FFF' : colors.text}>{item.content}</AppText>
            </View>
          );
        }}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor={colors.textSecondary}
          />
          <AppButton title="Send" onPress={send} style={styles.sendBtn} />
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, marginVertical: spacing.md },
  bubble: { padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm, maxWidth: '80%', borderWidth: 1 },
  me: { alignSelf: 'flex-end' },
  other: { alignSelf: 'flex-start' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: { flex: 1, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, fontSize: 16 },
  sendBtn: { width: 80, marginBottom: 0 },
});
