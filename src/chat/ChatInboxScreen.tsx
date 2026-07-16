// Chat inbox — list of 1:1 threads, mirrors community/CommunityScreen's list
// layout (Header + FlatList of cards).
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header, { DrawerProfile, NavTarget } from '../Header';
import { colors, fonts } from '../theme';
import { chatApi, ChatThread } from './api';

type Props = {
  token: string;
  onLogout: () => void;
  onOpenThread: (thread: ChatThread) => void;
  onOpenBroadcast?: () => void;
  canBroadcast?: boolean;
  profile?: DrawerProfile;
  onNavigate?: (target: NavTarget) => void;
};

export default function ChatInboxScreen({ token, onLogout, onOpenThread, onOpenBroadcast, canBroadcast, profile, onNavigate }: Props) {
  const [items, setItems] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await chatApi.threads(token);
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

  return (
    <View style={styles.flex}>
      <Header title="Pesan" onLogout={onLogout} profile={profile} onNavigate={onNavigate} />
      {!!canBroadcast && (
        <Pressable
          style={({ pressed }) => [styles.broadcastCard, pressed && styles.broadcastCardPressed]}
          onPress={onOpenBroadcast}
        >
          <Ionicons name="megaphone-outline" size={20} color={colors.white} />
          <Text style={styles.broadcastCardTitle}>Buat Pengumuman</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.white} />
        </Pressable>
      )}
      <Text style={styles.sectionTitle}>Pesan Antar Member</Text>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>Belum ada percakapan. Kirim pesan dari profil alumni yang sudah saling kenal dengan Anda.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(t) => String(t.id)}
          contentContainerStyle={styles.list}
          onRefresh={load}
          refreshing={loading}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => onOpenThread(item)}>
              {item.other.avatar?.thumbnail ? (
                <Image source={{ uri: item.other.avatar.thumbnail }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarLetter}>{item.other.name.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.rowBody}>
                <Text style={styles.name} numberOfLines={1}>{item.other.name}</Text>
                <Text style={styles.preview} numberOfLines={1}>{item.last_message || 'Belum ada pesan'}</Text>
              </View>
              {item.unread_count > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.unread_count > 9 ? '9+' : item.unread_count}</Text>
                </View>
              )}
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
  empty: { color: colors.muted, textAlign: 'center', fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  list: { paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontFamily: fonts.heading, fontSize: 16, color: colors.primary },
  rowBody: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  preview: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 2 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.white },
  broadcastCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 64, padding: 14, backgroundColor: colors.primary, borderRadius: 12 },
  broadcastCardPressed: { backgroundColor: colors.primaryDark },
  broadcastCardTitle: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 14, color: colors.white },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 16, color: colors.heading, marginTop: 20, marginBottom: 8, marginHorizontal: 16 },
});
