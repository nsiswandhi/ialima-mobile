// Community detail — info header, Join/Leave with approval states, member list,
// and (for managers) a pending-approvals queue. Mirrors the fetch + act pattern
// used in MemberDetailScreen / BrandDetailScreen.
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header, { DrawerProfile, NavTarget } from '../Header';
import { colors, fonts } from '../theme';
import { commApi, CommunityDetail, CommunityMember, MyStatus } from './api';

type Props = {
  token: string;
  communityId: number;
  onBack: () => void;
  onLogout: () => void;
  onEdit?: (id: number) => void;
  profile?: DrawerProfile;
  onNavigate?: (target: NavTarget) => void;
};

export default function CommunityDetailScreen({ token, communityId, onBack, onLogout, onEdit, profile, onNavigate }: Props) {
  const [data, setData] = useState<CommunityDetail | null>(null);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [pending, setPending] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMembers(isManager: boolean) {
    try {
      const list = await commApi.members(token, communityId, 'approved');
      setMembers(list.data);
      if (isManager) {
        const q = await commApi.members(token, communityId, 'pending');
        setPending(q.data);
      }
    } catch {
      /* non-fatal */
    }
  }

  useEffect(() => {
    let alive = true;
    setLoading(true);
    commApi
      .detail(token, communityId)
      .then((d) => {
        if (!alive) return;
        setData(d);
        loadMembers(d.is_manager);
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    commApi.trackView(token, communityId);
    return () => {
      alive = false;
    };
  }, [communityId]);

  async function toggleMembership() {
    if (!data) return;
    setActing(true);
    setError(null);
    try {
      if (data.my_status === 'none') {
        const r = await commApi.join(token, communityId);
        setData({ ...data, my_status: r.my_status });
      } else {
        const r = await commApi.leave(token, communityId);
        setData({ ...data, my_status: r.my_status, member_count: r.member_count });
        loadMembers(data.is_manager);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActing(false);
    }
  }

  async function decide(userId: number, approve: boolean) {
    setActing(true);
    setError(null);
    try {
      if (approve) await commApi.approve(token, communityId, userId);
      else await commApi.reject(token, communityId, userId);
      setPending((p) => p.filter((m) => m.id !== userId));
      if (data) loadMembers(data.is_manager);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActing(false);
    }
  }

  const joinLabel = (s: MyStatus) =>
    s === 'approved' ? 'Keluar' : s === 'pending' ? 'Menunggu Persetujuan' : 'Gabung';

  return (
    <View style={styles.flex}>
      <Header title={data?.name || 'Komunitas'} onBack={onBack} onLogout={onLogout} profile={profile} onNavigate={onNavigate} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error && !data ? (
        <Text style={styles.error}>{error}</Text>
      ) : data ? (
        <ScrollView contentContainerStyle={styles.content}>
          {data.cover?.full && <Image source={{ uri: data.cover.full }} style={styles.cover} />}

          <View style={styles.headRow}>
            {data.logo?.thumbnail ? (
              <Image source={{ uri: data.logo.thumbnail }} style={styles.logo} />
            ) : (
              <View style={[styles.logo, styles.logoFallback]}>
                <Text style={styles.logoLetter}>{data.name.charAt(0)}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{data.name}</Text>
              <View style={styles.metaRow}>
                <Ionicons name="people" size={14} color={colors.muted} />
                <Text style={styles.meta}>{data.member_count} anggota</Text>
                {!!data.city && <Text style={styles.meta}>· {data.city}</Text>}
              </View>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.joinBtn,
              data.my_status === 'approved' && styles.leaveBtn,
              data.my_status === 'pending' && styles.pendingBtn,
              pressed && styles.pressed,
            ]}
            disabled={acting || data.my_status === 'pending'}
            onPress={toggleMembership}
          >
            <Text style={[styles.joinText, data.my_status === 'pending' && styles.pendingText]}>
              {joinLabel(data.my_status)}
            </Text>
          </Pressable>

          {data.is_manager && (
            <Pressable style={styles.manageBtn} onPress={() => onEdit?.(data.id)}>
              <Ionicons name="create-outline" size={16} color={colors.primary} />
              <Text style={styles.manageText}>Kelola Komunitas</Text>
            </Pressable>
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}

          {!!data.description && <Text style={styles.desc}>{data.description}</Text>}

          {data.is_manager && pending.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionHead}>PERMINTAAN BERGABUNG</Text>
              {pending.map((m) => (
                <View key={m.id} style={styles.personRow}>
                  <PersonAvatar m={m} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.personName}>{m.name}</Text>
                    {!!m.angkatan && <Text style={styles.personMeta}>Angkatan {m.angkatan}</Text>}
                  </View>
                  <Pressable style={styles.approveBtn} disabled={acting} onPress={() => decide(m.id, true)}>
                    <Text style={styles.approveText}>Terima</Text>
                  </Pressable>
                  <Pressable style={styles.rejectBtn} disabled={acting} onPress={() => decide(m.id, false)}>
                    <Text style={styles.rejectText}>Tolak</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionHead}>ANGGOTA</Text>
            {members.length === 0 ? (
              <Text style={styles.empty}>Belum ada anggota.</Text>
            ) : (
              members.map((m) => (
                <View key={m.id} style={styles.personRow}>
                  <PersonAvatar m={m} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.personName}>{m.name}</Text>
                    <Text style={styles.personMeta}>
                      {[m.membership.role === 'manager' ? 'Pengurus' : null, m.job_title]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

function PersonAvatar({ m }: { m: CommunityMember }) {
  return m.avatar?.thumbnail ? (
    <Image source={{ uri: m.avatar.thumbnail }} style={styles.personAvatar} />
  ) : (
    <View style={[styles.personAvatar, styles.logoFallback]}>
      <Text style={styles.personLetter}>{m.name?.charAt(0) || '?'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  cover: { width: '100%', height: 140, borderRadius: 14, marginBottom: 14, backgroundColor: colors.bgAlt },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logo: { width: 64, height: 64, borderRadius: 14, backgroundColor: colors.bgAlt },
  logoFallback: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  logoLetter: { fontFamily: fonts.heading, fontSize: 26, color: colors.primary },
  title: { fontFamily: fonts.heading, fontSize: 20, color: colors.heading },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  meta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },

  joinBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 16 },
  leaveBtn: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  pendingBtn: { backgroundColor: colors.bgAlt },
  pressed: { opacity: 0.85 },
  joinText: { fontFamily: fonts.headingSemi, fontSize: 15, color: colors.white },
  pendingText: { color: colors.muted },

  manageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginTop: 8 },
  manageText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.primary },

  desc: { fontFamily: fonts.body, fontSize: 14, color: colors.text, lineHeight: 21, marginTop: 16 },

  section: { marginTop: 24 },
  sectionHead: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.muted, letterSpacing: 0.5, marginBottom: 10 },
  empty: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },

  personRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  personAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgAlt },
  personLetter: { fontFamily: fonts.heading, fontSize: 16, color: colors.primary },
  personName: { fontFamily: fonts.headingSemi, fontSize: 15, color: colors.heading },
  personMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },

  approveBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 12 },
  approveText: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.white },
  rejectBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 12 },
  rejectText: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.danger },

  error: { color: colors.danger, textAlign: 'center', marginTop: 12, fontFamily: fonts.bodyMedium },
});
