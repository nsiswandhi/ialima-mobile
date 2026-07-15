// Create / edit an article. Mirrors EventFormScreen's field patterns
// (RichTextEditor + blocksToHtml seeding, expo-image-picker's array
// `mediaTypes` API). Two save actions: "Simpan Draft" persists without
// changing status; "Kirim untuk Review" (or "Publish" for IA Lima staff)
// persists then calls artikelApi.submit to move it out of draft.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, fonts } from '../theme';
import { artikelApi, ArtikelCategory, ArtikelDetail } from './api';
import RichTextEditor from '../RichTextEditor';
import { blocksToHtml } from '../Blocks';
import KeyboardAwareScroll from '../KeyboardAwareScroll';

type Props = {
  token: string;
  articleId: number | null;
  isIALima: boolean;
  onDone: () => void;
  onCancel: () => void;
};

export default function ArtikelFormScreen({ token, articleId, isIALima, onDone, onCancel }: Props) {
  const [loading, setLoading] = useState(!!articleId);
  const [saving, setSaving] = useState(false);
  const [id, setId] = useState<number | null>(articleId);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageId, setImageId] = useState(0);
  const [imageUploading, setImageUploading] = useState(false);
  const [categories, setCategories] = useState<ArtikelCategory[]>([]);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    artikelApi.listCategories(token).then((r) => setCategories(r.data)).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!articleId) return;
    let alive = true;
    artikelApi
      .detail(token, articleId)
      .then((d: ArtikelDetail) => {
        if (!alive) return;
        setTitle(d.title);
        setCategory(d.category);
        setContent(blocksToHtml(d.content));
        if (d.featured_image) setImageUrl(d.featured_image.full);
        setRejectReason(d.reject_reason);
      })
      .catch((e: any) => alive && setError(e.message || 'Gagal memuat artikel.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [token, articleId]);

  const pickImage = async () => {
    setImageUploading(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) throw new Error('Izin akses galeri ditolak.');
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (result.canceled || !result.assets?.length) return;
      const uploaded = await artikelApi.uploadImage(token, result.assets[0].uri);
      setImageUrl(uploaded.full);
      setImageId(uploaded.id);
    } catch (e: any) {
      Alert.alert('Upload gagal', e.message);
    } finally {
      setImageUploading(false);
    }
  };

  const persist = async () => {
    const fields: Record<string, unknown> = { title, category, content };
    if (imageId) fields.featured_image_id = imageId;
    if (id) {
      await artikelApi.update(token, id, fields);
      return id;
    }
    const created = await artikelApi.create(token, fields);
    setId(created.id);
    return created.id;
  };

  const saveDraft = async () => {
    if (!title.trim()) {
      setError('Judul wajib diisi.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await persist();
      onDone();
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    if (!title.trim() || !content.trim()) {
      setError('Judul dan konten wajib diisi.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const savedId = await persist();
      await artikelApi.submit(token, savedId);
      onDone();
    } catch (e: any) {
      setError(e.message || 'Gagal mengirim.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ActivityIndicator style={styles.loading} color={colors.primary} />;

  return (
    <KeyboardAwareScroll style={styles.container} contentContainerStyle={styles.content}>
      {!!rejectReason && (
        <View style={styles.rejectBanner}>
          <Text style={styles.rejectText}>Ditolak: {rejectReason}</Text>
        </View>
      )}
      <Text style={styles.label}>Judul</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Judul artikel"
        placeholderTextColor={colors.muted}
      />

      <Text style={styles.label}>Kategori</Text>
      <View style={styles.chipWrap}>
        {categories.map((c) => (
          <Pressable
            key={c.slug}
            style={[styles.chip, category === c.slug && styles.chipActive]}
            onPress={() => setCategory(c.slug)}
          >
            <Text style={[styles.chipText, category === c.slug && styles.chipTextActive]}>{c.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Featured Image</Text>
      <Pressable style={styles.imagePicker} onPress={pickImage} disabled={imageUploading}>
        {imageUploading ? (
          <ActivityIndicator color={colors.primary} />
        ) : imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.imagePreview} />
        ) : (
          <Text style={styles.imagePickerText}>Pilih Gambar</Text>
        )}
      </Pressable>

      <Text style={styles.label}>Konten</Text>
      <RichTextEditor
        defaultValue={content}
        onChangeHtml={setContent}
        onUploadImage={async (uri) => (await artikelApi.uploadImage(token, uri)).full}
        placeholder="Tulis artikel di sini..."
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.actions}>
        <Pressable style={[styles.actionBtn, styles.draftBtn]} onPress={saveDraft} disabled={saving}>
          <Text style={styles.draftBtnText}>Simpan Draft</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, styles.submitBtn]} onPress={submit} disabled={saving}>
          <Text style={styles.submitBtnText}>{isIALima ? 'Publish' : 'Kirim untuk Review'}</Text>
        </Pressable>
      </View>
      <Pressable onPress={onCancel} style={styles.cancelBtn}>
        <Text style={styles.cancelText}>Batal</Text>
      </Pressable>
    </KeyboardAwareScroll>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loading: { marginTop: 60 },
  content: { padding: 20, paddingBottom: 60 },
  rejectBanner: { backgroundColor: '#FDECEC', borderRadius: 10, padding: 12, marginBottom: 16 },
  rejectText: { fontFamily: fonts.body, fontSize: 12, color: '#B3261E' },
  label: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.heading, marginTop: 16, marginBottom: 8 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text },
  chipTextActive: { color: '#fff' },
  imagePicker: {
    height: 160,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imagePreview: { width: '100%', height: '100%' },
  imagePickerText: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  error: { color: '#B3261E', fontFamily: fonts.body, fontSize: 12, marginTop: 12 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  actionBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  draftBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  draftBtnText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
  submitBtn: { backgroundColor: colors.primary },
  submitBtnText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: '#fff' },
  cancelBtn: { marginTop: 14, alignItems: 'center' },
  cancelText: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
});
