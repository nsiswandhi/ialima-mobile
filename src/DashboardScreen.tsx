import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
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

const WELCOME_MESSAGES = [
  'Wilujeng sumping, senang kamu kembali.',
  'Selamat datang kembali di LIMA Circle.',
  'Apa yang akan kita lakukan hari ini?',
  'Senang melihatmu lagi di sini.',
  'Siap terhubung dengan keluarga Lima hari ini?',
];

const CARD_W = 156;

// Home screen shown right after login: a welcome banner, a "Brand Unggulan"
// carousel (up to 10 brands) and an "Alumni Populer" carousel (up to 10 members,
// already ranked by recognition on the server).
export default function DashboardScreen({ token, userName, onOpenBrand, onOpenMember, onOpenCommunity, onOpenEvent, onOpenArtikel, onLogout, profile, onNavigate }: Props) {
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [alumni, setAlumni] = useState<AlumniSummary[]>([]);
  const [communities, setCommunities] = useState<CommunitySummary[]>([]);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [articles, setArticles] = useState<ArtikelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [welcome] = useState(() => WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [brandRes, memberRes, communityRes, eventRes, articleRes] = await Promise.all([
          mkApi.list(token, { featured: true }).catch(() => ({ data: [] as BrandSummary[] })),
          fetch(`${API_BASE}/members?per_page=10`, { headers: { 'X-IA5-Token': token } })
            .then((r) => r.json())
            .catch(() => ({ data: [] })),
          commApi.list(token, {}).catch(() => ({ data: [] as CommunitySummary[] })),
          evApi.list(token, { when: 'upcoming', per_page: 3 }).catch(() => ({ data: [] as EventSummary[] })),
          artikelApi.list(token, { per_page: 3 }).catch(() => ({ data: [] as ArtikelSummary[] })),
        ]);
        if (!alive) return;
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
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeHi}>Hai {userName || 'Alumni'},</Text>
          <Text style={styles.welcomeMsg}>{welcome}</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
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

  welcomeCard: {
    marginHorizontal: 12, backgroundColor: colors.card,
    borderRadius: 14, borderLeftWidth: 4, borderLeftColor: colors.secondary,
    paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.primaryDark, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  welcomeHi: { fontFamily: fonts.heading, fontSize: 20, color: colors.heading },
  welcomeMsg: { fontFamily: fonts.body, fontSize: 14, color: colors.text, marginTop: 4, lineHeight: 20 },

  section: { marginTop: 26 },
  sectionBar: {
    position: 'absolute', left: 12, top: 2, width: 4, height: 20, borderRadius: 2, backgroundColor: colors.secondary,
  },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.heading, marginLeft: 24, marginBottom: 12 },
  row: { paddingHorizontal: 12, gap: 12, paddingBottom: 4 },
  empty: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginLeft: 24 },
  eventList: { paddingHorizontal: 12 },
});
