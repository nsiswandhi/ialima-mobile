// Unified feed: new chat messages + eligible broadcasts, newest first.
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header, { DrawerProfile, NavTarget } from '../Header';
import { colors, fonts } from '../theme';
import { chatApi, NotificationItem } from './api';

type Props = {
  token: string;
  onOpenThread: (threadId: number) => void;
  onRead: () => void; // tells the parent to refresh the badge count
  onLogout: () => void;
  profile?: DrawerProfile;
  onNavigate?: (target: NavTarget) => void;
};

export default function NotificationsScreen({ token, onOpenThread, onRead, onLogout, profile, onNavigate }: Props) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await chatApi.notifications(token);
      setItems(res.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function markAll() {
    await chatApi.markNotificationsRead(token, { all: true }).catch(() => {});
    setItems([]);
    onRead();
  }

  function openItem(item: NotificationItem) {
    if (item.type === 'chat_message') {
      onOpenThread(item.thread_id);
    }
    // Broadcast items have no detail screen in this plan — the title/body is
    // already shown inline in the feed row.
  }

  return (
    <View style={styles.flex}>
      <Header title="Notifikasi" onLogout={onLogout} profile={profile} onNavigate={onNavigate} />
      {items.length > 0 && (
        <View style={styles.markAllRow}>
          <Pressable onPress={markAll} style={styles.markAllBtn} accessibilityLabel="Tandai semua dibaca">
            <Ionicons name="checkmark-done-outline" size={18} color={colors.accent} />
          </Pressable>
        </View>
      )}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>Tidak ada notifikasi baru.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => (item.type === 'chat_message' ? `t${item.thread_id}` : `b${item.broadcast_id}`) + i}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => openItem(item)}>
              <Ionicons
                name={item.type === 'chat_message' ? 'chatbubble-ellipses-outline' : 'megaphone-outline'}
                size={20}
                color={colors.primary}
              />
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>
                  {item.type === 'chat_message' ? `${item.from.name} mengirim pesan baru` : `${item.sender_name} mengirim pengumuman`}
                </Text>
                {item.type === 'broadcast' && !!item.title && (
                  <Text style={styles.rowJudul}>{item.title}</Text>
                )}
                <Text style={styles.rowPreview} numberOfLines={1}>{item.preview}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  error: { color: colors.danger, textAlign: 'center', marginTop: 16, fontFamily: fonts.bodyMedium },
  empty: { color: colors.muted, textAlign: 'center', fontFamily: fonts.body, fontSize: 14 },
  markAllRow: { alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 8 },
  markAllBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowBody: { flex: 1 },
  rowTitle: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text },
  rowJudul: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.heading, marginTop: 2 },
  rowPreview: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
});
