// Community detail — header (cover+logo, like BrandDetailScreen), contact icon
// row, Join/Leave with approval states, an Info Komunitas accordion (WYSIWYG
// blocks), Kegiatan Rutin, Galeri Foto, and (for managers) a pending-approvals
// queue. Mirrors the fetch + act pattern used in MemberDetailScreen / BrandDetailScreen.
import React, { useState } from 'react';
import {
  ActivityIndicator, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header, { DrawerProfile, NavTarget } from '../Header';
import { colors, fonts } from '../theme';
import { renderBlock, Block } from '../Blocks';
import { commApi, CommunityDetail, CommunityMember, contactChannel, contactOpenUrl, hariLabel, MyStatus } from './api';
import StarRating from '../reviews/StarRating';
import ReviewSection from '../reviews/ReviewSection';

type Props = {
  token: string;
  communityId: number;
  onBack: () => void;
  onLogout: () => void;
  onEdit?: (id: number) => void;
  profile?: DrawerProfile;
  onNavigate?: (target: NavTarget) => void;
  unreadCount?: number;
};

export default function CommunityDetailScreen({ token, communityId, onBack, onLogout, onEdit, profile, onNavigate, unreadCount }: Props) {
  const [data, setData] = useState<CommunityDetail | null>(null);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [pending, setPending] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});

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

  React.useEffect(() => {
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
    s === 'approved' ? 'Keluar' : s === 'pending' ? 'Menunggu Persetujuan' : 'Gabung Komunitas';

  const infoSections: { key: string; label: string; blocks: Block[] }[] = data
    ? [
        { key: 'tentang', label: 'Tentang Kami', blocks: data.tentang_kami },
        { key: 'syarat', label: 'Syarat Bergabung', blocks: data.syarat_bergabung },
        { key: 'cara', label: 'Cara Bergabung', blocks: data.cara_bergabung },
      ].filter((s) => s.blocks?.length > 0)
    : [];

  return (
    <View style={styles.flex}>
      <Header title={data?.name || 'Komunitas'} onBack={onBack} onLogout={onLogout} profile={profile} onNavigate={onNavigate} unreadCount={unreadCount} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error && !data ? (
        <Text style={styles.error}>{error}</Text>
      ) : data ? (
        <ScrollView contentContainerStyle={styles.content}>
          {data.cover?.full ? (
            <Image source={{ uri: data.cover.full }} style={styles.cover} />
          ) : (
            <View style={[styles.cover, styles.coverFallback]} />
          )}
          <View style={styles.headRow}>
            {data.logo?.thumbnail ? (
              <Image source={{ uri: data.logo.thumbnail }} style={styles.logo} />
            ) : (
              <View style={[styles.logo, styles.logoFallback]}>
                <Text style={styles.logoLetter}>{data.name.charAt(0)}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{data.name}</Text>
              <View style={styles.metaRow}>
                {!!data.berdiri_sejak && <Text style={styles.metaLight}>Sejak {data.berdiri_sejak}</Text>}
                {!!data.community_type && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{data.community_type}</Text>
                  </View>
                )}
                {!!data.status_komunitas && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{data.status_komunitas}</Text>
                  </View>
                )}
              </View>
              <View style={{ marginTop: 6 }}>
                <StarRating value={data.rating_average} count={data.rating_count} size="md" />
              </View>
            </View>
          </View>

          {data.approval_status === 'pending' && data.is_manager && (
            <View style={styles.pendingBanner}>
              <Ionicons name="time-outline" size={16} color="#854F0B" />
              <Text style={styles.pendingBannerText}>Menunggu persetujuan Pengurus IA Lima.</Text>
            </View>
          )}

          <View style={styles.viewsRow}>
            <Text style={styles.views}>{data.view_count} kali dilihat</Text>
            <Text style={styles.views}>{data.member_count} Anggota</Text>
          </View>

          {!!data.introduction && <Text style={styles.desc}>{data.introduction}</Text>}

          {!!data.informasi_kontak?.length && (
            <View style={styles.linksRow}>
              {data.informasi_kontak.map((row, i) => {
                const p = contactChannel(row.channel);
                return (
                  <Pressable
                    key={`${row.channel}-${i}`}
                    style={styles.linkBtn}
                    onPress={() => Linking.openURL(contactOpenUrl(row))}
                  >
                    <Ionicons name={(p?.icon || 'link') as any} size={20} color={p?.color || colors.primary} />
                  </Pressable>
                );
              })}
            </View>
          )}

          {!data.is_manager && (
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
              <Text
                style={[
                  styles.joinText,
                  data.my_status === 'approved' && styles.leaveText,
                  data.my_status === 'pending' && styles.pendingText,
                ]}
              >
                {joinLabel(data.my_status)}
              </Text>
            </Pressable>
          )}

          {data.is_manager && (
            <Pressable style={styles.manageBtn} onPress={() => onEdit?.(data.id)}>
              <Ionicons name="create-outline" size={16} color={colors.primary} />
              <Text style={styles.manageText}>Kelola Komunitas</Text>
            </Pressable>
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}

          {infoSections.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionHead}>INFO KOMUNITAS</Text>
              <View style={styles.accordion}>
                {infoSections.map((s, i) => (
                  <View key={s.key}>
                    {i > 0 && <View style={styles.accordionDivider} />}
                    <Pressable style={styles.accordionHead} onPress={() => setOpen((o) => ({ ...o, [s.key]: !o[s.key] }))}>
                      <Text style={styles.accordionTitle}>{s.label}</Text>
                      <Ionicons name={open[s.key] ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} />
                    </Pressable>
                    {open[s.key] && <View style={styles.accordionBody}>{s.blocks.map(renderBlock)}</View>}
                  </View>
                ))}
              </View>
            </View>
          )}

          {data.kegiatan_rutin.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionHead}>KEGIATAN RUTIN</Text>
              {data.kegiatan_rutin.map((a, i) => (
                <View style={styles.activityCard} key={i}>
                  <Text style={styles.activityName}>{a.nama_kegiatan}</Text>
                  <Text style={styles.activityMeta}>
                    {[hariLabel(a.hari), a.jam, a.lokasi].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {data.image_gallery.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionHead}>GALERI FOTO</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
                {data.image_gallery.map((g) => (
                  <Pressable key={g.id} onPress={() => setLightbox(g.full)}>
                    <Image source={{ uri: g.thumbnail || g.full }} style={styles.galleryImg} />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

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

          <ReviewSection token={token} objectType="community" objectId={communityId} />
        </ScrollView>
      ) : null}

      <Modal visible={!!lightbox} transparent animationType="fade" onRequestClose={() => setLightbox(null)}>
        <Pressable style={styles.lightboxBackdrop} onPress={() => setLightbox(null)}>
          {lightbox && <Image source={{ uri: lightbox }} style={styles.lightboxImg} resizeMode="contain" />}
        </Pressable>
      </Modal>
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
  content: { paddingBottom: 40 },
  cover: { width: '100%', height: 150, backgroundColor: colors.bgAlt },
  coverFallback: { backgroundColor: colors.primaryDark, opacity: 0.15 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, marginTop: 14 },
  logo: { width: 64, height: 64, borderRadius: 14, backgroundColor: colors.bgAlt },
  logoFallback: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  logoLetter: { fontFamily: fonts.heading, fontSize: 26, color: colors.primary },
  name: { fontFamily: fonts.heading, fontSize: 20, color: colors.heading },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  metaLight: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  badge: { backgroundColor: colors.bgAlt, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.primary },

  pendingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FAEEDA', borderRadius: 10,
    marginHorizontal: 16, marginTop: 14, padding: 12,
  },
  pendingBannerText: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: '#854F0B', flex: 1 },

  viewsRow: { flexDirection: 'row', gap: 14, paddingHorizontal: 16, marginTop: 10 },
  views: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
  desc: { fontFamily: fonts.body, fontSize: 14, color: colors.text, lineHeight: 21, paddingHorizontal: 16, marginTop: 8 },

  linksRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, marginTop: 14, alignItems: 'center' },
  linkBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center' },

  joinBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 16, marginHorizontal: 16 },
  leaveBtn: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.danger },
  pendingBtn: { backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border },
  pressed: { opacity: 0.85 },
  joinText: { fontFamily: fonts.headingSemi, fontSize: 15, color: colors.white },
  leaveText: { color: colors.danger },
  pendingText: { color: colors.muted },

  manageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginTop: 8 },
  manageText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.primary },

  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionHead: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.muted, letterSpacing: 0.5, marginBottom: 10 },
  empty: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },

  accordion: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  accordionDivider: { height: 1, backgroundColor: colors.border },
  accordionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14 },
  accordionTitle: { fontFamily: fonts.bodyMedium, fontSize: 13.5, color: colors.heading },
  accordionBody: { paddingHorizontal: 14, paddingBottom: 12 },

  activityCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginBottom: 8 },
  activityName: { fontFamily: fonts.headingSemi, fontSize: 13.5, color: colors.heading },
  activityMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 3 },

  galleryRow: { gap: 10 },
  galleryImg: { width: 112, height: 112, borderRadius: 12, backgroundColor: colors.bgAlt },
  lightboxBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  lightboxImg: { width: '100%', height: '100%' },

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
