// Artikel tab — search + category filter popover + feed + FAB, plus local
// list/detail/form view routing. Mirrors EventScreen's local view routing.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';
import { artikelApi, ArtikelCategory, ArtikelSummary } from './api';
import ArtikelCard from './ArtikelCard';
import ArtikelCategoryModal from './ArtikelCategoryModal';
import ArtikelDetailScreen from './ArtikelDetailScreen';
import ArtikelFormScreen from './ArtikelFormScreen';
import { useAndroidBack } from '../useAndroidBack';
import AdBanner from '../ads/AdBanner';

type View3 = 'list' | 'detail' | 'form';

type Props = {
  token: string;
  canCreate: boolean;
  isIALima: boolean;
  initialArtikelId?: number | null;
  onInternalLink: (type: string, id: number) => void;
};

// Rows fed to the single FlatList below: banner (scrolls away) + search
// (sticky at index 1, pinned just under the header once it reaches the top)
// + status + individual articles.
type Row =
  | { kind: 'banner' }
  | { kind: 'search' }
  | { kind: 'status' }
  | { kind: 'article'; article: ArtikelSummary };

export default function ArtikelScreen({ token, canCreate, isIALima, initialArtikelId, onInternalLink }: Props) {
  const [view, setView] = useState<View3>('list');
  const [articles, setArticles] = useState<ArtikelSummary[]>([]);
  const [categories, setCategories] = useState<ArtikelCategory[]>([]);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      artikelApi.list(token, { category: category || undefined, search: search || undefined }),
      artikelApi.listCategories(token),
    ])
      .then(([list, cats]) => {
        setArticles(list.data.filter((a) => a.category !== 'uncategorized'));
        setCategories(cats.data);
      })
      .finally(() => setLoading(false));
  }, [token, category, search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (initialArtikelId) { setActiveId(initialArtikelId); setView('detail'); }
  }, [initialArtikelId]);

  useAndroidBack(() => {
    if (view === 'form') {
      setView(activeId ? 'detail' : 'list');
      return true;
    }
    if (view === 'detail') {
      setView('list');
      return true;
    }
    return false;
  });

  const rows = useMemo<Row[]>(() => {
    const rs: Row[] = [{ kind: 'banner' }, { kind: 'search' }];
    if (loading || articles.length === 0) rs.push({ kind: 'status' });
    articles.forEach((article) => rs.push({ kind: 'article', article }));
    return rs;
  }, [articles, loading]);

  if (view === 'detail' && activeId) {
    return (
      <ArtikelDetailScreen
        token={token}
        articleId={activeId}
        onBack={() => { setView('list'); load(); }}
        onEdit={() => setView('form')}
      />
    );
  }
  if (view === 'form') {
    return (
      <ArtikelFormScreen
        token={token}
        articleId={activeId}
        isIALima={isIALima}
        onDone={() => { setActiveId(null); setView('list'); load(); }}
        onCancel={() => setView(activeId ? 'detail' : 'list')}
      />
    );
  }

  return (
    <View style={styles.container}>
      <ArtikelCategoryModal
        visible={filterOpen}
        categories={categories}
        selected={category}
        onSelect={setCategory}
        onClose={() => setFilterOpen(false)}
      />
      <FlatList
        data={rows}
        keyExtractor={(row, i) => (row.kind === 'article' ? String(row.article.id) : row.kind)}
        contentContainerStyle={styles.list}
        stickyHeaderIndices={[1]}
        onRefresh={load}
        refreshing={loading}
        renderItem={({ item }) => {
          if (item.kind === 'banner') {
            return <AdBanner placement="artikel_header" aspectRatio={16 / 9} onInternalLink={onInternalLink} />;
          }
          if (item.kind === 'search') {
            return (
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Cari artikel..."
                  placeholderTextColor={colors.muted}
                  value={search}
                  onChangeText={setSearch}
                  onSubmitEditing={load}
                  returnKeyType="search"
                />
                <Pressable style={({ pressed }) => [styles.searchBtn, pressed && styles.pressed]} onPress={load}>
                  <Text style={styles.searchBtnText}>Cari</Text>
                </Pressable>
                <Pressable style={({ pressed }) => [styles.filterBtn, pressed && styles.pressed]} onPress={() => setFilterOpen(true)}>
                  <Ionicons name="filter" size={18} color={colors.white} />
                </Pressable>
              </View>
            );
          }
          if (item.kind === 'status') {
            return (
              <View style={styles.statusBox}>
                {loading ? (
                  <ActivityIndicator style={styles.loading} color={colors.primary} />
                ) : (
                  articles.length === 0 && <Text style={styles.empty}>Belum ada artikel.</Text>
                )}
              </View>
            );
          }
          return (
            <View style={styles.itemBox}>
              <ArtikelCard article={item.article} onPress={() => { setActiveId(item.article.id); setView('detail'); }} />
            </View>
          );
        }}
      />
      {canCreate && (
        <Pressable style={styles.fab} onPress={() => { setActiveId(null); setView('form'); }}>
          <Ionicons name="add" size={26} color={colors.white} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  searchRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, gap: 8, backgroundColor: colors.bg },
  searchInput: { flex: 1, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 10, fontFamily: fonts.body, fontSize: 14, color: colors.heading },
  searchBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  searchBtnText: { color: colors.white, fontFamily: fonts.bodyMedium, fontSize: 13 },
  filterBtn: { backgroundColor: colors.primary, borderRadius: 12, width: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.85 },
  loading: { marginTop: 40 },
  statusBox: { paddingHorizontal: 16 },
  itemBox: { paddingHorizontal: 16 },
  list: { paddingBottom: 100, gap: 16 },
  empty: { textAlign: 'center', color: colors.muted, fontFamily: fonts.body, marginTop: 40 },
  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primaryDark, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
});
