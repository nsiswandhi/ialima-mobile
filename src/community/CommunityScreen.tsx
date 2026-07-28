// Community tab — searchable list of communities, drilling into detail, plus a
// create/edit form for managers. Mirrors MarketplaceScreen's local view routing.
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header, { DrawerProfile, NavTarget } from '../Header';
import { colors, fonts } from '../theme';
import { commApi, CommunitySummary } from './api';
import CommunityCard from './CommunityCard';
import CommunityDetailScreen from './CommunityDetailScreen';
import CommunityFormScreen from './CommunityFormScreen';
import NoticeBanner from '../NoticeBanner';
import { useAndroidBack } from '../useAndroidBack';
import AdBanner from '../ads/AdBanner';

type Props = {
  token: string;
  canManage?: boolean; // viewer holds ia5_manage_community
  onLogout: () => void;
  initialCommunityId?: number | null;
  profile?: DrawerProfile;
  onNavigate?: (target: NavTarget) => void;
  unreadCount?: number;
  onInternalLink: (type: string, id: number) => void;
};

type View3 = 'list' | 'detail' | 'form';

// Rows fed to the single FlatList below: banner (scrolls away) + search
// (sticky at index 1, pinned just under the header once it reaches the top)
// + status + 2-up community pairs. Mixing these means cards can't rely on
// FlatList's numColumns, so pairs are chunked manually.
type Row =
  | { kind: 'banner' }
  | { kind: 'search' }
  | { kind: 'status' }
  | { kind: 'pair'; items: CommunitySummary[] };

export default function CommunityScreen({ token, canManage, onLogout, initialCommunityId, profile, onNavigate, unreadCount, onInternalLink }: Props) {
  const [view, setView] = useState<View3>(initialCommunityId ? 'detail' : 'list');
  const [selectedId, setSelectedId] = useState<number | null>(initialCommunityId ?? null);
  const [editId, setEditId] = useState<number | null>(null);

  const [items, setItems] = useState<CommunitySummary[]>([]);
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
      const res = await commApi.list(token, { search: search || undefined });
      setItems(res.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (view === 'list') load();
  }, [view]);

  const rows = useMemo<Row[]>(() => {
    const rs: Row[] = [{ kind: 'banner' }, { kind: 'search' }];
    if (loading || !!error || items.length === 0) rs.push({ kind: 'status' });
    for (let i = 0; i < items.length; i += 2) rs.push({ kind: 'pair', items: items.slice(i, i + 2) });
    return rs;
  }, [items, loading, error]);

  if (view === 'detail' && selectedId != null) {
    return (
      <CommunityDetailScreen
        token={token}
        communityId={selectedId}
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
      <CommunityFormScreen
        token={token}
        communityId={editId}
        onBack={() => setView(editId ? 'detail' : 'list')}
        onSaved={() => {
          const wasCreate = editId == null;
          setEditId(null);
          setView('list');
          setNotice(
            wasCreate
              ? 'Komunitas berhasil dibuat. Menunggu persetujuan Pengurus IA Lima sebelum tampil publik.'
              : 'Perubahan komunitas berhasil disimpan.',
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
      <Header title="Komunitas" onLogout={onLogout} profile={profile} onNavigate={onNavigate} unreadCount={unreadCount} />
      {!!notice && <NoticeBanner message={notice} onDismiss={() => setNotice(null)} />}

      <FlatList
        data={rows}
        keyExtractor={(row, i) => (row.kind === 'pair' ? `pair-${row.items[0]?.id ?? i}` : row.kind)}
        contentContainerStyle={styles.listContent}
        stickyHeaderIndices={[1]}
        onRefresh={load}
        refreshing={loading}
        renderItem={({ item }) => {
          if (item.kind === 'banner') {
            return <AdBanner placement="komunitas_header" aspectRatio={16 / 9} onInternalLink={onInternalLink} />;
          }
          if (item.kind === 'search') {
            return (
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Cari komunitas…"
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
                {!loading && !error && items.length === 0 && <Text style={styles.empty}>Belum ada komunitas.</Text>}
              </View>
            );
          }
          return (
            <View style={styles.row}>
              {item.items.map((c) => (
                <CommunityCard
                  key={c.id}
                  community={c}
                  style={styles.gridItem}
                  onPress={() => {
                    setSelectedId(c.id);
                    setView('detail');
                  }}
                />
              ))}
            </View>
          );
        }}
      />

      {canManage && (
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
  listContent: { paddingBottom: 32, gap: 12 },
  row: { flexDirection: 'row', gap: 12, paddingHorizontal: 12 },
  gridItem: { flex: 1, maxWidth: '48%' },
  fab: {
    position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primaryDark, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
});
