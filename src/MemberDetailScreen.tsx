import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE } from './config';
import { colors, fonts } from './theme';
import Header, { DrawerProfile, NavTarget } from './Header';
import ProfileView, { CareerSection, ProfileViewData } from './ProfileView';
import BrandCard from './marketplace/BrandCard';
import BrandDetailScreen from './BrandDetailScreen';
import { BrandSummary, mkApi } from './marketplace/api';
import CommunityCard from './community/CommunityCard';
import CommunityDetailScreen from './community/CommunityDetailScreen';
import { commApi, CommunitySummary } from './community/api';
import DashboardArtikelCard from './artikel/DashboardArtikelCard';
import ArtikelDetailScreen from './artikel/ArtikelDetailScreen';
import { artikelApi, ArtikelSummary } from './artikel/api';
import AppointKomunitasSheet from './community/AppointKomunitasSheet';
import { useAndroidBack } from './useAndroidBack';
import { chatApi, ChatThread } from './chat/api';
import { trackEvent } from './analytics';

const CARD_W = 156;

const INDUSTRY_GLOSSARY_ID = 1;

// The signed-in viewer, used to decide whether to show Verify / Recognize.
type Viewer = {
  id: number;
  angkatan?: string;
  caps?: {
    recognize?: boolean;
    verify_any?: boolean;
    verify_same_angkatan?: boolean;
    appoint_pengurus?: boolean;
  };
} | null;

type Props = {
  memberId: number;
  token: string;
  viewer: Viewer;
  onBack: () => void;
  onLogout: () => void;
  profile?: DrawerProfile;
  onNavigate?: (target: NavTarget) => void;
  onOpenThread: (thread: ChatThread) => void;
};

// Read-only detail for a member tapped in the directory. Fetches the
// (auth-gated) /member/{id} payload and resolves the industry label. Pengurus
// see a Verify button for eligible subscribers; members see a Recognize button.
export default function MemberDetailScreen({ memberId, token, viewer, onBack, onLogout, profile, onNavigate, onOpenThread }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProfileViewData | null>(null);

  // This member's brands/communities/articles (carousels) + detail overlays.
  const [memberBrands, setMemberBrands] = useState<BrandSummary[]>([]);
  const [openBrandId, setOpenBrandId] = useState<number | null>(null);
  const [memberCommunities, setMemberCommunities] = useState<CommunitySummary[]>([]);
  const [openCommunityId, setOpenCommunityId] = useState<number | null>(null);
  const [memberArticles, setMemberArticles] = useState<ArtikelSummary[]>([]);
  const [openArtikelId, setOpenArtikelId] = useState<number | null>(null);

  // Promotion state for this target.
  const [isMember, setIsMember] = useState(true); // assume member until told otherwise
  const [isPengurusAngkatan, setIsPengurusAngkatan] = useState(false);
  const [isPengurusKomunitas, setIsPengurusKomunitas] = useState(false);
  const [showAppointKomunitas, setShowAppointKomunitas] = useState(false);
  const [angkatan, setAngkatan] = useState<string>('');

  // "I know this person" mutual connection state (viewer -> this member).
  const [iKnowThem, setIKnowThem] = useState(false);
  const [theyKnowMe, setTheyKnowMe] = useState(false);
  const [recognizeCount, setRecognizeCount] = useState(0); // how many people know this member (dikenal)
  const [outboundCount, setOutboundCount] = useState(0); // how many people this member knows (kenal)
  const [acting, setActing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [messaging, setMessaging] = useState(false);

  useAndroidBack(() => {
    if (openBrandId != null) {
      setOpenBrandId(null);
      return true;
    }
    if (openCommunityId != null) {
      setOpenCommunityId(null);
      return true;
    }
    if (openArtikelId != null) {
      setOpenArtikelId(null);
      return true;
    }
    return false;
  });

  const authHeaders = { 'X-IA5-Token': token };

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      setNotice(null);
      try {
        const [mRes, gRes] = await Promise.all([
          fetch(`${API_BASE}/member/${memberId}`, { headers: authHeaders }),
          fetch(`${API_BASE}/glossary/${INDUSTRY_GLOSSARY_ID}`),
        ]);
        const m = await mRes.json();
        if (!mRes.ok) throw new Error(m?.message || 'Could not load member');
        const g = gRes.ok ? await gRes.json() : null;
        const industryLabel =
          (g?.options || []).find((o: any) => o.value === m.industry)?.label || '';
        if (!alive) return;
        setIsMember(!!m.is_member);
        setIsPengurusAngkatan((m.roles || []).includes('Pengurus Angkatan'));
        setIsPengurusKomunitas((m.roles || []).includes('Pengurus Komunitas'));
        setAngkatan(m.angkatan || '');
        setIKnowThem(!!m.i_know_them);
        setTheyKnowMe(!!m.they_know_me);
        setRecognizeCount(Number(m.recognize_count) || 0);
        setOutboundCount(Number(m.recognized_count) || 0);
        setData({
          name: m.name,
          avatar: m.avatar,
          roles: m.roles,
          angkatan: m.angkatan,
          kota_dan_provinsi: m.kota_dan_provinsi,
          job_title: m.job_title,
          company: m.company,
          industryLabel,
          open_to_opportunities: m.open_to_opportunities,
          open_for_collaboration: m.open_for_collaboration,
          social: m.social,
        });

        // Best-effort profile-view tracking (also the trigger context for the
        // pengurus Verify button). Ignore failures.
        fetch(`${API_BASE}/track-profile-view/${memberId}`, {
          method: 'POST',
          headers: authHeaders,
        }).catch(() => {});
        trackEvent('alumni_profile_viewed');
      } catch (e: any) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [memberId]);

  // Load this member's brands/communities/articles for the carousel sections.
  useEffect(() => {
    let alive = true;
    mkApi
      .list(token, { owner: memberId })
      .then((r) => { if (alive) setMemberBrands(r.data); })
      .catch(() => {});
    commApi
      .list(token, { role: 'member', member_id: memberId })
      .then((r) => { if (alive) setMemberCommunities(r.data); })
      .catch(() => {});
    artikelApi
      .list(token, { author_id: memberId })
      .then((r) => { if (alive) setMemberArticles(r.data); })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [memberId]);

  // Verify eligibility (only for not-yet-members that aren't the viewer).
  const isSelf = viewer?.id === memberId;
  const caps = viewer?.caps || {};
  const canVerifyAny = !!caps.verify_any;
  const canVerifyAngkatan = !!caps.verify_same_angkatan && !!angkatan && viewer?.angkatan === angkatan;
  const showVerify = !isMember && !isSelf && (canVerifyAny || canVerifyAngkatan);
  const verifyLabel = canVerifyAny ? 'Verify Member' : 'Verify Alumni';
  // Pengurus IA Lima only: appoint the member as Pengurus Angkatan (their year).
  const canAppointAngkatan = !!caps.appoint_pengurus && !isSelf && !!angkatan && !isPengurusAngkatan;
  // Pengurus IA Lima only: appoint the member as Pengurus Komunitas (pick/create).
  const canAppointKomunitas = !!caps.appoint_pengurus && !isSelf && !isPengurusKomunitas;
  // "I know this person" connection — shown on every profile but your own, for
  // all roles. Mutual ("Saling Kenal") once both have flagged.
  const mutual = iKnowThem && theyKnowMe;

  async function act(path: string, successText: (d: any) => string, onDone?: (d: any) => void) {
    setActing(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ target_id: String(memberId) }).toString(),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.message || 'Action failed');
      if (d.promoted) setIsMember(true);
      onDone?.(d);
      setNotice(successText(d));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActing(false);
    }
  }

  const doVerify = () =>
    act('/verify-member', () => `${data?.name || 'Alumni'} is now a Member.`);

  async function toggleKnow() {
    setActing(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/recognize-member?target_id=${memberId}`, {
        method: iKnowThem ? 'DELETE' : 'POST',
        headers: authHeaders,
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.message || 'Action failed');
      setIKnowThem(!!d.i_know_them);
      setTheyKnowMe(!!d.they_know_me);
      if (typeof d.recognize_count === 'number') setRecognizeCount(d.recognize_count);
      if (d.promoted) setIsMember(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActing(false);
    }
  }

  async function startChat() {
    setMessaging(true);
    setError(null);
    try {
      const thread = await chatApi.startThread(token, memberId);
      onOpenThread(thread);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setMessaging(false);
    }
  }

  const doAppointAngkatan = () =>
    act(
      '/appoint-pengurus-angkatan',
      (d) => `${data?.name || 'Alumni'} is now Pengurus Angkatan ${d.angkatan}.`,
      () => {
        setIsMember(true);
        setIsPengurusAngkatan(true);
      },
    );

  if (openBrandId != null) {
    return (
      <BrandDetailScreen
        brandId={openBrandId}
        token={token}
        viewerId={viewer?.id ?? 0}
        onBack={() => setOpenBrandId(null)}
        onLogout={onLogout}
        profile={profile}
        onNavigate={onNavigate}
      />
    );
  }

  if (openCommunityId != null) {
    return (
      <CommunityDetailScreen
        communityId={openCommunityId}
        token={token}
        onBack={() => setOpenCommunityId(null)}
        onLogout={onLogout}
        profile={profile}
        onNavigate={onNavigate}
      />
    );
  }

  if (openArtikelId != null) {
    return (
      <ArtikelDetailScreen
        token={token}
        articleId={openArtikelId}
        onBack={() => setOpenArtikelId(null)}
        onEdit={() => {}}
      />
    );
  }

  return (
    <View style={styles.flex}>
      <Header title={data?.name || 'Profile'} onBack={onBack} onLogout={onLogout} profile={profile} onNavigate={onNavigate} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error && !data ? (
        <Text style={styles.error}>{error}</Text>
      ) : data ? (
        <ScrollView contentContainerStyle={styles.content}>
          <ProfileView data={data} showCareer={false} />

          {!isSelf && (
            <View style={styles.knowSection}>
              <View style={styles.knowStatsRow}>
                <View style={styles.knowStat}>
                  <Ionicons name="person-outline" size={14} color={colors.muted} />
                  <Text style={styles.knowStatText}>{outboundCount} kenal</Text>
                </View>
                <View style={styles.knowStat}>
                  <Ionicons name="person-outline" size={14} color={colors.muted} />
                  <Text style={styles.knowStatText}>{recognizeCount} dikenal</Text>
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [
                  mutual ? styles.knowMutualBtn : iKnowThem ? styles.knowActiveBtn : styles.secondaryBtn,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={toggleKnow}
                disabled={acting}
              >
                <Text style={mutual ? styles.knowMutualText : styles.secondaryBtnText}>
                  {acting
                    ? 'Working…'
                    : mutual
                    ? 'Saling Kenal 🤝'
                    : iKnowThem
                    ? 'Saya Kenal Dia ✓'
                    : 'Saya Kenal Dia'}
                </Text>
              </Pressable>

              {mutual && (
                <Pressable
                  style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
                  onPress={startChat}
                  disabled={messaging}
                >
                  <Text style={styles.primaryBtnText}>{messaging ? 'Membuka…' : 'Kirim Pesan'}</Text>
                </Pressable>
              )}
            </View>
          )}

          <CareerSection data={data} />

          {memberBrands.length > 0 && (
            <View style={styles.mpSection}>
              <View style={styles.mpHeadRow}>
                <View style={styles.mpBar} />
                <Text style={styles.mpHead}>MARKETPLACE</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselRow}>
                {memberBrands.map((b) => (
                  <BrandCard key={b.id} brand={b} style={{ width: CARD_W }} onPress={() => setOpenBrandId(b.id)} />
                ))}
              </ScrollView>
            </View>
          )}

          {memberCommunities.length > 0 && (
            <View style={styles.mpSection}>
              <View style={styles.mpHeadRow}>
                <View style={styles.mpBar} />
                <Text style={styles.mpHead}>KOMUNITAS</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselRow}>
                {memberCommunities.map((c) => (
                  <CommunityCard key={c.id} community={c} style={{ width: CARD_W }} onPress={() => setOpenCommunityId(c.id)} />
                ))}
              </ScrollView>
            </View>
          )}

          {memberArticles.length > 0 && (
            <View style={styles.mpSection}>
              <View style={styles.mpHeadRow}>
                <View style={styles.mpBar} />
                <Text style={styles.mpHead}>ARTIKEL</Text>
              </View>
              <View style={styles.artikelList}>
                {memberArticles.map((a) => (
                  <DashboardArtikelCard key={a.id} article={a} onPress={() => setOpenArtikelId(a.id)} />
                ))}
              </View>
            </View>
          )}

          {!!notice && <Text style={styles.notice}>{notice}</Text>}
          {!!error && <Text style={styles.error}>{error}</Text>}

          {showVerify && (
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
              onPress={doVerify}
              disabled={acting}
            >
              <Text style={styles.primaryBtnText}>{acting ? 'Working…' : verifyLabel}</Text>
            </Pressable>
          )}

          {canAppointAngkatan && (
            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.85 }]}
              onPress={doAppointAngkatan}
              disabled={acting}
            >
              <Text style={styles.secondaryBtnText}>
                {acting ? 'Working…' : `Jadikan Pengurus Angkatan${angkatan ? ' ' + angkatan : ''}`}
              </Text>
            </Pressable>
          )}

          {canAppointKomunitas && (
            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.85 }]}
              onPress={() => setShowAppointKomunitas(true)}
              disabled={acting}
            >
              <Text style={styles.secondaryBtnText}>Jadikan Pengurus Komunitas</Text>
            </Pressable>
          )}
        </ScrollView>
      ) : null}

      <AppointKomunitasSheet
        token={token}
        targetId={memberId}
        targetName={data?.name}
        visible={showAppointKomunitas}
        onClose={() => setShowAppointKomunitas(false)}
        onDone={(name) => {
          setShowAppointKomunitas(false);
          setIsMember(true);
          setIsPengurusKomunitas(true);
          setNotice(`${data?.name || 'Alumni'} kini Pengurus Komunitas ${name}.`);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingTop: 40, paddingBottom: 40 },

  error: { color: colors.danger, textAlign: 'center', marginTop: 16, fontFamily: fonts.bodyMedium },
  notice: { color: colors.primary, textAlign: 'center', marginTop: 16, fontFamily: fonts.bodyMedium },

  primaryBtn: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  primaryBtnPressed: { backgroundColor: colors.accentDark },
  primaryBtnText: { color: colors.white, fontFamily: fonts.headingSemi, fontSize: 16, letterSpacing: 0.5 },

  secondaryBtn: {
    borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12,
    borderWidth: 1.5, borderColor: colors.primary,
  },
  secondaryBtnText: { color: colors.primary, fontFamily: fonts.headingSemi, fontSize: 15 },

  // Kenal/dikenal counts + Saya Kenal Dia/Saling Kenal + Kirim Pesan, shown
  // right after the social links (ProfileView).
  knowSection: { marginTop: 20 },
  knowStatsRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 4 },
  knowStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  knowStatText: { fontFamily: fonts.bodyMedium, fontSize: 13.5, color: colors.muted },

  // "I know this person" — you flagged, not yet mutual (selected, filled tint).
  knowActiveBtn: {
    borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12,
    backgroundColor: colors.bgAlt, borderWidth: 1.5, borderColor: colors.primary,
  },
  // Mutual — both flagged ("Saling Kenal").
  knowMutualBtn: {
    borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12,
    backgroundColor: colors.primary,
  },
  knowMutualText: { color: colors.white, fontFamily: fonts.headingSemi, fontSize: 15 },

  // Carousel sections (Marketplace/Komunitas/Artikel), mirroring the KARIR DATA heading.
  mpSection: { marginTop: 24 },
  mpHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  mpBar: { width: 4, height: 18, borderRadius: 2, backgroundColor: colors.primary },
  mpHead: { fontFamily: fonts.heading, fontSize: 16, color: colors.primary, letterSpacing: 0.5 },
  carouselRow: { gap: 12, paddingBottom: 4 },
  artikelList: {},
});

