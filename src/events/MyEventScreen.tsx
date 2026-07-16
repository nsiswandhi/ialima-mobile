// Burger-menu destination for "My Event" — up to three sections: "Event Saya"
// (events scoped to the viewer's angkatan/communities), "Event yang Saya Kelola"
// (events the viewer created, incl. pending — pengurus only), and — Pengurus IA
// Lima only — "Persetujuan" (events awaiting approval, with a review popup).
// Mirrors MyKomunitasScreen's structure.
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';
import Header, { DrawerProfile, NavTarget } from '../Header';
import { renderBlock } from '../Blocks';
import { evApi, EventDetail, EventSummary } from './api';
import { wibDateTime } from './datetime';
import EventFormScreen from './EventFormScreen';
import EventDetailScreen from './EventDetailScreen';
import { useAndroidBack } from '../useAndroidBack';

type EvNav = null | { kind: 'create' } | { kind: 'edit'; id: number } | { kind: 'view'; id: number };

type Props = {
  token: string;
  onBack: () => void;
  onLogout: () => void;
  canCreate?: boolean;      // holds any ia5_create_*_event cap
  canOrg?: boolean;         // Pengurus IA Lima
  canKomunitas?: boolean;   // Pengurus Komunitas
  canAngkatan?: boolean;    // Pengurus Angkatan
  isIALima?: boolean;       // holds ia5_appoint_pengurus — sees the moderation queue
  profile?: DrawerProfile;
  onNavigate?: (target: NavTarget) => void;
};

export default function MyEventScreen({
  token, onBack, onLogout, canCreate, canOrg, canKomunitas, canAngkatan, isIALima, profile, onNavigate,
}: Props) {
  const [nav, setNav] = useState<EvNav>(null);
  const [mine, setMine] = useState<EventSummary[]>([]);
  const [managed, setManaged] = useState<EventSummary[]>([]);
  const [queue, setQueue] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [reviewId, setReviewId] = useState<number | null>(null);

  useAndroidBack(() => {
    if (nav !== null) {
      setNav(null);
      return true;
    }
    return false;
  });

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [member, organizer, pending] = await Promise.all([
        evApi.list(token, { role: 'mine-as-member' }),
        canCreate ? evApi.list(token, { role: 'mine-as-organizer' }) : Promise.resolve({ data: [] as EventSummary[] } as any),
        isIALima ? evApi.list(token, { status: 'pending' }) : Promise.resolve({ data: [] as EventSummary[] } as any),
      ]);
      setMine(member.data);
      setManaged(organizer.data);
      setQueue(pending.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, canCreate, isIALima]);

  useEffect(() => {
    load();
  }, [load, refresh]);

  const confirmDelete = (e: { id: number; name: string }) => {
    Alert.alert('Kamu yakin menghapus ini?', `"${e.name}" akan dihapus permanen.`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await evApi.remove(token, e.id);
            setReviewId(null);
            setRefresh((k) => k + 1);
          } catch (err: any) {
            Alert.alert('Gagal', err.message);
          }
        },
      },
    ]);
  };

  const approveEvent = async (e: { id: number }) => {
    try {
      await evApi.approveEvent(token, e.id);
      setReviewId(null);
      setRefresh((k) => k + 1);
    } catch (err: any) {
      Alert.alert('Gagal', err.message);
    }
  };

  if (nav?.kind === 'view') {
    return (
      <EventDetailScreen
        token={token}
        eventId={nav.id}
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
      <EventFormScreen
        token={token}
        eventId={nav.kind === 'edit' ? nav.id : undefined}
        canOrg={canOrg}
        canKomunitas={canKomunitas}
        canAngkatan={canAngkatan}
        onBack={() => setNav(null)}
        onSaved={() => {
          const wasCreate = nav?.kind === 'create';
          setNav(null);
          setRefresh((k) => k + 1);
          if (wasCreate) {
            setNotice('Event berhasil dibuat. Menunggu persetujuan Pengurus IA Lima sebelum tampil publik.');
          }
        }}
        onLogout={onLogout}
        profile={profile}
        onNavigate={onNavigate}
      />
    );
  }

  const Row = ({ item, showPending, onPress, actions }: {
    item: EventSummary; showPending?: boolean; onPress?: () => void; actions?: React.ReactNode;
  }) => (
    <View style={styles.card}>
      <Pressable style={styles.cardMain} onPress={onPress} disabled={!onPress}>
        {item.logo?.thumbnail ? (
          <Image source={{ uri: item.logo.thumbnail }} style={styles.logo} />
        ) : (
          <View style={[styles.logo, styles.logoFallback]}>
            <Text style={styles.logoLetter}>{item.name.charAt(0)}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <View style={styles.metaRow}>
            {!!item.start_date && <Text style={styles.metaLight}>{wibDateTime(item.start_date)}</Text>}
            {showPending && item.approval_status === 'pending' && (
              <View style={styles.pendingPill}>
                <Text style={styles.pendingPillText}>Menunggu Persetujuan</Text>
              </View>
            )}
          </View>
        </View>
        {onPress && <Ionicons name="chevron-forward" size={18} color={colors.muted} />}
      </Pressable>
      {actions}
    </View>
  );

  return (
    <View style={styles.flex}>
      <Header title="My Event" onBack={onBack} onLogout={onLogout} profile={profile} onNavigate={onNavigate} />
      <ScrollView contentContainerStyle={styles.content}>
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
            <Text style={styles.sectionHead}>EVENT SAYA</Text>
            {mine.length === 0 ? (
              <Text style={styles.empty}>Belum ada event untuk angkatan atau komunitasmu.</Text>
            ) : (
              mine.map((item) => (
                <Row key={`mine-${item.id}`} item={item} onPress={() => setNav({ kind: 'view', id: item.id })} />
              ))
            )}

            {canCreate && (
              <>
                <Text style={[styles.sectionHead, { marginTop: 24 }]}>EVENT YANG SAYA KELOLA</Text>
                {managed.length === 0 && (
                  <Text style={styles.empty}>Kamu belum membuat event apa pun.</Text>
                )}
                {managed.map((item) => (
                  <Row
                    key={`managed-${item.id}`}
                    item={item}
                    showPending
                    onPress={() => setNav({ kind: 'view', id: item.id })}
                    actions={
                      <View style={styles.actions}>
                        <Pressable style={styles.actionBtn} onPress={() => setNav({ kind: 'edit', id: item.id })}>
                          <Text style={styles.actionText}>Ubah</Text>
                        </Pressable>
                        <Pressable style={styles.actionBtn} onPress={() => confirmDelete(item)}>
                          <Text style={[styles.actionText, { color: colors.danger }]}>Hapus</Text>
                        </Pressable>
                      </View>
                    }
                  />
                ))}
                <Pressable style={styles.createBtn} onPress={() => setNav({ kind: 'create' })}>
                  <Text style={styles.createBtnText}>＋ Buat Event Baru</Text>
                </Pressable>
              </>
            )}

            {isIALima && (
              <>
                <Text style={[styles.sectionHead, { marginTop: 24 }]}>PERSETUJUAN</Text>
                {queue.length === 0 ? (
                  <Text style={styles.empty}>Tidak ada event yang menunggu persetujuan.</Text>
                ) : (
                  queue.map((item) => (
                    <Row
                      key={`queue-${item.id}`}
                      item={item}
                      onPress={() => setReviewId(item.id)}
                      actions={
                        <View style={styles.actions}>
                          <Pressable style={styles.actionBtn} onPress={() => approveEvent(item)}>
                            <Text style={[styles.actionText, { color: '#3B6D11' }]}>Setujui</Text>
                          </Pressable>
                          <Pressable style={styles.actionBtn} onPress={() => confirmDelete(item)}>
                            <Text style={[styles.actionText, { color: colors.danger }]}>Hapus</Text>
                          </Pressable>
                        </View>
                      }
                    />
                  ))
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      <EventReviewModal
        token={token}
        eventId={reviewId}
        onClose={() => setReviewId(null)}
        onApprove={(id) => approveEvent({ id })}
        onDelete={(id, name) => confirmDelete({ id, name })}
      />
    </View>
  );
}

// Read-only review sheet so Pengurus IA Lima can approve wisely.
function EventReviewModal({ token, eventId, onClose, onApprove, onDelete }: {
  token: string;
  eventId: number | null;
  onClose: () => void;
  onApprove: (id: number) => void;
  onDelete: (id: number, name: string) => void;
}) {
  const [data, setData] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (eventId == null) {
      setData(null);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    evApi
      .detail(token, eventId)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [eventId]);

  return (
    <Modal visible={eventId != null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.reviewBackdrop}>
        <View style={styles.reviewSheet}>
          <View style={styles.reviewHead}>
            <Text style={styles.reviewTitle} numberOfLines={1}>{data?.name || 'Tinjau Event'}</Text>
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
              <Text style={styles.name}>{data.name}</Text>
              <Text style={styles.metaLight}>oleh {data.owner_name} · {data.organizer_label}</Text>

              <View style={styles.reviewFieldsBlock}>
                <ReviewField label="Kategori" value={data.event_category} />
                <ReviewField label="Jenis" value={data.jenis_event} />
                <ReviewField label="Mulai" value={data.start_date ? wibDateTime(data.start_date) : ''} />
                <ReviewField label="Selesai" value={data.end_date ? wibDateTime(data.end_date) : ''} />
                <ReviewField label="Platform" value={data.online_platform} />
                <ReviewField label="Lokasi" value={data.nama_lokasi} />
                <ReviewField label="Alamat" value={data.alamat} />
                <ReviewField label="Link Registrasi" value={data.link_registrasi} />
              </View>

              {!!data.introduction && (
                <View style={styles.reviewSection}>
                  <Text style={styles.reviewSectionHead}>PENGENALAN SINGKAT</Text>
                  <Text style={styles.reviewText}>{data.introduction}</Text>
                </View>
              )}

              {data.tentang_event?.length > 0 && (
                <View style={styles.reviewSection}>
                  <Text style={styles.reviewSectionHead}>TENTANG EVENT</Text>
                  {data.tentang_event.map(renderBlock)}
                </View>
              )}

              {data.banner_informasi.length > 0 && (
                <View style={styles.reviewSection}>
                  <Text style={styles.reviewSectionHead}>BANNER INFORMASI</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {data.banner_informasi.map((g) => (
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
  content: { padding: 16 },
  error: { color: colors.danger, fontFamily: fonts.bodyMedium, marginVertical: 12 },
  empty: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted, lineHeight: 20, marginBottom: 12 },
  noticeBanner: { backgroundColor: '#EAF3DE', borderRadius: 12, padding: 14, marginBottom: 14 },
  noticeText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: '#3B6D11', lineHeight: 19 },
  sectionHead: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.muted, letterSpacing: 0.5, marginBottom: 10 },

  card: { backgroundColor: colors.card, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  logo: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.bgAlt },
  logoFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
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
  reviewCover: { width: '100%', height: 160, borderRadius: 12, backgroundColor: colors.bgAlt, marginBottom: 14 },
  reviewFieldsBlock: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginTop: 12, marginBottom: 14 },
  reviewFieldRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, gap: 10 },
  reviewFieldLabel: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
  reviewFieldValue: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.heading, flexShrink: 1, textAlign: 'right' },
  reviewSection: { marginBottom: 18 },
  reviewSectionHead: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.muted, letterSpacing: 0.5, marginBottom: 8 },
  reviewText: { fontFamily: fonts.body, fontSize: 13.5, color: colors.text, lineHeight: 20 },
  reviewGalleryImg: { width: 96, height: 96, borderRadius: 10, backgroundColor: colors.bgAlt, marginRight: 10 },
  reviewFooter: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
  reviewApproveBtn: { flex: 1, backgroundColor: '#3B6D11', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  reviewApproveText: { fontFamily: fonts.headingSemi, fontSize: 15, color: colors.white },
  reviewDeleteBtn: { flex: 1, borderWidth: 1.5, borderColor: colors.danger, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  reviewDeleteText: { fontFamily: fonts.headingSemi, fontSize: 15, color: colors.danger },
});
