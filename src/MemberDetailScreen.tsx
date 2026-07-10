import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { API_BASE } from './config';
import { colors, fonts } from './theme';
import Header from './Header';
import ProfileView, { ProfileViewData } from './ProfileView';

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
};

// Read-only detail for a member tapped in the directory. Fetches the
// (auth-gated) /member/{id} payload and resolves the industry label. Pengurus
// see a Verify button for eligible subscribers; members see a Recognize button.
export default function MemberDetailScreen({ memberId, token, viewer, onBack, onLogout }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProfileViewData | null>(null);

  // Promotion state for this target.
  const [isMember, setIsMember] = useState(true); // assume member until told otherwise
  const [isPengurusAngkatan, setIsPengurusAngkatan] = useState(false);
  const [angkatan, setAngkatan] = useState<string>('');

  // "I know this person" mutual connection state (viewer -> this member).
  const [iKnowThem, setIKnowThem] = useState(false);
  const [theyKnowMe, setTheyKnowMe] = useState(false);
  const [acting, setActing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

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
        setAngkatan(m.angkatan || '');
        setIKnowThem(!!m.i_know_them);
        setTheyKnowMe(!!m.they_know_me);
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

  // Verify eligibility (only for not-yet-members that aren't the viewer).
  const isSelf = viewer?.id === memberId;
  const caps = viewer?.caps || {};
  const canVerifyAny = !!caps.verify_any;
  const canVerifyAngkatan = !!caps.verify_same_angkatan && !!angkatan && viewer?.angkatan === angkatan;
  const showVerify = !isMember && !isSelf && (canVerifyAny || canVerifyAngkatan);
  const verifyLabel = canVerifyAny ? 'Verify Member' : 'Verify Alumni';
  // Pengurus IA Lima only: appoint the member as Pengurus Angkatan (their year).
  const canAppointAngkatan = !!caps.appoint_pengurus && !isSelf && !!angkatan && !isPengurusAngkatan;
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
      if (d.promoted) setIsMember(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActing(false);
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

  return (
    <View style={styles.flex}>
      <Header title={data?.name || 'Profile'} onBack={onBack} onLogout={onLogout} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error && !data ? (
        <Text style={styles.error}>{error}</Text>
      ) : data ? (
        <ScrollView contentContainerStyle={styles.content}>
          <ProfileView data={data} />

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

          {!isSelf && (
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
          )}
        </ScrollView>
      ) : null}
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
});
