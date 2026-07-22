// Create / edit a community. Mirrors BrandFormScreen's field patterns: plain
// text inputs (WYSIWYG fields are sanitized server-side via wp_kses_post, no
// rich-text editor here), a platform-style picker for informasi_kontak, and a
// gallery grid upload for image_gallery.
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Header, { DrawerProfile, NavTarget } from '../Header';
import KeyboardAwareScroll from '../KeyboardAwareScroll';
import RichTextEditor from '../RichTextEditor';
import { blocksToHtml } from '../Blocks';
import { colors, fonts } from '../theme';
import {
  ActivityRow, commApi, CommunityDetail, CommunityType, ContactRow, CONTACT_CHANNELS, HARI_LABELS,
} from './api';

type Props = {
  token: string;
  communityId?: number | null; // null/undefined = create
  onBack: () => void;
  onSaved: (id: number) => void;
  onLogout: () => void;
  profile?: DrawerProfile;
  onNavigate?: (target: NavTarget) => void;
  unreadCount?: number;
};

const STATUS_KOMUNITAS = ['Aktif dan Berbadan Hukum', 'Aktif', 'Tidak Aktif', 'Dalam Pembentukan'];
const STATUS_KEANGGOTAAN = [
  'Terbuka Untuk Alumni dan Umum', 'Untuk Alumni Lima', 'Terbatas Untuk Profesi', 'Berdasarkan Undangan',
];

export default function CommunityFormScreen({ token, communityId, onBack, onSaved, onLogout, profile, onNavigate, unreadCount }: Props) {
  const editing = !!communityId;
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [types, setTypes] = useState<CommunityType[]>([]);
  const [communityType, setCommunityType] = useState('');
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [logo, setLogo] = useState<{ id: number; full: string } | null>(null);
  const [cover, setCover] = useState<{ id: number; full: string } | null>(null);
  const [uploading, setUploading] = useState<null | 'logo' | 'cover'>(null);

  const [introduction, setIntroduction] = useState('');
  const [tentangKami, setTentangKami] = useState('');
  const [berdiriSejak, setBerdiriSejak] = useState('');
  const [statusKomunitas, setStatusKomunitas] = useState('Aktif');
  const [statusKeanggotaan, setStatusKeanggotaan] = useState('Terbuka Untuk Alumni dan Umum');
  const [syaratBergabung, setSyaratBergabung] = useState('');
  const [caraBergabung, setCaraBergabung] = useState('');

  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [contactPickerOpen, setContactPickerOpen] = useState(false);

  const [activities, setActivities] = useState<ActivityRow[]>([]);

  const [galleryIds, setGalleryIds] = useState<number[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [galleryUploading, setGalleryUploading] = useState(false);

  useEffect(() => {
    commApi.listTypes(token).then((r) => setTypes(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!editing) return;
    let alive = true;
    commApi
      .detail(token, communityId!)
      .then((d: CommunityDetail) => {
        if (!alive) return;
        setName(d.name);
        setCommunityType(d.community_type);
        if (d.logo?.full) setLogo({ id: 0, full: d.logo.full });
        if (d.cover?.full) setCover({ id: 0, full: d.cover.full });
        setIntroduction(d.introduction);
        setBerdiriSejak(d.berdiri_sejak);
        setStatusKomunitas(d.status_komunitas);
        setStatusKeanggotaan(d.status_keanggotaan);
        setContacts(d.informasi_kontak);
        setActivities(d.kegiatan_rutin);
        setGalleryIds(d.image_gallery.map((g) => g.id));
        setGalleryPreviews(d.image_gallery.map((g) => g.thumbnail || g.full));
        // WYSIWYG fields arrive as blocks; re-editing as plain text collapses
        // formatting to its plain-text runs, which the user can re-type if needed.
        setTentangKami(blocksToHtml(d.tentang_kami));
        setSyaratBergabung(blocksToHtml(d.syarat_bergabung));
        setCaraBergabung(blocksToHtml(d.cara_bergabung));
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [communityId]);

  async function pick(kind: 'logo' | 'cover') {
    setUploading(kind);
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
    } finally {
      setUploading(null);
    }
  }

  async function pickGallery() {
    setGalleryUploading(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) throw new Error('Izin akses galeri ditolak.');
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.8,
      });
      if (res.canceled || !res.assets?.length) return;
      for (const asset of res.assets) {
        try {
          const up = await commApi.uploadImage(token, asset.uri);
          setGalleryIds((ids) => [...ids, up.id]);
          setGalleryPreviews((p) => [...p, up.full]);
        } catch {
          // skip failed uploads
        }
      }
    } catch (e: any) {
      Alert.alert('Upload gagal', e.message);
    } finally {
      setGalleryUploading(false);
    }
  }
  const removeGalleryAt = (idx: number) => {
    setGalleryIds((ids) => ids.filter((_, i) => i !== idx));
    setGalleryPreviews((p) => p.filter((_, i) => i !== idx));
  };

  const addContact = (channel: string) => {
    setContacts((c) => [...c, { channel, url: '' }]);
    setContactPickerOpen(false);
  };
  const setContactUrl = (idx: number, v: string) =>
    setContacts((c) => c.map((row, i) => (i === idx ? { ...row, url: v } : row)));
  const removeContact = (idx: number) => setContacts((c) => c.filter((_, i) => i !== idx));

  const addActivity = () =>
    setActivities((a) => [...a, { nama_kegiatan: '', hari: 'mon', jam: '', lokasi: '' }]);
  const setActivity = (idx: number, patch: Partial<ActivityRow>) =>
    setActivities((a) => a.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  const removeActivity = (idx: number) => setActivities((a) => a.filter((_, i) => i !== idx));

  async function save() {
    if (name.trim() === '') {
      setError('Nama komunitas wajib diisi.');
      return;
    }
    if (communityType === '') {
      setError('Tipe komunitas wajib dipilih.');
      return;
    }
    if (!logo) {
      setError('Logo wajib diunggah.');
      return;
    }
    if (introduction.trim() === '') {
      setError('Pengenalan singkat wajib diisi.');
      return;
    }
    if (statusKomunitas === '') {
      setError('Status komunitas wajib dipilih.');
      return;
    }
    if (statusKeanggotaan === '') {
      setError('Status keanggotaan wajib dipilih.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const fields: Record<string, unknown> = {
        name,
        community_type: communityType,
        introduction,
        tentang_kami: tentangKami,
        berdiri_sejak: berdiriSejak,
        status_komunitas: statusKomunitas,
        status_keanggotaan: statusKeanggotaan,
        syarat_bergabung: syaratBergabung,
        cara_bergabung: caraBergabung,
        informasi_kontak: contacts.filter((c) => c.url.trim() !== ''),
        kegiatan_rutin: activities.filter((a) => a.nama_kegiatan.trim() !== ''),
        image_gallery: galleryIds,
      };
      if (logo && logo.id) fields.community_logo = logo.id;
      if (cover && cover.id) fields.cover_image = cover.id;
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
        <Header title="Komunitas" onBack={onBack} onLogout={onLogout} profile={profile} onNavigate={onNavigate} unreadCount={unreadCount} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  const typeLabel = types.find((t) => t.slug === communityType)?.label || communityType;

  return (
    <View style={styles.flex}>
      <Header title={editing ? 'Edit Komunitas' : 'Komunitas Baru'} onBack={onBack} onLogout={onLogout} profile={profile} onNavigate={onNavigate} unreadCount={unreadCount} />
      <KeyboardAwareScroll style={styles.flex} contentContainerStyle={styles.content}>
        <Field label="Nama *">
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nama komunitas" placeholderTextColor={colors.muted} />
        </Field>

        <Field label="Tipe Komunitas *">
          <Pressable style={styles.pickerBtn} onPress={() => setTypePickerOpen(true)}>
            <Text style={typeLabel ? styles.pickerBtnText : styles.pickerBtnPlaceholder}>
              {typeLabel || 'Pilih tipe komunitas'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.muted} />
          </Pressable>
        </Field>

        <View style={styles.imgRow}>
          <ImagePick label="Logo *" img={logo?.full} onPress={() => pick('logo')} busy={uploading === 'logo'} />
          <ImagePick label="Sampul" img={cover?.full} onPress={() => pick('cover')} busy={uploading === 'cover'} wide />
        </View>

        <Field label={`Pengenalan Singkat * (${introduction.length}/200)`}>
          <TextInput
            style={[styles.input, styles.textareaSmall]}
            value={introduction}
            onChangeText={(v) => setIntroduction(v.slice(0, 200))}
            placeholder="Satu-dua kalimat tentang komunitas ini…"
            placeholderTextColor={colors.muted}
            multiline
            maxLength={200}
          />
        </Field>

        <Field label="Berdiri Sejak">
          <TextInput style={styles.input} value={berdiriSejak} onChangeText={setBerdiriSejak} placeholder="cth: 1 Juni 2022" placeholderTextColor={colors.muted} />
        </Field>

        <Field label="Status Komunitas *">
          <ChipPicker options={STATUS_KOMUNITAS} value={statusKomunitas} onChange={setStatusKomunitas} />
        </Field>

        <Field label="Status Keanggotaan *">
          <ChipPicker options={STATUS_KEANGGOTAAN} value={statusKeanggotaan} onChange={setStatusKeanggotaan} />
        </Field>

        <Field label="Tentang Kami">
          <RichTextEditor
            defaultValue={tentangKami}
            onChangeHtml={setTentangKami}
            placeholder="Ceritakan tentang komunitas ini…"
            onUploadImage={async (uri) => (await commApi.uploadImage(token, uri)).full}
          />
        </Field>

        <Field label="Syarat Bergabung">
          <RichTextEditor
            defaultValue={syaratBergabung}
            onChangeHtml={setSyaratBergabung}
            placeholder="Siapa yang bisa bergabung?"
            onUploadImage={async (uri) => (await commApi.uploadImage(token, uri)).full}
          />
        </Field>

        <Field label="Cara Bergabung">
          <RichTextEditor
            defaultValue={caraBergabung}
            onChangeHtml={setCaraBergabung}
            placeholder="Langkah-langkah bergabung…"
            onUploadImage={async (uri) => (await commApi.uploadImage(token, uri)).full}
          />
        </Field>

        <Field label="Informasi Kontak">
          {contacts.map((c, idx) => {
            const p = CONTACT_CHANNELS.find((x) => x.key === c.channel);
            return (
              <View style={styles.linkRow} key={`${c.channel}-${idx}`}>
                <View style={[styles.linkIcon, { backgroundColor: (p?.color || colors.primary) + '22' }]}>
                  <Ionicons name={(p?.icon || 'link') as any} size={18} color={p?.color || colors.primary} />
                </View>
                <TextInput
                  style={[styles.input, styles.linkInput]}
                  value={c.url}
                  onChangeText={(v) => setContactUrl(idx, v)}
                  placeholder={c.channel === 'email' ? 'email@domain.com' : 'https:// atau nomor WhatsApp'}
                  placeholderTextColor={colors.muted}
                  autoCapitalize="none"
                  keyboardType={c.channel === 'email' ? 'email-address' : 'default'}
                />
                <Pressable style={styles.linkRemove} onPress={() => removeContact(idx)}>
                  <Text style={styles.linkRemoveText}>✕</Text>
                </Pressable>
              </View>
            );
          })}
          <Pressable style={styles.addLinkBtn} onPress={() => setContactPickerOpen(true)}>
            <Text style={styles.addLinkText}>＋ Tambah Kontak</Text>
          </Pressable>
        </Field>

        <Field label="Kegiatan Rutin">
          {activities.map((a, idx) => (
            <View style={styles.activityRow} key={idx}>
              <TextInput
                style={styles.input}
                value={a.nama_kegiatan}
                onChangeText={(v) => setActivity(idx, { nama_kegiatan: v })}
                placeholder="Nama kegiatan"
                placeholderTextColor={colors.muted}
              />
              <ChipPicker
                options={HARI_LABELS.map(([k]) => k)}
                labels={HARI_LABELS.map(([, l]) => l)}
                value={a.hari}
                onChange={(v) => setActivity(idx, { hari: v })}
                compact
              />
              <View style={styles.activityInlineRow}>
                <TimeInput value={a.jam} onChange={(v) => setActivity(idx, { jam: v })} />
                <TextInput
                  style={[styles.input, styles.activityHalf]}
                  value={a.lokasi}
                  onChangeText={(v) => setActivity(idx, { lokasi: v })}
                  placeholder="Lokasi"
                  placeholderTextColor={colors.muted}
                />
              </View>
              <Pressable style={styles.removeActivityBtn} onPress={() => removeActivity(idx)}>
                <Text style={styles.linkRemoveText}>Hapus Kegiatan ✕</Text>
              </Pressable>
            </View>
          ))}
          <Pressable style={styles.addLinkBtn} onPress={addActivity}>
            <Text style={styles.addLinkText}>＋ Tambah Kegiatan</Text>
          </Pressable>
        </Field>

        <Field label="Galeri Foto">
          <View style={styles.galleryGrid}>
            {galleryPreviews.map((uri, idx) => (
              <View style={styles.galleryItem} key={`${uri}-${idx}`}>
                <Image source={{ uri }} style={styles.galleryImg} />
                <Pressable style={styles.galleryRemove} onPress={() => removeGalleryAt(idx)}>
                  <Text style={styles.galleryRemoveText}>✕</Text>
                </Pressable>
              </View>
            ))}
            <Pressable style={styles.galleryAdd} onPress={pickGallery} disabled={galleryUploading}>
              {galleryUploading ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.pickHint}>＋ Foto</Text>}
            </Pressable>
          </View>
        </Field>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]} disabled={saving} onPress={save}>
          <Text style={styles.saveText}>{saving ? 'Menyimpan…' : editing ? 'Simpan Perubahan' : 'Buat Komunitas'}</Text>
        </Pressable>
      </KeyboardAwareScroll>

      <Modal visible={typePickerOpen} transparent animationType="fade" onRequestClose={() => setTypePickerOpen(false)}>
        <Pressable style={styles.pickerBackdrop} onPress={() => setTypePickerOpen(false)}>
          <Pressable style={styles.typeSheet} onPress={() => {}}>
            <Text style={styles.linkPickerTitle}>Pilih Tipe Komunitas</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {types.map((t) => (
                <Pressable
                  key={t.slug}
                  style={styles.typeOpt}
                  onPress={() => {
                    setCommunityType(t.slug);
                    setTypePickerOpen(false);
                  }}
                >
                  <Text style={styles.typeOptText}>{t.label}</Text>
                </Pressable>
              ))}
              {types.length === 0 && <Text style={styles.empty}>Belum ada tipe komunitas.</Text>}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={contactPickerOpen} transparent animationType="fade" onRequestClose={() => setContactPickerOpen(false)}>
        <Pressable style={styles.pickerBackdrop} onPress={() => setContactPickerOpen(false)}>
          <Pressable style={styles.linkPickerSheet} onPress={() => {}}>
            <Text style={styles.linkPickerTitle}>Pilih Kanal Kontak</Text>
            <View style={styles.linkPickerGrid}>
              {CONTACT_CHANNELS.map((p) => (
                <Pressable key={p.key} style={styles.linkPickerOpt} onPress={() => addContact(p.key)}>
                  <Ionicons name={p.icon as any} size={22} color={p.color} />
                  <Text style={styles.linkPickerLabel}>{p.label}</Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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

function ImagePick({ label, img, onPress, wide, busy }: {
  label: string; img?: string; onPress: () => void; wide?: boolean; busy?: boolean;
}) {
  return (
    <Pressable style={[styles.imgPick, wide && styles.imgPickWide]} onPress={onPress} disabled={busy}>
      {busy ? (
        <ActivityIndicator color={colors.primary} />
      ) : img ? (
        <Image source={{ uri: img }} style={styles.imgPreview} />
      ) : (
        <Text style={styles.imgPickText}>+ {label}</Text>
      )}
    </Pressable>
  );
}

// Compact select for a fixed option list — used for status selects (4 items)
// and, in `compact` mode, the per-activity day picker (7 items).
function ChipPicker({ options, labels, value, onChange, compact }: {
  options: string[]; labels?: string[]; value: string; onChange: (v: string) => void; compact?: boolean;
}) {
  return (
    <View style={styles.chipWrap}>
      {options.map((opt, i) => {
        const active = value === opt;
        return (
          <Pressable
            key={opt}
            style={[styles.chip, compact && styles.chipCompact, active && styles.chipActive]}
            onPress={() => onChange(opt)}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{labels ? labels[i] : opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

// Pure-JS time picker (no native module, so it runs in Expo Go). Mirrors
// BrandFormScreen's TimeInput exactly — a bottom sheet with scrollable hour +
// minute columns, keeping the "HH:MM" string contract.
function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  const [h, setH] = useState('08');
  const [m, setM] = useState('00');

  const open = () => {
    const [hh, mm] = (value || '08:00').split(':');
    setH(hh || '08');
    setM(mm || '00');
    setShow(true);
  };
  const done = () => {
    onChange(`${h}:${m}`);
    setShow(false);
  };

  return (
    <>
      <Pressable style={styles.timeInput} onPress={open}>
        <Text style={styles.timeText}>{value || '--:--'}</Text>
      </Pressable>
      <Modal visible={show} transparent animationType="fade" onRequestClose={() => setShow(false)}>
        <Pressable style={styles.pickerBackdrop} onPress={() => setShow(false)}>
          <Pressable style={styles.timePickerSheet} onPress={() => {}}>
            <Text style={styles.pickerTime}>{h}:{m}</Text>
            <View style={styles.pickerCols}>
              <ScrollView style={styles.pickerCol} showsVerticalScrollIndicator={false}>
                {HOURS.map((x) => (
                  <Pressable key={x} style={[styles.pickerOpt, x === h && styles.pickerOptSel]} onPress={() => setH(x)}>
                    <Text style={[styles.pickerOptText, x === h && styles.pickerOptTextSel]}>{x}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={styles.pickerColon}>:</Text>
              <ScrollView style={styles.pickerCol} showsVerticalScrollIndicator={false}>
                {MINUTES.map((x) => (
                  <Pressable key={x} style={[styles.pickerOpt, x === m && styles.pickerOptSel]} onPress={() => setM(x)}>
                    <Text style={[styles.pickerOptText, x === m && styles.pickerOptTextSel]}>{x}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <Pressable style={styles.pickerDone} onPress={done}>
              <Text style={styles.pickerDoneText}>Selesai</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 48 },
  field: { marginTop: 12 },
  label: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.heading, marginBottom: 6 },
  input: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: fonts.body, color: colors.heading,
  },
  textareaSmall: { height: 64, textAlignVertical: 'top' },

  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  pickerBtnText: { fontFamily: fonts.body, fontSize: 15, color: colors.heading },
  pickerBtnPlaceholder: { fontFamily: fonts.body, fontSize: 15, color: colors.muted },
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  typeSheet: { backgroundColor: colors.card, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, paddingBottom: 28 },
  typeOpt: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  typeOptText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.heading },
  empty: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, paddingVertical: 12 },

  imgRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  imgPick: {
    width: 90, height: 90, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, overflow: 'hidden',
  },
  imgPickWide: { flex: 1 },
  imgPickText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.muted },
  imgPreview: { width: '100%', height: '100%' },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  chipCompact: { paddingHorizontal: 9, paddingVertical: 6 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.text },
  chipTextActive: { color: colors.white },

  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  linkIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  linkInput: { flex: 1 },
  linkRemove: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  linkRemoveText: { fontSize: 13, color: colors.muted, fontFamily: fonts.bodySemi },
  addLinkBtn: { alignSelf: 'flex-start', marginTop: 4, paddingVertical: 8 },
  addLinkText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.primary },
  linkPickerSheet: { backgroundColor: colors.card, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, paddingBottom: 28 },
  linkPickerTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.heading, marginBottom: 14 },
  linkPickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  linkPickerOpt: { width: '31%', alignItems: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, gap: 6, marginBottom: 6 },
  linkPickerLabel: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.heading, textAlign: 'center' },

  activityRow: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginBottom: 10, gap: 8 },
  activityInlineRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  activityHalf: { flex: 1 },
  removeActivityBtn: { alignSelf: 'flex-end', paddingVertical: 4 },

  timeInput: {
    flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center',
  },
  timeText: { fontSize: 14, fontFamily: fonts.bodySemi, color: colors.heading },
  timePickerSheet: { backgroundColor: colors.card, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 16, paddingBottom: 24, paddingHorizontal: 16 },
  pickerTime: { fontFamily: fonts.heading, fontSize: 22, color: colors.heading, textAlign: 'center', marginBottom: 10 },
  pickerCols: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 200, gap: 8 },
  pickerCol: { flex: 1, maxWidth: 120 },
  pickerColon: { fontFamily: fonts.heading, fontSize: 22, color: colors.muted },
  pickerOpt: { paddingVertical: 11, alignItems: 'center', borderRadius: 10 },
  pickerOptSel: { backgroundColor: colors.primary },
  pickerOptText: { fontFamily: fonts.bodySemi, fontSize: 18, color: colors.text },
  pickerOptTextSel: { color: colors.white },
  pickerDone: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 12 },
  pickerDoneText: { color: colors.white, fontFamily: fonts.headingSemi, fontSize: 15 },

  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  galleryItem: { width: 84, height: 84, borderRadius: 12, overflow: 'hidden' },
  galleryImg: { width: '100%', height: '100%', backgroundColor: colors.bgAlt },
  galleryRemove: {
    position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  galleryRemoveText: { color: colors.white, fontSize: 12, fontFamily: fonts.bodySemi },
  galleryAdd: {
    width: 84, height: 84, borderRadius: 12, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card,
  },
  pickHint: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.muted },

  saveBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  pressed: { opacity: 0.85 },
  saveText: { fontFamily: fonts.headingSemi, fontSize: 16, color: colors.white },
  error: { color: colors.danger, textAlign: 'center', marginTop: 14, fontFamily: fonts.bodyMedium },
});
