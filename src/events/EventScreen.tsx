// Events tab — two sections ("Kegiatan Akan Datang" / "Kegiatan Sudah Lewat")
// via a segmented toggle, a 2-column card grid, plus create/detail sub-views.
// Mirrors CommunityScreen's local view routing.
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header, { DrawerProfile, NavTarget } from '../Header';
import { colors, fonts } from '../theme';
import { evApi, EventSummary } from './api';
import EventListCard from './EventListCard';
import EventDetailScreen from './EventDetailScreen';
import EventFormScreen from './EventFormScreen';
import NoticeBanner from '../NoticeBanner';
import { useAndroidBack } from '../useAndroidBack';
import AdBanner from '../ads/AdBanner';

type Props = {
  token: string;
  canCreate?: boolean; // viewer holds any ia5_create_*_event cap
  canOrg?: boolean;
  canKomunitas?: boolean;
  canAngkatan?: boolean;
  onLogout: () => void;
  initialEventId?: number | null;
  profile?: DrawerProfile;
  onNavigate?: (target: NavTarget) => void;
  unreadCount?: number;
  onInternalLink: (type: string, id: number) => void;
};

type View3 = 'list' | 'detail' | 'form';
type When = 'upcoming' | 'past';

// Rows fed to the single FlatList below: banner (scrolls away) + search
// (sticky at index 1, pinned just under the header once it reaches the top)
// + status + individual events.
type Row =
  | { kind: 'banner' }
  | { kind: 'search' }
  | { kind: 'status' }
  | { kind: 'event'; event: EventSummary };

export default function EventScreen({ token, canCreate, canOrg, canKomunitas, canAngkatan, onLogout, initialEventId, profile, onNavigate, unreadCount, onInternalLink }: Props) {
  const [view, setView] = useState<View3>(initialEventId ? 'detail' : 'list');
  const [selectedId, setSelectedId] = useState<number | null>(initialEventId ?? null);
  const [editId, setEditId] = useState<number | null>(null);

  const [when, setWhen] = useState<When>('upcoming');
  const [items, setItems] = useState<EventSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useAndroidBack(() => {
    if (view === 'form') {
      setView(editId ? 'detail' : 'list');
      return true;
    }
    if (view === 'detail') {
      setView('list');
      return true;
    }
    return false;
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await evApi.list(token, { when, search: search || undefined });
      setItems(res.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (view === 'list') load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, when]);

  const rows = useMemo<Row[]>(() => {
    const rs: Row[] = [{ kind: 'banner' }, { kind: 'search' }];
    if (loading || !!error || items.length === 0) rs.push({ kind: 'status' });
    items.forEach((event) => rs.push({ kind: 'event', event }));
    return rs;
  }, [items, loading, error]);

  if (view === 'detail' && selectedId != null) {
    return (
      <EventDetailScreen
        token={token}
        eventId={selectedId}
        onBack={() => setView('list')}
        onLogout={onLogout}
        onEdit={(id) => {
          setEditId(id);
          setView('form');
        }}
        profile={profile}
        onNavigate={onNavigate}
        unreadCount={unreadCount}
      />
    );
  }

  if (view === 'form') {
    return (
      <EventFormScreen
        token={token}
        eventId={editId}
        canOrg={canOrg}
        canKomunitas={canKomunitas}
        canAngkatan={canAngkatan}
        onBack={() => setView(editId ? 'detail' : 'list')}
        onSaved={() => {
          const wasCreate = editId == null;
          setEditId(null);
          setView('list');
          setNotice(
            wasCreate
              ? 'Event berhasil dibuat. Menunggu persetujuan Pengurus IA Lima sebelum tampil publik.'
              : 'Perubahan event berhasil disimpan.',
          );
        }}
        onLogout={onLogout}
        profile={profile}
        onNavigate={onNavigate}
        unreadCount={unreadCount}
      />
    );
  }

  return (
    <View style={styles.flex}>
      <Header title="Event" onLogout={onLogout} profile={profile} onNavigate={onNavigate} unreadCount={unreadCount} />
      {!!notice && <NoticeBanner message={notice} onDismiss={() => setNotice(null)} />}

      <View style={styles.segRow}>
        {([
          { key: 'upcoming', label: 'Akan Datang' },
          { key: 'past', label: 'Sudah Lewat' },
        ] as const).map((s) => (
          <Pressable
            key={s.key}
            style={[styles.seg, when === s.key && styles.segActive]}
            onPress={() => setWhen(s.key)}
          >
            <Text style={[styles.segText, when === s.key && styles.segTextActive]}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={rows}
        keyExtractor={(row, i) => (row.kind === 'event' ? String(row.event.id) : row.kind)}
        contentContainerStyle={styles.listContent}
        stickyHeaderIndices={[1]}
        renderItem={({ item }) => {
          if (item.kind === 'banner') {
            return <AdBanner placement="event_header" aspectRatio={16 / 9} onInternalLink={onInternalLink} />;
          }
          if (item.kind === 'search') {
            return (
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Cari event…"
                  placeholderTextColor={colors.muted}
                  value={search}
                  onChangeText={setSearch}
                  onSubmitEditing={load}
                  returnKeyType="search"
                />
                <Pressable style={({ pressed }) => [styles.searchBtn, pressed && styles.pressed]} onPress={load}>
                  <Text style={styles.searchBtnText}>Cari</Text>
                </Pressable>
              </View>
            );
          }
          if (item.kind === 'status') {
            return (
              <View style={styles.statusBox}>
                {loading && <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary} />}
                {!!error && <Text style={styles.error}>{error}</Text>}
                {!loading && !error && items.length === 0 && (
                  <Text style={styles.empty}>
                    {when === 'upcoming' ? 'Belum ada kegiatan akan datang.' : 'Belum ada kegiatan yang sudah lewat.'}
                  </Text>
                )}
              </View>
            );
          }
          return (
            <View style={styles.itemBox}>
              <EventListCard
                event={item.event}
                onPress={() => {
                  setSelectedId(item.event.id);
                  setView('detail');
                }}
              />
            </View>
          );
        }}
      />

      {canCreate && (
        <Pressable
          style={styles.fab}
          onPress={() => {
            setEditId(null);
            setView('form');
          }}
        >
          <Ionicons name="add" size={26} color={colors.white} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  segRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 46, paddingBottom: 4 },
  seg: { flex: 1, paddingVertical: 9, borderRadius: 20, backgroundColor: colors.bgAlt, alignItems: 'center' },
  segActive: { backgroundColor: colors.primary },
  segText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.muted },
  segTextActive: { color: colors.white },

  searchRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, gap: 8, backgroundColor: colors.bg },
  searchInput: {
    flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: fonts.body, color: colors.heading,
  },
  searchBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  searchBtnText: { color: colors.white, fontFamily: fonts.bodyMedium, fontSize: 13 },
  pressed: { opacity: 0.85 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40, fontFamily: fonts.body },
  error: { color: colors.danger, textAlign: 'center', marginTop: 14, fontFamily: fonts.bodyMedium },
  statusBox: { paddingHorizontal: 12 },
  listContent: { paddingBottom: 24, gap: 12 },
  itemBox: { paddingHorizontal: 12 },
  fab: {
    position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primaryDark, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
});
