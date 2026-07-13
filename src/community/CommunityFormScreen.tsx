// Create / edit a community (managers only). Mirrors BrandFormScreen: text
// fields + a logo/cover pick-and-upload via commApi.uploadImage.
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Header, { DrawerProfile, NavTarget } from '../Header';
import KeyboardAwareScroll from '../KeyboardAwareScroll';
import { colors, fonts } from '../theme';
import { commApi, CommunityDetail } from './api';

type Props = {
  token: string;
  communityId?: number | null; // null/undefined = create
  onBack: () => void;
  onSaved: (id: number) => void;
  onLogout: () => void;
  profile?: DrawerProfile;
  onNavigate?: (target: NavTarget) => void;
};

export default function CommunityFormScreen({ token, communityId, onBack, onSaved, onLogout, profile, onNavigate }: Props) {
  const editing = !!communityId;
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [logo, setLogo] = useState<{ id: number; full: string } | null>(null);
  const [cover, setCover] = useState<{ id: number; full: string } | null>(null);

  useEffect(() => {
    if (!editing) return;
    let alive = true;
    commApi
      .detail(token, communityId!)
      .then((d: CommunityDetail) => {
        if (!alive) return;
        setName(d.name);
        setDescription(d.description);
        setCategory(d.category);
        setCity(d.city);
        if (d.logo?.full) setLogo({ id: 0, full: d.logo.full });
        if (d.cover?.full) setCover({ id: 0, full: d.cover.full });
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [communityId]);

  async function pick(kind: 'logo' | 'cover') {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) throw new Error('Izin akses galeri ditolak.');
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: kind === 'cover' ? [16, 9] : [1, 1],
        quality: 0.8,
      });
      if (res.canceled || !res.assets?.length) return;
      const up = await commApi.uploadImage(token, res.assets[0].uri);
      if (kind === 'logo') setLogo({ id: up.id, full: up.full });
      else setCover({ id: up.id, full: up.full });
    } catch (e: any) {
      Alert.alert('Upload gagal', e.message);
    }
  }

  async function save() {
    if (name.trim() === '') {
      setError('Nama komunitas wajib diisi.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const fields: Record<string, unknown> = { name, description, category, city };
      if (logo && logo.id) fields.logo_id = logo.id;
      if (cover && cover.id) fields.cover_id = cover.id;
      const saved = editing
        ? await commApi.update(token, communityId!, fields)
        : await commApi.create(token, fields);
      onSaved(saved.id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.flex}>
        <Header title="Komunitas" onBack={onBack} onLogout={onLogout} profile={profile} onNavigate={onNavigate} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <Header title={editing ? 'Edit Komunitas' : 'Komunitas Baru'} onBack={onBack} onLogout={onLogout} profile={profile} onNavigate={onNavigate} />
      <KeyboardAwareScroll style={styles.flex} contentContainerStyle={styles.content}>
        <Text style={styles.label}>Nama *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nama komunitas" placeholderTextColor={colors.muted} />

        <Text style={styles.label}>Kategori</Text>
        <TextInput style={styles.input} value={category} onChangeText={setCategory} placeholder="mis. olahraga" placeholderTextColor={colors.muted} autoCapitalize="none" />

        <Text style={styles.label}>Kota</Text>
        <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="Kota" placeholderTextColor={colors.muted} />

        <Text style={styles.label}>Deskripsi</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Tentang komunitas ini…"
          placeholderTextColor={colors.muted}
          multiline
        />

        <View style={styles.imgRow}>
          <ImagePick label="Logo" img={logo?.full} onPress={() => pick('logo')} />
          <ImagePick label="Sampul" img={cover?.full} onPress={() => pick('cover')} wide />
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]} disabled={saving} onPress={save}>
          <Text style={styles.saveText}>{saving ? 'Menyimpan…' : editing ? 'Simpan Perubahan' : 'Buat Komunitas'}</Text>
        </Pressable>
      </KeyboardAwareScroll>
    </View>
  );
}

function ImagePick({ label, img, onPress, wide }: { label: string; img?: string; onPress: () => void; wide?: boolean }) {
  return (
    <Pressable style={[styles.imgPick, wide && styles.imgPickWide]} onPress={onPress}>
      {img ? (
        <Image source={{ uri: img }} style={styles.imgPreview} />
      ) : (
        <Text style={styles.imgPickText}>+ {label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 48 },
  label: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.heading, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: fonts.body, color: colors.heading,
  },
  textarea: { height: 110, textAlignVertical: 'top' },
  imgRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  imgPick: {
    width: 90, height: 90, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, overflow: 'hidden',
  },
  imgPickWide: { flex: 1 },
  imgPickText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.muted },
  imgPreview: { width: '100%', height: '100%' },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  pressed: { opacity: 0.85 },
  saveText: { fontFamily: fonts.headingSemi, fontSize: 16, color: colors.white },
  error: { color: colors.danger, textAlign: 'center', marginTop: 14, fontFamily: fonts.bodyMedium },
});
