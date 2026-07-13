import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { colors, fonts } from './theme';
import Header, { DrawerProfile, NavTarget } from './Header';
import KeyboardAwareScroll from './KeyboardAwareScroll';
import { BrandDetail, Item, mkApi } from './marketplace/api';
import { pickAndUpload } from './marketplace/pickAndUpload';

type Props = {
  token: string;
  brandId: number;
  onBack: () => void;
  onLogout: () => void;
  profile?: DrawerProfile;
  onNavigate?: (target: NavTarget) => void;
};

type Draft = {
  name: string; price: string; price_note: string; description: string; is_available: boolean;
  // imageId set only when a new photo is picked; imagePreview may show an existing
  // photo (edit) whose id we don't have, so we leave imageId null to keep it.
  imageId: number | null; imagePreview: string | null;
};
const emptyDraft = (): Draft => ({
  name: '', price: '', price_note: '', description: '', is_available: true, imageId: null, imagePreview: null,
});

// Manage a brand's items (products / services / menu rows). Add, edit, delete.
// Item photo upload is a follow-up (needs the image picker).
export default function ManageItemsScreen({ token, brandId, onBack, onLogout, profile, onNavigate }: Props) {
  const [brand, setBrand] = useState<BrandDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const b = await mkApi.detail(token, brandId);
      setBrand(b);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, brandId]);

  useEffect(() => {
    load();
  }, [load]);

  const itemLabel = brand?.type === 'service' ? 'Layanan' : brand?.type === 'place' ? 'Menu' : 'Produk';

  const openNew = () => {
    setDraft(emptyDraft());
    setEditingId('new');
  };

  const openEdit = (it: Item) => {
    setDraft({
      name: it.name,
      price: it.price != null ? String(it.price) : '',
      price_note: it.price_note,
      description: it.description,
      is_available: it.is_available,
      imageId: null,
      imagePreview: it.image?.full || null,
    });
    setEditingId(it.id);
  };

  const pickImage = async () => {
    setUploading(true);
    try {
      const img = await pickAndUpload(token, [1, 1]);
      if (img) {
        setDraft((d) => ({ ...d, imageId: img.id, imagePreview: img.full }));
      }
    } catch (e: any) {
      Alert.alert('Gagal unggah', e.message);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!draft.name.trim()) {
      Alert.alert('Lengkapi form', 'Nama item wajib diisi.');
      return;
    }
    setSaving(true);
    const fields: Record<string, unknown> = {
      name: draft.name.trim(),
      description: draft.description.trim(),
      price: draft.price.trim(), // backend strips non-digits; '' clears the price
      price_note: draft.price_note.trim(),
      is_available: draft.is_available,
    };
    if (draft.imageId != null) fields.image_id = draft.imageId;
    try {
      if (editingId === 'new') {
        await mkApi.createItem(token, brandId, fields);
      } else if (typeof editingId === 'number') {
        await mkApi.updateItem(token, brandId, editingId, fields);
      }
      setEditingId(null);
      await load();
    } catch (e: any) {
      if (e.code === 'quota_exceeded') {
        Alert.alert('Batas tercapai', `Paket ${e.tier || ''} dibatasi ${e.limit ?? ''} item per brand.`);
      } else {
        Alert.alert('Gagal menyimpan', e.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (it: Item) => {
    Alert.alert('Hapus item?', `"${it.name}" akan dihapus.`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await mkApi.removeItem(token, brandId, it.id);
            await load();
          } catch (e: any) {
            Alert.alert('Gagal', e.message);
          }
        },
      },
    ]);
  };

  // Item add/edit form view.
  if (editingId !== null) {
    return (
      <View style={styles.flex}>
        <Header title={editingId === 'new' ? `Tambah ${itemLabel}` : `Ubah ${itemLabel}`}
          onBack={() => setEditingId(null)} onLogout={onLogout} profile={profile} onNavigate={onNavigate} />
        <KeyboardAwareScroll contentContainerStyle={styles.formContent}>
          <Field label="Foto">
            <Pressable style={styles.photoPick} onPress={pickImage} disabled={uploading}>
              {uploading ? (
                <ActivityIndicator color={colors.primary} />
              ) : draft.imagePreview ? (
                <Image source={{ uri: draft.imagePreview }} style={styles.photoImg} />
              ) : (
                <Text style={styles.pickHint}>＋ Tambah Foto</Text>
              )}
            </Pressable>
          </Field>

          <Field label="Nama *">
            <TextInput style={styles.input} value={draft.name}
              onChangeText={(t) => setDraft((d) => ({ ...d, name: t }))}
              placeholder={`Nama ${itemLabel.toLowerCase()}`} placeholderTextColor={colors.muted} />
          </Field>

          <View style={styles.row}>
            <View style={{ flex: 2 }}>
              <Field label="Harga (Rp)">
                <TextInput style={styles.input} value={draft.price}
                  onChangeText={(t) => setDraft((d) => ({ ...d, price: t }))}
                  placeholder="Kosongkan = hubungi" placeholderTextColor={colors.muted} keyboardType="number-pad" />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Satuan">
                <TextInput style={styles.input} value={draft.price_note}
                  onChangeText={(t) => setDraft((d) => ({ ...d, price_note: t }))}
                  placeholder="/porsi" placeholderTextColor={colors.muted} />
              </Field>
            </View>
          </View>

          <Field label="Deskripsi">
            <TextInput style={[styles.input, styles.multiline]} value={draft.description}
              onChangeText={(t) => setDraft((d) => ({ ...d, description: t }))}
              placeholder="Deskripsi singkat" placeholderTextColor={colors.muted} multiline />
          </Field>

          <View style={styles.availRow}>
            <Text style={styles.label}>Tersedia</Text>
            <Switch value={draft.is_available}
              onValueChange={(v) => setDraft((d) => ({ ...d, is_available: v }))}
              trackColor={{ true: colors.primary, false: colors.border }} />
          </View>

          <Pressable style={[styles.saveBtn, (saving || uploading) && styles.disabled]} onPress={save}
            disabled={saving || uploading}>
            {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveBtnText}>Simpan</Text>}
          </Pressable>
        </KeyboardAwareScroll>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <Header title={brand ? `${itemLabel} — ${brand.name}` : 'Item'} onBack={onBack} onLogout={onLogout} profile={profile} onNavigate={onNavigate} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          <Pressable style={styles.createBtn} onPress={openNew}>
            <Text style={styles.createBtnText}>＋ Tambah {itemLabel}</Text>
          </Pressable>

          {brand && brand.items.length === 0 ? (
            <Text style={styles.empty}>Belum ada item. Tambahkan yang pertama.</Text>
          ) : (
            brand?.items.map((it) => (
              <View style={styles.card} key={it.id}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{it.name}</Text>
                  <Text style={styles.price}>
                    {it.price_display || 'Hubungi untuk harga'}
                    {!!it.price_note && <Text style={styles.note}> {it.price_note}</Text>}
                  </Text>
                  {!it.is_available && <Text style={styles.soldOut}>Habis</Text>}
                </View>
                <View style={styles.actions}>
                  <Pressable style={styles.actionBtn} onPress={() => openEdit(it)}>
                    <Text style={styles.actionText}>Ubah</Text>
                  </Pressable>
                  <Pressable style={styles.actionBtn} onPress={() => confirmDelete(it)}>
                    <Text style={[styles.actionText, { color: colors.danger }]}>Hapus</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: colors.danger, textAlign: 'center', marginTop: 40, fontFamily: fonts.bodyMedium },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 30, fontFamily: fonts.body },

  listContent: { padding: 12, paddingTop: 52 },
  formContent: { padding: 16, paddingTop: 52, paddingBottom: 48 },

  createBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginBottom: 14, borderWidth: 1.5, borderColor: colors.primary },
  createBtnText: { color: colors.primary, fontFamily: fonts.headingSemi, fontSize: 15 },

  card: {
    backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border,
  },
  name: { fontFamily: fonts.headingSemi, fontSize: 15, color: colors.heading },
  price: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.primary, marginTop: 3 },
  note: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  soldOut: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.danger, marginTop: 3 },
  actions: { alignItems: 'flex-end', gap: 6 },
  actionBtn: { paddingVertical: 4, paddingHorizontal: 6 },
  actionText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.primary },

  field: { marginTop: 14 },
  label: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.heading, marginBottom: 6 },
  input: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, fontFamily: fonts.body, color: colors.heading,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  photoPick: {
    width: 96, height: 96, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1,
    borderColor: colors.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  photoImg: { width: '100%', height: '100%' },
  pickHint: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.muted, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 12 },
  availRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },

  saveBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 28 },
  disabled: { opacity: 0.6 },
  saveBtnText: { color: colors.white, fontFamily: fonts.headingSemi, fontSize: 16 },
});
