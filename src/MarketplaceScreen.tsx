import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { colors, fonts } from './theme';
import Header from './Header';
import BrandDetailScreen from './BrandDetailScreen';
import MyBrandsScreen from './MyBrandsScreen';
import { BrandSummary, BrandType, mkApi, TYPE_LABELS } from './marketplace/api';

type Props = {
  token: string;
  viewerId: number;
  canManage: boolean; // viewer holds ia5_manage_own_brand (member+)
  onLogout: () => void;
};

type Filter = 'all' | BrandType;
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'product', label: TYPE_LABELS.product },
  { key: 'service', label: TYPE_LABELS.service },
  { key: 'place', label: TYPE_LABELS.place },
];

// Marketplace root. Owns the browse directory and internal navigation to the
// brand detail page and the "Brand Saya" manage flow (keeps App.tsx unchanged
// beyond adding the tab).
export default function MarketplaceScreen({ token, viewerId, canManage, onLogout }: Props) {
  const [view, setView] = useState<'list' | 'detail' | 'mybrands'>('list');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        onManage={() => setView('mybrands')}
      />
    );
  }

  if (view === 'mybrands') {
    return (
      <MyBrandsScreen
        token={token}
        viewerId={viewerId}
        onBack={() => {
          setView('list');
          load(filter, search);
        }}
        onLogout={onLogout}
        onOpenBrand={(id) => {
          setSelectedId(id);
          setView('detail');
        }}
      />
    );
  }

  return (
    <View style={styles.flex}>
      <Header title="Marketplace" onLogout={onLogout} />

      {/* Type filter tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterLabel, filter === f.key && styles.filterLabelActive]}>
              {f.label}
            </Text>
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

      {canManage && (
        <Pressable style={styles.myBrandsLink} onPress={() => setView('mybrands')}>
          <Text style={styles.myBrandsText}>＋ Brand Saya</Text>
        </Pressable>
      )}

      {loading && <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary} />}
      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={brands}
        keyExtractor={(b) => String(b.id)}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>Belum ada brand.</Text> : null}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => {
              setSelectedId(item.id);
              setView('detail');
            }}
          >
            {item.logo?.thumbnail ? (
              <Image source={{ uri: item.logo.thumbnail }} style={styles.logo} />
            ) : (
              <View style={[styles.logo, styles.logoFallback]}>
                <Text style={styles.logoLetter}>{item.name.charAt(0)}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <View style={styles.metaRow}>
                {!!item.type && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{TYPE_LABELS[item.type]}</Text>
                  </View>
                )}
                {!!item.city && <Text style={styles.metaLight}>{item.city}</Text>}
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        )}
      />
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

  searchRow: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 10, gap: 8, alignItems: 'center' },
  searchInput: {
    flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, fontFamily: fonts.body, color: colors.heading,
  },
  searchBtn: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18 },
  searchBtnText: { color: colors.white, fontFamily: fonts.headingSemi, fontSize: 15 },

  myBrandsLink: { paddingHorizontal: 16, paddingTop: 12 },
  myBrandsText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.primary },

  card: {
    backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.primaryDark, shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  cardPressed: { backgroundColor: colors.bgAlt },
  logo: { width: 54, height: 54, borderRadius: 12, backgroundColor: colors.bgAlt },
  logoFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondary },
  logoLetter: { fontFamily: fonts.heading, fontSize: 22, color: colors.white },
  name: { fontFamily: fonts.headingSemi, fontSize: 16, color: colors.heading },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  metaLight: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  badge: { backgroundColor: colors.bgAlt, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.primary },
  chevron: { fontFamily: fonts.heading, fontSize: 24, color: colors.muted, marginLeft: 4 },
});
