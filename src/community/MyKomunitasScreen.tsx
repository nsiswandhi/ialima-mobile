import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';
import Header, { DrawerProfile, NavTarget } from '../Header';
import { renderBlock } from '../Blocks';
import { commApi, CommunityDetail, CommunitySummary, contactChannel, contactOpenUrl, hariLabel } from './api';
import CommunityFormScreen from './CommunityFormScreen';
import CommunityDetailScreen from './CommunityDetailScreen';

type ComNav = null | { kind: 'create' } | { kind: 'edit'; id: number } | { kind: 'manage'; id: number };

type Props = {
  token: string;
  onBack: () => void;
  onLogout: () => void;
  isIALima?: boolean; // holds ia5_appoint_pengurus — sees the moderation queue too
  profile?: DrawerProfile;
  onNavigate?: (target: NavTarget) => void;
};

// Burger-menu destination for "My Komunitas" — mirrors MyMarketplaceScreen /
// MyBrandsSection, but for communities the viewer founded/manages (`mine`).
// "Kelola" opens CommunityDetailScreen (members + pending approvals + edit);
// "Ubah" jumps straight to the edit form; "Hapus" deletes after confirming.
// Pengurus IA Lima additionally sees every member's pending community with
// Setujui/Hapus actions — the community-level approval gate (separate from
// member-join approval, which stays inside CommunityDetailScreen).
export default function MyKomunitasScreen({ token, onBack, onLogout, isIALima, profile, onNavigate }: Props) {
  const [nav, setNav] = useState<ComNav>(null);
  const [communities, setCommunities] = useState<CommunitySummary[]>([]);
  const [queue, setQueue] = useState<CommunitySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [reviewId, setReviewId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [mine, pending] = await Promise.all([
        commApi.list(token, { mine: true }),
        isIALima ? commApi.list(token, { status: 'pending' }) : Promise.resolve({ data: [] as CommunitySummary[] }),
      ]);
      setCommunities(mine.data);
      setQueue(pending.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, isIALima]);

  useEffect(() => {
    load();
  }, [load, refresh]);

  const confirmDelete = (c: { id: number; name: string }) => {
    Alert.alert('Hapus komunitas?', `"${c.name}" akan dihapus permanen.`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await commApi.remove(token, c.id);
            setReviewId(null);
            setRefresh((k) => k + 1);
          } catch (e: any) {
            Alert.alert('Gagal', e.message);
          }
        },
      },
    ]);
  };

  const approveCommunity = async (c: { id: number }) => {
    try {
      await commApi.approveCommunity(token, c.id);
      setReviewId(null);
      setRefresh((k) => k + 1);
    } catch (e: any) {
      Alert.alert('Gagal', e.message);
    }
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
        onSaved={() => {
          const wasCreate = nav?.kind === 'create';
          setNav(null);
          setRefresh((k) => k + 1);
          if (wasCreate) {
            setNotice('Komunitas berhasil dibuat. Menunggu persetujuan Pengurus IA Lima sebelum tampil publik.');
          }
        }}
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
        {!!notice && (
          <Pressable style={styles.noticeBanner} onPress={() => setNotice(null)}>
            <Text style={styles.noticeText}>{notice}</Text>
          </Pressable>
        )}
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <>
            {isIALima && queue.length > 0 && (
              <>
                <Text style={styles.sectionHead}>PERLU PERSETUJUAN</Text>
                {queue.map((item) => (
                  <View style={styles.card} key={`queue-${item.id}`}>
                    <Pressable style={styles.cardMain} onPress={() => setReviewId(item.id)}>
                      {item.logo?.thumbnail ? (
                        <Image source={{ uri: item.logo.thumbnail }} style={styles.logo} />
                      ) : (
                        <View style={[styles.logo, styles.logoFallback]}>
                          <Text style={styles.logoLetter}>{item.name.charAt(0)}</Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{item.name}</Text>
                        {!!item.community_type && <Text style={styles.metaLight}>{item.community_type}</Text>}
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                    </Pressable>
                    <View style={styles.actions}>
                      <Pressable style={styles.actionBtn} onPress={() => approveCommunity(item)}>
                        <Text style={[styles.actionText, { color: '#3B6D11' }]}>Setujui</Text>
                      </Pressable>
                      <Pressable style={styles.actionBtn} onPress={() => confirmDelete(item)}>
                        <Text style={[styles.actionText, { color: colors.danger }]}>Hapus</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
                <Text style={[styles.sectionHead, { marginTop: 20 }]}>KOMUNITAS SAYA</Text>
              </>
            )}

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
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLight}>{item.member_count} anggota</Text>
                      {item.approval_status === 'pending' && (
                        <View style={styles.pendingPill}>
                          <Text style={styles.pendingPillText}>Menunggu Persetujuan</Text>
                        </View>
                      )}
                    </View>
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

      <CommunityReviewModal
        token={token}
        communityId={reviewId}
        onClose={() => setReviewId(null)}
        onApprove={(id) => approveCommunity({ id })}
        onDelete={(id, name) => confirmDelete({ id, name })}
      />
    </View>
  );
}

// Full read-only review of everything a member submitted, so Pengurus IA Lima
// can approve wisely — opened by tapping a "PERLU PERSETUJUAN" row.
function CommunityReviewModal({ token, communityId, onClose, onApprove, onDelete }: {
  token: string;
  communityId: number | null;
  onClose: () => void;
  onApprove: (id: number) => void;
  onDelete: (id: number, name: string) => void;
}) {
  const [data, setData] = useState<CommunityDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (communityId == null) {
      setData(null);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    commApi
      .detail(token, communityId)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [communityId]);

  const infoSections = data
    ? [
        { label: 'Tentang Kami', blocks: data.tentang_kami },
        { label: 'Syarat Bergabung', blocks: data.syarat_bergabung },
        { label: 'Cara Bergabung', blocks: data.cara_bergabung },
      ].filter((s) => s.blocks?.length > 0)
    : [];

  return (
    <Modal visible={communityId != null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.reviewBackdrop}>
        <View style={styles.reviewSheet}>
          <View style={styles.reviewHead}>
            <Text style={styles.reviewTitle} numberOfLines={1}>{data?.name || 'Tinjau Komunitas'}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.heading} />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 30 }} />
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : data ? (
            <ScrollView contentContainerStyle={styles.reviewContent}>
              {data.cover?.full && <Image source={{ uri: data.cover.full }} style={styles.reviewCover} />}
              <View style={styles.reviewHeadRow}>
                {data.logo?.thumbnail ? (
                  <Image source={{ uri: data.logo.thumbnail }} style={styles.reviewLogo} />
                ) : (
                  <View style={[styles.reviewLogo, styles.logoFallback]}>
                    <Text style={styles.logoLetter}>{data.name.charAt(0)}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{data.name}</Text>
                  <Text style={styles.metaLight}>oleh {data.owner_name}</Text>
                </View>
              </View>

              <View style={styles.reviewFieldsBlock}>
                <ReviewField label="Tipe Komunitas" value={data.community_type} />
                <ReviewField label="Berdiri Sejak" value={data.berdiri_sejak} />
                <ReviewField label="Status Komunitas" value={data.status_komunitas} />
                <ReviewField label="Status Keanggotaan" value={data.status_keanggotaan} />
              </View>

              {!!data.introduction && (
                <View style={styles.reviewSection}>
                  <Text style={styles.reviewSectionHead}>PENGENALAN SINGKAT</Text>
                  <Text style={styles.reviewText}>{data.introduction}</Text>
                </View>
              )}

              {infoSections.map((s) => (
                <View style={styles.reviewSection} key={s.label}>
                  <Text style={styles.reviewSectionHead}>{s.label.toUpperCase()}</Text>
                  {s.blocks.map(renderBlock)}
                </View>
              ))}

              {data.informasi_kontak.length > 0 && (
                <View style={styles.reviewSection}>
                  <Text style={styles.reviewSectionHead}>INFORMASI KONTAK</Text>
                  {data.informasi_kontak.map((row, i) => {
                    const p = contactChannel(row.channel);
                    return (
                      <Pressable
                        key={i}
                        style={styles.reviewContactRow}
                        onPress={() => Linking.openURL(contactOpenUrl(row))}
                      >
                        <Ionicons name={(p?.icon || 'link') as any} size={17} color={p?.color || colors.primary} />
                        <Text style={styles.reviewText} numberOfLines={1}>{p?.label || row.channel}: {row.url}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {data.kegiatan_rutin.length > 0 && (
                <View style={styles.reviewSection}>
                  <Text style={styles.reviewSectionHead}>KEGIATAN RUTIN</Text>
                  {data.kegiatan_rutin.map((a, i) => (
                    <View style={styles.activityCard} key={i}>
                      <Text style={styles.name}>{a.nama_kegiatan}</Text>
                      <Text style={styles.metaLight}>
                        {[hariLabel(a.hari), a.jam, a.lokasi].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {data.image_gallery.length > 0 && (
                <View style={styles.reviewSection}>
                  <Text style={styles.reviewSectionHead}>GALERI FOTO</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {data.image_gallery.map((g) => (
                      <Image key={g.id} source={{ uri: g.thumbnail || g.full }} style={styles.reviewGalleryImg} />
                    ))}
                  </ScrollView>
                </View>
              )}
            </ScrollView>
          ) : null}

          {data && (
            <View style={styles.reviewFooter}>
              <Pressable style={styles.reviewApproveBtn} onPress={() => onApprove(data.id)}>
                <Text style={styles.reviewApproveText}>Setujui</Text>
              </Pressable>
              <Pressable style={styles.reviewDeleteBtn} onPress={() => onDelete(data.id, data.name)}>
                <Text style={styles.reviewDeleteText}>Hapus</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function ReviewField({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={styles.reviewFieldRow}>
      <Text style={styles.reviewFieldLabel}>{label}</Text>
      <Text style={styles.reviewFieldValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, padding: 16 },
  error: { color: colors.danger, fontFamily: fonts.bodyMedium, marginVertical: 12 },
  empty: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted, lineHeight: 20, marginBottom: 12 },
  noticeBanner: { backgroundColor: '#EAF3DE', borderRadius: 12, padding: 14, marginBottom: 14 },
  noticeText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: '#3B6D11', lineHeight: 19 },
  sectionHead: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.muted, letterSpacing: 0.5, marginBottom: 10 },

  card: { backgroundColor: colors.card, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  logo: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.bgAlt },
  logoFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondary },
  logoLetter: { fontFamily: fonts.heading, fontSize: 20, color: colors.white },
  name: { fontFamily: fonts.headingSemi, fontSize: 16, color: colors.heading },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  metaLight: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  pendingPill: { backgroundColor: '#FAEEDA', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  pendingPillText: { fontFamily: fonts.bodyMedium, fontSize: 10, color: '#854F0B' },
  actions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border },
  actionBtn: { flex: 1, paddingVertical: 11, alignItems: 'center' },
  actionText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.primary },

  createBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 2, borderWidth: 1.5, borderColor: colors.primary },
  createBtnText: { color: colors.primary, fontFamily: fonts.headingSemi, fontSize: 15 },

  reviewBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  reviewSheet: { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  reviewHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  reviewTitle: { fontFamily: fonts.heading, fontSize: 17, color: colors.heading, flex: 1, marginRight: 12 },
  reviewContent: { padding: 16, paddingBottom: 24 },
  reviewCover: { width: '100%', height: 130, borderRadius: 12, backgroundColor: colors.bgAlt, marginBottom: 14 },
  reviewHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  reviewLogo: { width: 56, height: 56, borderRadius: 12, backgroundColor: colors.bgAlt },

  reviewFieldsBlock: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginBottom: 14 },
  reviewFieldRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, gap: 10 },
  reviewFieldLabel: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
  reviewFieldValue: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.heading, flexShrink: 1, textAlign: 'right' },

  activityCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginBottom: 8 },
  reviewSection: { marginBottom: 18 },
  reviewSectionHead: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.muted, letterSpacing: 0.5, marginBottom: 8 },
  reviewText: { fontFamily: fonts.body, fontSize: 13.5, color: colors.text, lineHeight: 20, flex: 1 },
  reviewContactRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  reviewGalleryImg: { width: 96, height: 96, borderRadius: 10, backgroundColor: colors.bgAlt, marginRight: 10 },

  reviewFooter: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
  reviewApproveBtn: { flex: 1, backgroundColor: '#3B6D11', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  reviewApproveText: { fontFamily: fonts.headingSemi, fontSize: 15, color: colors.white },
  reviewDeleteBtn: { flex: 1, borderWidth: 1.5, borderColor: colors.danger, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  reviewDeleteText: { fontFamily: fonts.headingSemi, fontSize: 15, color: colors.danger },
});
