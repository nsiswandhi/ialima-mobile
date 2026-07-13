import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import Header, { DrawerProfile, NavTarget } from '../Header';
import { commApi, CommunitySummary } from './api';
import CommunityFormScreen from './CommunityFormScreen';
import CommunityDetailScreen from './CommunityDetailScreen';

type ComNav = null | { kind: 'create' } | { kind: 'edit'; id: number } | { kind: 'manage'; id: number };

type Props = {
  token: string;
  onBack: () => void;
  onLogout: () => void;
  profile?: DrawerProfile;
  onNavigate?: (target: NavTarget) => void;
};

// Burger-menu destination for "My Komunitas" — mirrors MyMarketplaceScreen /
// MyBrandsSection, but for communities the viewer founded/manages (`mine`).
// "Kelola" opens CommunityDetailScreen (members + pending approvals + edit);
// "Ubah" jumps straight to the edit form; "Hapus" deletes after confirming.
export default function MyKomunitasScreen({ token, onBack, onLogout, profile, onNavigate }: Props) {
  const [nav, setNav] = useState<ComNav>(null);
  const [communities, setCommunities] = useState<CommunitySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await commApi.list(token, { mine: true });
      setCommunities(res.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load, refresh]);

  const confirmDelete = (c: CommunitySummary) => {
    Alert.alert('Hapus komunitas?', `"${c.name}" akan dihapus permanen.`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await commApi.remove(token, c.id);
            setRefresh((k) => k + 1);
          } catch (e: any) {
            Alert.alert('Gagal', e.message);
          }
        },
      },
    ]);
  };

  if (nav?.kind === 'manage') {
    return (
      <CommunityDetailScreen
        token={token}
        communityId={nav.id}
        onBack={() => setNav(null)}
        onLogout={onLogout}
        onEdit={(id) => setNav({ kind: 'edit', id })}
        profile={profile}
        onNavigate={onNavigate}
      />
    );
  }
  if (nav?.kind === 'create' || nav?.kind === 'edit') {
    return (
      <CommunityFormScreen
        token={token}
        communityId={nav.kind === 'edit' ? nav.id : undefined}
        onBack={() => setNav(null)}
        onSaved={() => { setNav(null); setRefresh((k) => k + 1); }}
        onLogout={onLogout}
        profile={profile}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <View style={styles.flex}>
      <Header title="My Komunitas" onBack={onBack} onLogout={onLogout} profile={profile} onNavigate={onNavigate} />
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <>
            {communities.length === 0 && (
              <Text style={styles.empty}>
                Kamu belum mengelola komunitas apa pun. Buat komunitas untuk mengumpulkan alumni dengan minat yang sama.
              </Text>
            )}

            {communities.map((item) => (
              <View style={styles.card} key={item.id}>
                <View style={styles.cardMain}>
                  {item.logo?.thumbnail ? (
                    <Image source={{ uri: item.logo.thumbnail }} style={styles.logo} />
                  ) : (
                    <View style={[styles.logo, styles.logoFallback]}>
                      <Text style={styles.logoLetter}>{item.name.charAt(0)}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.metaLight}>{item.member_count} anggota</Text>
                  </View>
                </View>
                <View style={styles.actions}>
                  <Pressable style={styles.actionBtn} onPress={() => setNav({ kind: 'manage', id: item.id })}>
                    <Text style={styles.actionText}>Kelola</Text>
                  </Pressable>
                  <Pressable style={styles.actionBtn} onPress={() => setNav({ kind: 'edit', id: item.id })}>
                    <Text style={styles.actionText}>Ubah</Text>
                  </Pressable>
                  <Pressable style={styles.actionBtn} onPress={() => confirmDelete(item)}>
                    <Text style={[styles.actionText, { color: colors.danger }]}>Hapus</Text>
                  </Pressable>
                </View>
              </View>
            ))}

            <Pressable style={styles.createBtn} onPress={() => setNav({ kind: 'create' })}>
              <Text style={styles.createBtnText}>＋ Buat Komunitas Baru</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, padding: 16 },
  error: { color: colors.danger, fontFamily: fonts.bodyMedium, marginVertical: 12 },
  empty: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted, lineHeight: 20, marginBottom: 12 },

  card: { backgroundColor: colors.card, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  logo: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.bgAlt },
  logoFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondary },
  logoLetter: { fontFamily: fonts.heading, fontSize: 20, color: colors.white },
  name: { fontFamily: fonts.headingSemi, fontSize: 16, color: colors.heading },
  metaLight: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
  actions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border },
  actionBtn: { flex: 1, paddingVertical: 11, alignItems: 'center' },
  actionText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.primary },

  createBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 2, borderWidth: 1.5, borderColor: colors.primary },
  createBtnText: { color: colors.primary, fontFamily: fonts.headingSemi, fontSize: 15 },
});
