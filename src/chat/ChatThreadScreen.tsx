// One conversation. Polls for new messages every ~8s while mounted (no
// websocket infra — see the design spec's "Delivery = polling" decision),
// stops polling on unmount.
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header, { DrawerProfile, NavTarget } from '../Header';
import { colors, fonts } from '../theme';
import { chatApi, ChatMessage, ChatThread } from './api';

const POLL_MS = 8000;

type Props = {
  token: string;
  thread: ChatThread;
  onBack: () => void;
  onLogout: () => void;
  profile?: DrawerProfile;
  onNavigate?: (target: NavTarget) => void;
};

export default function ChatThreadScreen({ token, thread, onBack, onLogout, profile, onNavigate }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(thread.is_blocked);
  const lastIdRef = useRef(0);

  async function loadInitial() {
    setLoading(true);
    try {
      const res = await chatApi.messages(token, thread.id);
      setMessages(res.data);
      lastIdRef.current = res.data.length ? res.data[res.data.length - 1].id : 0;
      chatApi.markThreadRead(token, thread.id).catch(() => {});
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function poll() {
    try {
      const res = await chatApi.messages(token, thread.id, lastIdRef.current);
      if (res.data.length) {
        setMessages((prev) => [...prev, ...res.data]);
        lastIdRef.current = res.data[res.data.length - 1].id;
        chatApi.markThreadRead(token, thread.id).catch(() => {});
      }
    } catch {
      // Silent — the next poll tick retries.
    }
  }

  useEffect(() => {
    loadInitial();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [thread.id]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const msg = await chatApi.sendMessage(token, thread.id, body);
      setMessages((prev) => [...prev, msg]);
      lastIdRef.current = msg.id;
      setDraft('');
    } catch (e: any) {
      setError(e.code === 'blocked' ? 'Anda tidak dapat mengirim pesan ke anggota ini lagi.' : e.message);
    } finally {
      setSending(false);
    }
  }

  function confirmBlock() {
    Alert.alert(
      `Blokir ${thread.other.name}?`,
      'Anda tidak akan bisa saling mengirim pesan lagi.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Blokir',
          style: 'destructive',
          onPress: async () => {
            try {
              await chatApi.block(token, thread.other.id);
              setBlocked(true);
            } catch (e: any) {
              setError(e.message);
            }
          },
        },
      ],
    );
  }

  return (
    <View style={styles.flex}>
      <Header
        title={thread.other.name}
        onBack={onBack}
        onLogout={onLogout}
        profile={profile}
        onNavigate={onNavigate}
      />
      <View style={styles.blockRow}>
        <Pressable onPress={blocked ? undefined : confirmBlock} disabled={blocked}>
          <Text style={styles.blockLink}>{blocked ? 'Anggota ini telah diblokir' : 'Blokir anggota ini'}</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const mine = item.sender_id !== thread.other.id;
            return (
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={mine ? styles.bubbleTextMine : styles.bubbleTextTheirs}>{item.body}</Text>
              </View>
            );
          }}
        />
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}

      {!blocked && (
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="Tulis pesan"
            value={draft}
            onChangeText={setDraft}
            multiline
          />
          <Pressable onPress={send} disabled={sending || !draft.trim()} style={styles.sendBtn}>
            <Ionicons name="send" size={20} color={draft.trim() ? colors.primary : colors.muted} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  blockRow: { paddingHorizontal: 16, paddingVertical: 6, alignItems: 'flex-end' },
  blockLink: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.danger },
  list: { padding: 16, gap: 8 },
  bubble: { maxWidth: '78%', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: colors.bgAlt },
  bubbleTextMine: { color: colors.white, fontFamily: fonts.body, fontSize: 14 },
  bubbleTextTheirs: { color: colors.text, fontFamily: fonts.body, fontSize: 14 },
  error: { color: colors.danger, textAlign: 'center', marginVertical: 6, fontFamily: fonts.bodyMedium, fontSize: 13 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, maxHeight: 100, fontFamily: fonts.body, fontSize: 14, color: colors.text },
  sendBtn: { padding: 8 },
});
