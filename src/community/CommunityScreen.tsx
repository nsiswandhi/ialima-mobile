// Community tab — searchable list of communities, drilling into detail, plus a
// create/edit form for managers. Mirrors MarketplaceScreen's local view routing.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header, { DrawerProfile, NavTarget } from '../Header';
import { colors, fonts } from '../theme';
import { commApi, CommunitySummary } from './api';
import CommunityCard from './CommunityCard';
import CommunityDetailScreen from './CommunityDetailScreen';
import CommunityFormScreen from './CommunityFormScreen';

type Props = {
  token: string;
  canManage?: boolean; // viewer holds ia5_manage_community
  onLogout: () => void;
  initialCommunityId?: number | null;
  profile?: DrawerProfile;
  onNavigate?: (target: NavTarget) => void;
};

type View3 = 'list' | 'detail' | 'form';

export default function CommunityScreen({ token, canManage, onLogout, initialCommunityId, profile, onNavigate }: Props) {
  const [view, setView] = useState<View3>(initialCommunityId ? 'detail' : 'list');
  const [selectedId, setSelectedId] = useState<number | null>(initialCommunityId ?? null);
  const [editId, setEditId] = useState<number | null>(null);

  const [items, setItems] = useState<CommunitySummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      />
    );
  }

  if (view === 'form') {
    return (
      <CommunityFormScreen
        token={token}
        communityId={editId}
        onBack={() => setView(editId ? 'detail' : 'list')}
        onSaved={(id) => {
          setSelectedId(id);
          setEditId(null);
          setView('detail');
        }}
        onLogout={onLogout}
        profile={profile}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <View style={styles.flex}>
      <Header title="Komunitas" onLogout={onLogout} profile={profile} onNavigate={onNavigate} />

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

      {loading && <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary} />}
      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={items}
        keyExtractor={(c) => String(c.id)}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.grid}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>Belum ada komunitas.</Text> : null}
        renderItem={({ item }) => (
          <CommunityCard
            community={item}
            style={styles.gridItem}
            onPress={() => {
              setSelectedId(item.id);
              setView('detail');
            }}
          />
        )}
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
  searchRow: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 46, paddingBottom: 12, gap: 8, alignItems: 'center' },
  searchInput: {
    flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, fontFamily: fonts.body, color: colors.heading,
  },
  searchBtn: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18 },
  searchBtnText: { color: colors.white, fontFamily: fonts.headingSemi, fontSize: 15 },
  pressed: { opacity: 0.85 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40, fontFamily: fonts.body },
  error: { color: colors.danger, textAlign: 'center', marginTop: 14, fontFamily: fonts.bodyMedium },
  grid: { padding: 12, gap: 12 },
  column: { gap: 12 },
  gridItem: { flex: 1, maxWidth: '48%' },
  fab: {
    position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primaryDark, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
});
