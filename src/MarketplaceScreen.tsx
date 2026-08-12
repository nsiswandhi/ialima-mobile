import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from './theme';
import Header, { DrawerProfile, NavTarget } from './Header';
import BrandDetailScreen from './BrandDetailScreen';
import BrandCard from './marketplace/BrandCard';
import { BrandSort, BrandSummary, BrandType, mkApi, TYPE_LABELS } from './marketplace/api';
import { useAndroidBack } from './useAndroidBack';
import AdBanner from './ads/AdBanner';

type Props = {
  token: string;
  viewerId: number;
  onLogout: () => void;
  initialBrandId?: number | null; // deep-link straight to a brand (e.g. from Dashboard)
  canManage?: boolean;
  profile?: DrawerProfile;
  onNavigate?: (target: NavTarget) => void;
  unreadCount?: number;
  onInternalLink: (type: string, id: number) => void;
};

type Filter = 'all' | BrandType;
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'product', label: TYPE_LABELS.product },
  { key: 'service', label: TYPE_LABELS.service },
  { key: 'place', label: TYPE_LABELS.place },
];

const SORT_OPTIONS: { key: BrandSort; label: string }[] = [
  { key: 'date', label: 'Terbaru' },
  { key: 'populer', label: 'Populer' },
  { key: 'rating', label: 'Rating Tertinggi' },
];

// Rows fed to the single FlatList below: banner (scrolls away) + search
// (sticky at index 1, pinned just under the header once it reaches the top)
// + status + 2-up brand pairs. Mixing these means brands can't rely on
// FlatList's numColumns, so pairs are chunked manually.
type Row =
  | { kind: 'banner' }
  | { kind: 'search' }
  | { kind: 'status' }
  | { kind: 'pair'; brands: BrandSummary[] };

// Marketplace directory: 2-column brand grid with type filter + search, and the
// brand detail page. Brand management now lives in My Profile, so there is no
// "Brand Saya" entry here anymore.
export default function MarketplaceScreen({ token, viewerId, onLogout, initialBrandId, canManage, profile, onNavigate, unreadCount, onInternalLink }: Props) {
  const [view, setView] = useState<'list' | 'detail'>(initialBrandId ? 'detail' : 'list');
  const [selectedId, setSelectedId] = useState<number | null>(initialBrandId ?? null);

  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<BrandSort>('date');
  const [search, setSearch] = useState('');
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useAndroidBack(() => {
    if (view === 'detail') {
      setView('list');
      return true;
    }
    return false;
  });

  const load = useCallback(
    async (f: Filter, q: string, s: BrandSort) => {
      setError(null);
      setLoading(true);
      try {
        const res = await mkApi.list(token, {
          type: f === 'all' ? undefined : f,
          search: q || undefined,
          sort: s,
        });
        setBrands(res.data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (view === 'list') load(filter, search, sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, sort, view]);

  const rows = useMemo<Row[]>(() => {
    const items: Row[] = [{ kind: 'banner' }, { kind: 'search' }];
    if (loading || !!error || brands.length === 0) items.push({ kind: 'status' });
    for (let i = 0; i < brands.length; i += 2) items.push({ kind: 'pair', brands: brands.slice(i, i + 2) });
    return items;
  }, [brands, loading, error]);

  if (view === 'detail' && selectedId !== null) {
    return (
      <BrandDetailScreen
        brandId={selectedId}
        token={token}
        viewerId={viewerId}
        onBack={() => setView('list')}
        onLogout={onLogout}
        profile={profile}
        onNavigate={onNavigate}
        unreadCount={unreadCount}
      />
    );
  }

  return (
    <View style={styles.flex}>
      <Header title="Marketplace" onLogout={onLogout} profile={profile} onNavigate={onNavigate} unreadCount={unreadCount} />

      {/* Type filter tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterLabel, filter === f.key && styles.filterLabelActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Sort row */}
      <View style={styles.sortRow}>
        {SORT_OPTIONS.map((s) => (
          <Pressable
            key={s.key}
            style={[styles.filterTab, sort === s.key && styles.filterTabActive]}
            onPress={() => setSort(s.key)}
          >
            <Text style={[styles.filterLabel, sort === s.key && styles.filterLabelActive]}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={rows}
        keyExtractor={(row, i) => (row.kind === 'pair' ? `pair-${row.brands[0]?.id ?? i}` : row.kind)}
        contentContainerStyle={styles.listContent}
        stickyHeaderIndices={[1]}
        onRefresh={() => load(filter, search, sort)}
        refreshing={loading}
        renderItem={({ item }) => {
          if (item.kind === 'banner') {
            return <AdBanner placement="marketplace_header" aspectRatio={16 / 9} onInternalLink={onInternalLink} />;
          }
          if (item.kind === 'search') {
            return (
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Cari brand…"
                  placeholderTextColor={colors.muted}
                  value={search}
                  onChangeText={setSearch}
                  onSubmitEditing={() => load(filter, search, sort)}
                  returnKeyType="search"
                />
                <Pressable style={styles.searchBtn} onPress={() => load(filter, search, sort)}>
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
                {!loading && !error && brands.length === 0 && <Text style={styles.empty}>Belum ada brand.</Text>}
              </View>
            );
          }
          return (
            <View style={styles.row}>
              {item.brands.map((b) => (
                <BrandCard
                  key={b.id}
                  brand={b}
                  style={styles.gridItem}
                  token={token}
                  showReport
                  onPress={() => {
                    setSelectedId(b.id);
                    setView('detail');
                  }}
                />
              ))}
            </View>
          );
        }}
      />

      {!!canManage && (
        <Pressable style={styles.fab} onPress={() => onNavigate?.('my-marketplace')}>
          <Ionicons name="add" size={26} color={colors.white} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  error: { color: colors.danger, textAlign: 'center', marginTop: 16, fontFamily: fonts.bodyMedium },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40, fontFamily: fonts.body },
  statusBox: { paddingHorizontal: 12 },

  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 46, paddingBottom: 4 },
  sortRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 8 },
  filterTab: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, backgroundColor: colors.bgAlt },
  filterTabActive: { backgroundColor: colors.primary },
  filterLabel: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.muted },
  filterLabelActive: { color: colors.white },

  searchRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, gap: 8,
    backgroundColor: colors.bg,
  },
  searchInput: {
    flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: fonts.body, color: colors.heading,
  },
  searchBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  searchBtnText: { color: colors.white, fontFamily: fonts.bodyMedium, fontSize: 13 },

  listContent: { paddingBottom: 32, gap: 12 },
  row: { flexDirection: 'row', gap: 12, paddingHorizontal: 12 },
  gridItem: { flex: 1, maxWidth: '48%' },
  fab: {
    position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primaryDark, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
});
