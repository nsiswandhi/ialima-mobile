import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { BrandSummary, mkApi, TYPE_LABELS } from './api';

type Props = {
  token: string;
  viewerId: number;
  onCreate: () => void;
  onEdit: (id: number) => void;
  onItems: (id: number) => void;
};

// The owner's brand-management list, embedded in the My Profile "MARKETPLACE"
// section (replaces the old standalone "Brand Saya" screen). Lists the viewer's
// brands with Item / Ubah / Hapus actions and a "Buat Brand Baru" button.
export default function MyBrandsSection({ token, viewerId, onCreate, onEdit, onItems }: Props) {
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const confirmDelete = (b: BrandSummary) => {
    Alert.alert('Kamu yakin menghapus ini?', `"${b.name}" akan dihapus permanen.`, [
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
    <View>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <>
          {brands.length === 0 && (
            <Text style={styles.empty}>
              Belum punya brand. Buat brand untuk menjual produk, menawarkan jasa, atau menampilkan tempat usaha.
            </Text>
          )}

          {brands.map((item) => (
            <View style={styles.card} key={item.id}>
              <View style={styles.cardMain}>
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
              </View>
              <View style={styles.actions}>
                <Pressable style={styles.actionBtn} onPress={() => onItems(item.id)}>
                  <Text style={styles.actionText}>Item</Text>
                </Pressable>
                <Pressable style={styles.actionBtn} onPress={() => onEdit(item.id)}>
                  <Text style={styles.actionText}>Ubah</Text>
                </Pressable>
                <Pressable style={styles.actionBtn} onPress={() => confirmDelete(item)}>
                  <Text style={[styles.actionText, { color: colors.danger }]}>Hapus</Text>
                </Pressable>
              </View>
            </View>
          ))}

          <Pressable
            style={[styles.createBtn, brands.length >= 1 && styles.createBtnDisabled]}
            onPress={onCreate}
            disabled={brands.length >= 1}
          >
            <Text style={[styles.createBtnText, brands.length >= 1 && styles.createBtnTextDisabled]}>＋ Buat Brand Baru</Text>
          </Pressable>
          <View style={styles.limitAlert}>
            <Text style={styles.limitAlertText}>Akun kamu hanya boleh membuat 1 brand</Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, fontFamily: fonts.bodyMedium, marginVertical: 12 },
  empty: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted, lineHeight: 20, marginBottom: 12 },
  limitAlert: { backgroundColor: '#FAEEDA', borderRadius: 10, padding: 10, marginTop: 8 },
  limitAlertText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: '#854F0B', textAlign: 'center' },

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

  createBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 2, borderWidth: 1.5, borderColor: colors.primary },
  createBtnText: { color: colors.primary, fontFamily: fonts.headingSemi, fontSize: 15 },
  createBtnDisabled: { borderColor: colors.border, backgroundColor: colors.bgAlt },
  createBtnTextDisabled: { color: colors.muted },
});
