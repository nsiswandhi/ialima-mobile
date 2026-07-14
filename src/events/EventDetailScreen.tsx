// Event detail — cover (4:5), logo+info header, "Daftar Event" link button,
// a "Tentang Event" accordion, the conditional "Informasi Kegiatan" block
// (meeting fields for Online/Hybrid, location fields for Offline/Hybrid), and a
// Banner Informasi gallery + lightbox. Mirrors CommunityDetailScreen.
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Header, { DrawerProfile, NavTarget } from '../Header';
import { colors, fonts } from '../theme';
import { renderBlock } from '../Blocks';
import { directionsUrl, evApi, EventDetail, showsOffline, showsOnline } from './api';
import { useAndroidBack } from '../useAndroidBack';

type Props = {
  token: string;
  eventId: number;
  onBack: () => void;
  onLogout: () => void;
  onEdit?: (id: number) => void;
  profile?: DrawerProfile;
  onNavigate?: (target: NavTarget) => void;
};

export default function EventDetailScreen({ token, eventId, onBack, onLogout, onEdit, profile, onNavigate }: Props) {
  const [data, setData] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useAndroidBack(() => {
    if (lightbox) {
      setLightbox(null);
      return true;
    }
    return false;
  });

  useEffect(() => {
    let alive = true;
    setLoading(true);
    evApi
      .detail(token, eventId)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    evApi.trackView(token, eventId);
    return () => {
      alive = false;
    };
  }, [eventId]);

  const openLoc = () => {
    if (!data) return;
    if (data.google_maps_url) Linking.openURL(data.google_maps_url);
    else if (data.latitude && data.longitude) Linking.openURL(directionsUrl(data.latitude, data.longitude));
  };

  const copyPassword = async () => {
    if (!data?.password) return;
    await Clipboard.setStringAsync(data.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const online = data ? showsOnline(data.jenis_event) : false;
  const offline = data ? showsOffline(data.jenis_event) : false;
  const hasMeeting = data && online && (data.meeting_url || data.meeting_id || data.password || data.online_platform);
  const hasLocation = data && offline && (data.nama_lokasi || data.alamat || (data.latitude && data.longitude));

  return (
    <View style={styles.flex}>
      <Header title={data?.name || 'Event'} onBack={onBack} onLogout={onLogout} profile={profile} onNavigate={onNavigate} />
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
              {!!data.introduction && <Text style={styles.intro}>{data.introduction}</Text>}
              <View style={styles.metaRow}>
                {!!data.event_category && (
                  <View style={styles.badge}><Text style={styles.badgeText}>{data.event_category}</Text></View>
                )}
                {!!data.jenis_event && (
                  <View style={styles.badge}><Text style={styles.badgeText}>{data.jenis_event}</Text></View>
                )}
              </View>
              {!!data.start_date_display && (
                <View style={styles.dateRow}>
                  <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                  <Text style={styles.dateText}>
                    {data.start_date_display}
                    {data.end_date_display ? ` – ${data.end_date_display}` : ''}
                  </Text>
                </View>
              )}
              {!!data.organizer_label && (
                <Text style={styles.organizer}>Diselenggarakan oleh {data.organizer_label}</Text>
              )}
            </View>
          </View>

          {data.approval_status === 'pending' && data.is_owner && (
            <View style={styles.pendingBanner}>
              <Ionicons name="time-outline" size={16} color="#854F0B" />
              <Text style={styles.pendingBannerText}>Menunggu persetujuan Pengurus IA Lima.</Text>
            </View>
          )}

          {!!data.link_registrasi && (
            <Pressable
              style={({ pressed }) => [styles.registerBtn, pressed && styles.pressed]}
              onPress={() => Linking.openURL(data.link_registrasi)}
            >
              <Text style={styles.registerText}>Daftar Event</Text>
            </Pressable>
          )}

          {data.is_owner && (
            <Pressable style={styles.manageBtn} onPress={() => onEdit?.(data.id)}>
              <Ionicons name="create-outline" size={16} color={colors.primary} />
              <Text style={styles.manageText}>Kelola Event</Text>
            </Pressable>
          )}

          {data.tentang_event?.length > 0 && (
            <View style={styles.section}>
              <View style={styles.accordion}>
                <Pressable style={styles.accordionHead} onPress={() => setAboutOpen((o) => !o)}>
                  <Text style={styles.accordionTitle}>Tentang Event</Text>
                  <Ionicons name={aboutOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} />
                </Pressable>
                {aboutOpen && <View style={styles.accordionBody}>{data.tentang_event.map(renderBlock)}</View>}
              </View>
            </View>
          )}

          {(hasMeeting || hasLocation) && (
            <View style={styles.section}>
              <Text style={styles.sectionHead}>INFORMASI KEGIATAN</Text>

              {hasMeeting ? (
                <View style={styles.infoCard}>
                  {!!data.online_platform && (
                    <InfoRow label="Platform" value={data.online_platform} />
                  )}
                  {!!data.meeting_url && (
                    <Pressable style={styles.linkRow} onPress={() => Linking.openURL(data.meeting_url)}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoLabel}>Meeting URL</Text>
                        <Text style={styles.linkValue} numberOfLines={1}>{data.meeting_url}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                    </Pressable>
                  )}
                  {!!data.meeting_id && <InfoRow label="Meeting ID" value={data.meeting_id} />}
                  {!!data.password && (
                    <View style={styles.infoRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoLabel}>Password</Text>
                        <Text style={styles.infoValue}>{data.password}</Text>
                      </View>
                      <Pressable style={styles.copyBtn} onPress={copyPassword} hitSlop={8}>
                        <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={colors.primary} />
                      </Pressable>
                    </View>
                  )}
                </View>
              ) : null}

              {hasLocation ? (
                <View style={styles.infoCard}>
                  {!!data.nama_lokasi && (
                    <Pressable
                      style={styles.linkRow}
                      onPress={openLoc}
                      disabled={!data.google_maps_url && !(data.latitude && data.longitude)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoLabel}>Lokasi</Text>
                        <Text style={styles.linkValue}>{data.nama_lokasi}</Text>
                      </View>
                      <Ionicons name="location-outline" size={18} color={colors.primary} />
                    </Pressable>
                  )}
                  {!!data.alamat && <InfoRow label="Alamat" value={data.alamat} />}
                  {!!(data.latitude && data.longitude) && (
                    <Pressable
                      style={styles.directionBtn}
                      onPress={() => Linking.openURL(directionsUrl(data.latitude, data.longitude))}
                    >
                      <Ionicons name="navigate-outline" size={16} color={colors.white} />
                      <Text style={styles.directionText}>Get Direction</Text>
                    </Pressable>
                  )}
                </View>
              ) : null}
            </View>
          )}

          {data.banner_informasi.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionHead}>BANNER INFORMASI</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
                {data.banner_informasi.map((g) => (
                  <Pressable key={g.id} onPress={() => setLightbox(g.full)}>
                    <Image source={{ uri: g.thumbnail || g.full }} style={styles.galleryImg} />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingBottom: 40 },
  cover: { width: '100%', aspectRatio: 4 / 5, backgroundColor: colors.bgAlt },
  coverFallback: { backgroundColor: colors.primaryDark, opacity: 0.15 },

  headRow: { flexDirection: 'row', gap: 14, paddingHorizontal: 16, marginTop: 14 },
  logo: { width: 64, height: 64, borderRadius: 14, backgroundColor: colors.bgAlt },
  logoFallback: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  logoLetter: { fontFamily: fonts.heading, fontSize: 26, color: colors.primary },
  name: { fontFamily: fonts.heading, fontSize: 20, color: colors.heading },
  intro: { fontFamily: fonts.body, fontSize: 13.5, color: colors.text, lineHeight: 20, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  badge: { backgroundColor: colors.bgAlt, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.primary },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  dateText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.heading, flex: 1 },
  organizer: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted, marginTop: 6 },

  pendingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FAEEDA', borderRadius: 10,
    marginHorizontal: 16, marginTop: 14, padding: 12,
  },
  pendingBannerText: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: '#854F0B', flex: 1 },

  registerBtn: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16, marginHorizontal: 16 },
  pressed: { opacity: 0.85 },
  registerText: { fontFamily: fonts.headingSemi, fontSize: 15, color: colors.white },

  manageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginTop: 8 },
  manageText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.primary },

  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionHead: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.muted, letterSpacing: 0.5, marginBottom: 10 },

  accordion: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  accordionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14 },
  accordionTitle: { fontFamily: fonts.bodyMedium, fontSize: 13.5, color: colors.heading },
  accordionBody: { paddingHorizontal: 14, paddingBottom: 12 },

  infoCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { fontFamily: fonts.body, fontSize: 11.5, color: colors.muted },
  infoValue: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.heading, marginTop: 2 },
  linkValue: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.primary, marginTop: 2 },
  copyBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  directionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 11, marginVertical: 11,
  },
  directionText: { fontFamily: fonts.headingSemi, fontSize: 14, color: colors.white },

  galleryRow: { gap: 10 },
  galleryImg: { width: 112, height: 112, borderRadius: 12, backgroundColor: colors.bgAlt },
  lightboxBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  lightboxImg: { width: '100%', height: '100%' },

  error: { color: colors.danger, textAlign: 'center', marginTop: 12, fontFamily: fonts.bodyMedium },
});
