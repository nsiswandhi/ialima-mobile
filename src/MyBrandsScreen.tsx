import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, Pressable, StyleSheet, Text, View,
} from 'react-native';
import { colors, fonts } from './theme';
import Header from './Header';
import BrandFormScreen from './BrandFormScreen';
import ManageItemsScreen from './ManageItemsScreen';
import { BrandSummary, mkApi, TYPE_LABELS } from './marketplace/api';

type Props = {
  token: string;
  viewerId: number;
  onBack: () => void;
  onLogout: () => void;
  onOpenBrand: (id: number) => void;
};

// "Brand Saya" — the owner's manage entry. Lists brands the viewer owns and owns
// the create / edit / item-CRUD sub-navigation (kept local so the Marketplace
// container above stays unchanged).
type Sub =
  | { kind: 'list' }
  | { kind: 'create' }
  | { kind: 'edit'; id: number }
  | { kind: 'items'; id: number };

export default function MyBrandsScreen({ token, viewerId, onBack, onLogout, onOpenBrand }: Props) {
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sub, setSub] = useState<Sub>({ kind: 'list' });

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await mkApi.list(token, { owner: viewerId });
      setBrands(res.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, viewerId]);

  useEffect(() => {
    load();
  }, [load]);

  const backToList = () => setSub({ kind: 'list' });
  const savedThenList = () => {
    setSub({ kind: 'list' });
    load();
  };

  if (sub.kind === 'create') {
    return <BrandFormScreen token={token} onBack={backToList} onSaved={savedThenList} onLogout={onLogout} />;
  }
  if (sub.kind === 'edit') {
    return (
      <BrandFormScreen token={token} brandId={sub.id} onBack={backToList} onSaved={savedThenList} onLogout={onLogout} />
    );
  }
  if (sub.kind === 'items') {
    return <ManageItemsScreen token={token} brandId={sub.id} onBack={backToList} onLogout={onLogout} />;
  }

  const confirmDelete = (b: BrandSummary) => {
    Alert.alert('Hapus brand?', `"${b.name}" akan dihapus permanen.`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await mkApi.remove(token, b.id);
            load();
          } catch (e: any) {
            Alert.alert('Gagal', e.message);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.flex}>
      <Header title="Brand Saya" onBack={onBack} onLogout={onLogout} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : brands.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Belum punya brand</Text>
          <Text style={styles.emptyBody}>
            Buat brand untuk menjual produk, menawarkan jasa, atau menampilkan tempat usaha Anda.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={() => setSub({ kind: 'create' })}>
            <Text style={styles.primaryBtnText}>Buat Brand</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={brands}
          keyExtractor={(b) => String(b.id)}
          contentContainerStyle={{ padding: 12, paddingTop: 46 }}
          ListHeaderComponent={
            <Pressable style={styles.createBtn} onPress={() => setSub({ kind: 'create' })}>
              <Text style={styles.createBtnText}>＋ Buat Brand Baru</Text>
            </Pressable>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Pressable style={styles.cardMain} onPress={() => onOpenBrand(item.id)}>
                {item.logo?.thumbnail ? (
                  <Image source={{ uri: item.logo.thumbnail }} style={styles.logo} />
                ) : (
                  <View style={[styles.logo, styles.logoFallback]}>
                    <Text style={styles.logoLetter}>{item.name.charAt(0)}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  {!!item.type && <Text style={styles.metaLight}>{TYPE_LABELS[item.type]}</Text>}
                </View>
              </Pressable>
              <View style={styles.actions}>
                <Pressable style={styles.actionBtn} onPress={() => setSub({ kind: 'items', id: item.id })}>
                  <Text style={styles.actionText}>Item</Text>
                </Pressable>
                <Pressable style={styles.actionBtn} onPress={() => setSub({ kind: 'edit', id: item.id })}>
                  <Text style={styles.actionText}>Ubah</Text>
                </Pressable>
                <Pressable style={styles.actionBtn} onPress={() => confirmDelete(item)}>
                  <Text style={[styles.actionText, { color: colors.danger }]}>Hapus</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: colors.danger, textAlign: 'center', marginTop: 40, fontFamily: fonts.bodyMedium },

  emptyWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.heading, textAlign: 'center' },
  emptyBody: { fontFamily: fonts.body, fontSize: 14, color: colors.text, textAlign: 'center', marginTop: 8, lineHeight: 20 },

  primaryBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  primaryBtnText: { color: colors.white, fontFamily: fonts.headingSemi, fontSize: 16 },

  createBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginBottom: 12, borderWidth: 1.5, borderColor: colors.primary },
  createBtnText: { color: colors.primary, fontFamily: fonts.headingSemi, fontSize: 15 },

  card: { backgroundColor: colors.card, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  logo: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.bgAlt },
  logoFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondary },
  logoLetter: { fontFamily: fonts.heading, fontSize: 20, color: colors.white },
  name: { fontFamily: fonts.headingSemi, fontSize: 16, color: colors.heading },
  metaLight: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },

  actions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border },
  actionBtn: { flex: 1, paddingVertical: 11, alignItems: 'center' },
  actionText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.primary },
});
