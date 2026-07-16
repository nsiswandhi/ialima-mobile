import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE } from './config';
import { colors, fonts } from './theme';
import Header, { DrawerProfile, NavTarget } from './Header';
import BrandCard from './marketplace/BrandCard';
import AlumniCard, { AlumniSummary } from './AlumniCard';
import { BrandSummary, mkApi } from './marketplace/api';
import CommunityCard from './community/CommunityCard';
import { commApi, CommunitySummary } from './community/api';
import EventListCard from './events/EventListCard';
import { evApi, EventSummary } from './events/api';
import DashboardArtikelCard from './artikel/DashboardArtikelCard';
import { artikelApi, ArtikelSummary } from './artikel/api';

type Props = {
  token: string;
  userName?: string;
  onOpenBrand: (id: number) => void;
  onOpenMember: (id: number) => void;
  onOpenCommunity: (id: number) => void;
  onOpenEvent: (id: number) => void;
  onOpenArtikel: (id: number) => void;
  onLogout: () => void;
  profile?: DrawerProfile;
  onNavigate?: (target: NavTarget) => void;
};

const CARD_W = 156;

type Stats = {
  total_users: number;
  total_marketplace: number;
  total_marketplace_item: number;
  total_komunitas: number;
  total_posts: number;
};

const STAT_TILES: { key: keyof Stats; label: string; color: string }[] = [
  { key: 'total_users', label: 'MEMBER', color: colors.primary },
  { key: 'total_marketplace', label: 'BRAND', color: colors.accent },
  { key: 'total_marketplace_item', label: 'PRODUK', color: colors.secondary },
  { key: 'total_komunitas', label: 'KOMUNITAS', color: colors.primaryDark },
  { key: 'total_posts', label: 'ARTIKEL', color: colors.accentDark },
];

// Plain digits fit 4 digits (<10,000); beyond that, abbreviate so the tile
// stays visually compact regardless of how big the count gets.
function formatCompactNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 10_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

// Home screen shown right after login: a stat counter row, upcoming events,
// a "Brand Unggulan" carousel (up to 10 brands) and an "Alumni Populer"
// carousel (up to 10 members, already ranked by recognition on the server).
export default function DashboardScreen({ token, onOpenBrand, onOpenMember, onOpenCommunity, onOpenEvent, onOpenArtikel, onLogout, profile, onNavigate }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [alumni, setAlumni] = useState<AlumniSummary[]>([]);
  const [communities, setCommunities] = useState<CommunitySummary[]>([]);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [articles, setArticles] = useState<ArtikelSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [statsRes, brandRes, memberRes, communityRes, eventRes, articleRes] = await Promise.all([
          fetch(`${API_BASE}/stats`, { headers: { 'X-IA5-Token': token } })
            .then((r) => r.json())
            .catch(() => null),
          mkApi.list(token, { featured: true }).catch(() => ({ data: [] as BrandSummary[] })),
          fetch(`${API_BASE}/members?per_page=10`, { headers: { 'X-IA5-Token': token } })
            .then((r) => r.json())
            .catch(() => ({ data: [] })),
          commApi.list(token, {}).catch(() => ({ data: [] as CommunitySummary[] })),
          evApi.list(token, { when: 'upcoming', per_page: 3 }).catch(() => ({ data: [] as EventSummary[] })),
          artikelApi.list(token, { per_page: 3 }).catch(() => ({ data: [] as ArtikelSummary[] })),
        ]);
        if (!alive) return;
        setStats(statsRes || null);
        setBrands((brandRes.data || []).slice(0, 10));
        setAlumni((memberRes.data || []).slice(0, 10));
        setCommunities((communityRes.data || []).slice(0, 10));
        setEvents((eventRes.data || []).slice(0, 3));
        setArticles((articleRes.data || []).slice(0, 3));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  return (
    <View style={styles.flex}>
      <Header title="Dashboard" onLogout={onLogout} profile={profile} onNavigate={onNavigate} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statGrid}>
          {STAT_TILES.map((t) => (
            <View key={t.key} style={[styles.statTile, { borderTopColor: t.color }]}>
              <Text style={styles.statTotal}>TOTAL</Text>
              <Text style={styles.statNumber} numberOfLines={1} adjustsFontSizeToFit>
                {stats ? formatCompactNumber(stats[t.key]) : '—'}
              </Text>
              <Text style={styles.statLabel}>{t.label}</Text>
            </View>
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.section}>
              <View style={styles.sectionBar} />
              <Text style={styles.sectionTitle}>Kegiatan Akan Datang</Text>
              {events.length > 0 ? (
                <View style={styles.eventList}>
                  {events.map((e) => (
                    <EventListCard key={e.id} event={e} onPress={() => onOpenEvent(e.id)} />
                  ))}
                </View>
              ) : (
                <Text style={styles.empty}>Belum ada kegiatan.</Text>
              )}
            </View>

            <Section title="Brand Unggulan" empty="Belum ada brand." show={brands.length > 0}>
              {brands.map((b) => (
                <BrandCard key={b.id} brand={b} onPress={() => onOpenBrand(b.id)} style={{ width: CARD_W }} />
              ))}
            </Section>

            <Section title="Alumni Populer" empty="Belum ada alumni." show={alumni.length > 0}>
              {alumni.map((m) => (
                <AlumniCard key={m.id} member={m} onPress={() => onOpenMember(m.id)} style={{ width: CARD_W }} />
              ))}
            </Section>

            <Section title="Komunitas Populer" empty="Belum ada komunitas." show={communities.length > 0}>
              {communities.map((c) => (
                <CommunityCard key={c.id} community={c} onPress={() => onOpenCommunity(c.id)} style={{ width: CARD_W }} />
              ))}
            </Section>

            <View style={styles.section}>
              <View style={styles.sectionBar} />
              <Text style={styles.sectionTitle}>Artikel Terbaru</Text>
              {articles.length > 0 ? (
                <View style={styles.eventList}>
                  {articles.map((a) => (
                    <DashboardArtikelCard key={a.id} article={a} onPress={() => onOpenArtikel(a.id)} />
                  ))}
                </View>
              ) : (
                <Text style={styles.empty}>Belum ada artikel.</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Section({
  title, empty, show, children,
}: {
  title: string; empty: string; show: boolean; children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionBar} />
      <Text style={styles.sectionTitle}>{title}</Text>
      {show ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {children}
        </ScrollView>
      ) : (
        <Text style={styles.empty}>{empty}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { paddingTop: 46, paddingBottom: 32 },

  statGrid: { paddingHorizontal: 12, gap: 10 },
  statTile: {
    width: 92, height: 92, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderTopWidth: 3,
    shadowColor: colors.primaryDark, shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statTotal: { fontFamily: fonts.bodySemi, fontSize: 9, lineHeight: 9, color: colors.muted, letterSpacing: 0.5 },
  statNumber: {
    fontFamily: fonts.heading, fontSize: 19, color: colors.heading, letterSpacing: -1.5,
    marginTop: 3, textAlign: 'center',
  },
  statLabel: { fontFamily: fonts.bodySemi, fontSize: 9, color: colors.muted, marginTop: 3, letterSpacing: 0.4, textAlign: 'center' },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 12, marginTop: 12, backgroundColor: colors.card,
    borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    paddingVertical: 14, paddingHorizontal: 16,
  },
  cardPressed: { backgroundColor: colors.bg },
  cardTitle: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 14, color: colors.heading },

  section: { marginTop: 26 },
  sectionBar: {
    position: 'absolute', left: 12, top: 2, width: 4, height: 20, borderRadius: 2, backgroundColor: colors.secondary,
  },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.heading, marginLeft: 24, marginBottom: 12 },
  row: { paddingHorizontal: 12, gap: 12, paddingBottom: 4 },
  empty: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginLeft: 24 },
  eventList: { paddingHorizontal: 12 },
});
