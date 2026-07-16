import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from './theme';
import Header, { DrawerProfile, NavTarget } from './Header';
import BrandDetailScreen from './BrandDetailScreen';
import BrandCard from './marketplace/BrandCard';
import { BrandSummary, BrandType, mkApi, TYPE_LABELS } from './marketplace/api';
import { useAndroidBack } from './useAndroidBack';

type Props = {
  token: string;
  viewerId: number;
  onLogout: () => void;
  initialBrandId?: number | null; // deep-link straight to a brand (e.g. from Dashboard)
  canManage?: boolean;
  profile?: DrawerProfile;
  onNavigate?: (target: NavTarget) => void;
};

type Filter = 'all' | BrandType;
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'product', label: TYPE_LABELS.product },
  { key: 'service', label: TYPE_LABELS.service },
  { key: 'place', label: TYPE_LABELS.place },
];

// Marketplace directory: 2-column brand grid with type filter + search, and the
// brand detail page. Brand management now lives in My Profile, so there is no
// "Brand Saya" entry here anymore.
export default function MarketplaceScreen({ token, viewerId, onLogout, initialBrandId, canManage, profile, onNavigate }: Props) {
  const [view, setView] = useState<'list' | 'detail'>(initialBrandId ? 'detail' : 'list');
  const [selectedId, setSelectedId] = useState<number | null>(initialBrandId ?? null);

  const [filter, setFilter] = useState<Filter>('all');
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
    async (f: Filter, q: string) => {
      setError(null);
      setLoading(true);
      try {
        const res = await mkApi.list(token, {
          type: f === 'all' ? undefined : f,
          search: q || undefined,
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
    if (view === 'list') load(filter, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, view]);

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
      />
    );
  }

  return (
    <View style={styles.flex}>
      <Header title="Marketplace" onLogout={onLogout} profile={profile} onNavigate={onNavigate} />

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

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Cari brand…"
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => load(filter, search)}
          returnKeyType="search"
        />
        <Pressable style={styles.searchBtn} onPress={() => load(filter, search)}>
          <Text style={styles.searchBtnText}>Cari</Text>
        </Pressable>
      </View>

      {loading && <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary} />}
      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={brands}
        keyExtractor={(b) => String(b.id)}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.grid}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>Belum ada brand.</Text> : null}
        renderItem={({ item }) => (
          <BrandCard
            brand={item}
            style={styles.gridItem}
            onPress={() => {
              setSelectedId(item.id);
              setView('detail');
            }}
          />
        )}
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

  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 46, paddingBottom: 4 },
  filterTab: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, backgroundColor: colors.bgAlt },
  filterTabActive: { backgroundColor: colors.primary },
  filterLabel: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.muted },
  filterLabelActive: { color: colors.white },

  searchRow: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4, gap: 8, alignItems: 'center' },
  searchInput: {
    flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, fontFamily: fonts.body, color: colors.heading,
  },
  searchBtn: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18 },
  searchBtnText: { color: colors.white, fontFamily: fonts.headingSemi, fontSize: 15 },

  grid: { padding: 12, gap: 12 },
  column: { gap: 12 },
  gridItem: { flex: 1, maxWidth: '48%' },
  fab: {
    position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primaryDark, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
});
