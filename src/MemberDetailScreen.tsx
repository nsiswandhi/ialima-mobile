import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { API_BASE } from './config';
import { colors, fonts } from './theme';
import Header from './Header';
import ProfileView, { ProfileViewData } from './ProfileView';

const INDUSTRY_GLOSSARY_ID = 1;

type Props = { memberId: number; onBack: () => void; onLogout: () => void };

// Read-only detail for a member tapped in the directory. Fetches the public
// /member/{id} payload and resolves the industry label from the glossary.
export default function MemberDetailScreen({ memberId, onBack, onLogout }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProfileViewData | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [mRes, gRes] = await Promise.all([
          fetch(`${API_BASE}/member/${memberId}`),
          fetch(`${API_BASE}/glossary/${INDUSTRY_GLOSSARY_ID}`),
        ]);
        const m = await mRes.json();
        if (!mRes.ok) throw new Error(m?.message || 'Could not load member');
        const g = gRes.ok ? await gRes.json() : null;
        const industryLabel =
          (g?.options || []).find((o: any) => o.value === m.industry)?.label || '';
        if (!alive) return;
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

  return (
    <View style={styles.flex}>
      <Header title={data?.name || 'Profile'} onBack={onBack} onLogout={onLogout} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : data ? (
        <ScrollView contentContainerStyle={styles.content}>
          <ProfileView data={data} />
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingTop: 40, paddingBottom: 40 },

  error: { color: colors.danger, textAlign: 'center', marginTop: 30, fontFamily: fonts.bodyMedium },
});
