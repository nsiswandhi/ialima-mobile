// Create / edit an event. Mirrors CommunityFormScreen's field patterns. The
// `organizer` is NOT an editable field (server derives it from the creator's
// role); when the creator is a Pengurus Komunitas, a community picker chooses
// which community the event belongs to. Dates use a native date+time picker.
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import Header, { DrawerProfile, NavTarget } from '../Header';
import KeyboardAwareScroll from '../KeyboardAwareScroll';
import { colors, fonts } from '../theme';
import { evApi, EventCategory, EventDetail, JENIS_EVENT, ONLINE_PLATFORMS, showsOffline, showsOnline } from './api';
import { commApi, CommunitySummary } from '../community/api';

type Props = {
  token: string;
  eventId?: number | null; // null/undefined = create
  pickCommunity?: boolean;  // creator is Pengurus Komunitas — show community picker
  onBack: () => void;
  onSaved: (id: number) => void;
  onLogout: () => void;
  profile?: DrawerProfile;
  onNavigate?: (target: NavTarget) => void;
};

export default function EventFormScreen({
  token, eventId, pickCommunity, onBack, onSaved, onLogout, profile, onNavigate,
}: Props) {
  const editing = !!eventId;
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [cats, setCats] = useState<EventCategory[]>([]);
  const [category, setCategory] = useState('');
  const [catPickerOpen, setCatPickerOpen] = useState(false);

  const [logo, setLogo] = useState<{ id: number; full: string } | null>(null);
  const [cover, setCover] = useState<{ id: number; full: string } | null>(null);
  const [uploading, setUploading] = useState<null | 'logo' | 'cover'>(null);

  const [introduction, setIntroduction] = useState('');
  const [tentangEvent, setTentangEvent] = useState('');
  const [jenis, setJenis] = useState('');

  const [onlinePlatform, setOnlinePlatform] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [password, setPassword] = useState('');

  const [namaLokasi, setNamaLokasi] = useState('');
  const [alamat, setAlamat] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  const [linkRegistrasi, setLinkRegistrasi] = useState('');
  const [startTs, setStartTs] = useState(0); // seconds
  const [endTs, setEndTs] = useState(0);

  // Community picker (only when the creator is a Pengurus Komunitas).
  const [communities, setCommunities] = useState<CommunitySummary[]>([]);
  const [communityId, setCommunityId] = useState<number | null>(null);
  const [commPickerOpen, setCommPickerOpen] = useState(false);

  const [bannerIds, setBannerIds] = useState<number[]>([]);
  const [bannerPreviews, setBannerPreviews] = useState<string[]>([]);
  const [bannerUploading, setBannerUploading] = useState(false);

  useEffect(() => {
    evApi.listCategories(token).then((r) => setCats(r.data)).catch(() => {});
    if (pickCommunity && !editing) {
      commApi.list(token, { role: 'manager' }).then((r) => setCommunities(r.data)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!editing) return;
    let alive = true;
    evApi
      .detail(token, eventId!)
      .then((d: EventDetail) => {
        if (!alive) return;
        setName(d.name);
        setCategory(d.event_category);
        if (d.logo?.full) setLogo({ id: 0, full: d.logo.full });
        if (d.cover?.full) setCover({ id: 0, full: d.cover.full });
        setIntroduction(d.introduction);
        setTentangEvent(blocksToPlainText(d.tentang_event));
        setJenis(d.jenis_event);
        setOnlinePlatform(d.online_platform);
        setMeetingUrl(d.meeting_url);
        setMeetingId(d.meeting_id);
        setPassword(d.password);
        setNamaLokasi(d.nama_lokasi);
        setAlamat(d.alamat);
        setMapsUrl(d.google_maps_url);
        setLatitude(d.latitude);
        setLongitude(d.longitude);
        setLinkRegistrasi(d.link_registrasi);
        setStartTs(d.start_date);
        setEndTs(d.end_date);
        setBannerIds(d.banner_informasi.map((g) => g.id));
        setBannerPreviews(d.banner_informasi.map((g) => g.thumbnail || g.full));
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [eventId]);

  async function pick(kind: 'logo' | 'cover') {
    setUploading(kind);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) throw new Error('Izin akses galeri ditolak.');
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: kind === 'cover' ? [4, 5] : [1, 1],
        quality: 0.8,
      });
      if (res.canceled || !res.assets?.length) return;
      const up = await evApi.uploadImage(token, res.assets[0].uri);
      if (kind === 'logo') setLogo({ id: up.id, full: up.full });
      else setCover({ id: up.id, full: up.full });
    } catch (e: any) {
      Alert.alert('Upload gagal', e.message);
    } finally {
      setUploading(null);
    }
  }

  async function pickBanner() {
    setBannerUploading(true);
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
          const up = await evApi.uploadImage(token, asset.uri);
          setBannerIds((ids) => [...ids, up.id]);
          setBannerPreviews((p) => [...p, up.full]);
        } catch {
          // skip failed uploads
        }
      }
    } catch (e: any) {
      Alert.alert('Upload gagal', e.message);
    } finally {
      setBannerUploading(false);
    }
  }
  const removeBannerAt = (idx: number) => {
    setBannerIds((ids) => ids.filter((_, i) => i !== idx));
    setBannerPreviews((p) => p.filter((_, i) => i !== idx));
  };

  async function save() {
    if (name.trim() === '') {
      setError('Nama event wajib diisi.');
      return;
    }
    if (!startTs || !endTs) {
      setError('Tanggal mulai dan selesai wajib diisi.');
      return;
    }
    if (endTs < startTs) {
      setError('Tanggal selesai harus setelah tanggal mulai.');
      return;
    }
    if (pickCommunity && !editing && !communityId) {
      setError('Pilih komunitas penyelenggara.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const fields: Record<string, unknown> = {
        name,
        event_category: category,
        introduction,
        tentang_event: tentangEvent,
        jenis_event: jenis,
        online_platform: onlinePlatform,
        meeting_url: meetingUrl,
        meeting_id: meetingId,
        password,
        nama_lokasi: namaLokasi,
        alamat,
        google_maps_url: mapsUrl,
        latitude,
        longitude,
        link_registrasi: linkRegistrasi,
        start_date: startTs,
        end_date: endTs,
        banner_informasi: bannerIds,
      };
      if (logo && logo.id) fields.event_logo = logo.id;
      if (cover && cover.id) fields.cover_image = cover.id;
      if (pickCommunity && !editing && communityId) fields.community_id = communityId;
      const saved = editing
        ? await evApi.update(token, eventId!, fields)
        : await evApi.create(token, fields);
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
        <Header title="Event" onBack={onBack} onLogout={onLogout} profile={profile} onNavigate={onNavigate} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  const online = showsOnline(jenis);
  const offline = showsOffline(jenis);
  const catLabel = cats.find((c) => c.slug === category)?.label || category;
  const commName = communities.find((c) => c.id === communityId)?.name;

  return (
    <View style={styles.flex}>
      <Header title={editing ? 'Edit Event' : 'Event Baru'} onBack={onBack} onLogout={onLogout} profile={profile} onNavigate={onNavigate} />
      <KeyboardAwareScroll style={styles.flex} contentContainerStyle={styles.content}>
        <Field label="Nama Event *">
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nama event" placeholderTextColor={colors.muted} />
        </Field>

        <Field label="Kategori">
          <Pressable style={styles.pickerBtn} onPress={() => setCatPickerOpen(true)}>
            <Text style={catLabel ? styles.pickerBtnText : styles.pickerBtnPlaceholder}>{catLabel || 'Pilih kategori'}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.muted} />
          </Pressable>
        </Field>

        {pickCommunity && !editing && (
          <Field label="Komunitas Penyelenggara *">
            <Pressable style={styles.pickerBtn} onPress={() => setCommPickerOpen(true)}>
              <Text style={commName ? styles.pickerBtnText : styles.pickerBtnPlaceholder}>{commName || 'Pilih komunitas'}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.muted} />
            </Pressable>
          </Field>
        )}

        <View style={styles.imgRow}>
          <ImagePick label="Logo" img={logo?.full} onPress={() => pick('logo')} busy={uploading === 'logo'} />
          <ImagePick label="Sampul (4:5)" img={cover?.full} onPress={() => pick('cover')} busy={uploading === 'cover'} wide />
        </View>

        <Field label={`Pengenalan Singkat (${introduction.length}/200)`}>
          <TextInput
            style={[styles.input, styles.textareaSmall]}
            value={introduction}
            onChangeText={(v) => setIntroduction(v.slice(0, 200))}
            placeholder="Satu-dua kalimat tentang event ini…"
            placeholderTextColor={colors.muted}
            multiline
            maxLength={200}
          />
        </Field>

        <Field label="Tentang Event">
          <TextInput style={[styles.input, styles.textarea]} value={tentangEvent} onChangeText={setTentangEvent} placeholder="Deskripsi lengkap event…" placeholderTextColor={colors.muted} multiline />
        </Field>

        <Field label="Jenis Event">
          <ChipPicker options={JENIS_EVENT} value={jenis} onChange={setJenis} />
        </Field>

        {online && (
          <>
            <Field label="Online Platform">
              <ChipPicker options={ONLINE_PLATFORMS} value={onlinePlatform} onChange={setOnlinePlatform} />
            </Field>
            <Field label="Meeting URL">
              <TextInput style={styles.input} value={meetingUrl} onChangeText={setMeetingUrl} placeholder="https://…" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="url" />
            </Field>
            <Field label="Meeting ID">
              <TextInput style={styles.input} value={meetingId} onChangeText={setMeetingId} placeholder="cth: 123 456 789" placeholderTextColor={colors.muted} />
            </Field>
            <Field label="Password">
              <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password meeting" placeholderTextColor={colors.muted} />
            </Field>
          </>
        )}

        {offline && (
          <>
            <Field label="Nama Lokasi">
              <TextInput style={styles.input} value={namaLokasi} onChangeText={setNamaLokasi} placeholder="cth: Aula Gedung A" placeholderTextColor={colors.muted} />
            </Field>
            <Field label="Alamat">
              <TextInput style={[styles.input, styles.textareaSmall]} value={alamat} onChangeText={setAlamat} placeholder="Alamat lengkap" placeholderTextColor={colors.muted} multiline />
            </Field>
            <Field label="Google Maps URL">
              <TextInput style={styles.input} value={mapsUrl} onChangeText={setMapsUrl} placeholder="https://maps.google.com/…" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="url" />
            </Field>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field label="Latitude">
                  <TextInput style={styles.input} value={latitude} onChangeText={setLatitude} placeholder="-6.914744" placeholderTextColor={colors.muted} keyboardType="numbers-and-punctuation" />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Longitude">
                  <TextInput style={styles.input} value={longitude} onChangeText={setLongitude} placeholder="107.609810" placeholderTextColor={colors.muted} keyboardType="numbers-and-punctuation" />
                </Field>
              </View>
            </View>
          </>
        )}

        <Field label="Tanggal & Waktu Mulai *">
          <DateTimeInput value={startTs} onChange={setStartTs} />
        </Field>
        <Field label="Tanggal & Waktu Selesai *">
          <DateTimeInput value={endTs} onChange={setEndTs} />
        </Field>

        <Field label="Link Registrasi">
          <TextInput style={styles.input} value={linkRegistrasi} onChangeText={setLinkRegistrasi} placeholder="https://…" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="url" />
        </Field>

        <Field label="Banner Informasi">
          <View style={styles.galleryGrid}>
            {bannerPreviews.map((uri, idx) => (
              <View style={styles.galleryItem} key={`${uri}-${idx}`}>
                <Image source={{ uri }} style={styles.galleryImg} />
                <Pressable style={styles.galleryRemove} onPress={() => removeBannerAt(idx)}>
                  <Text style={styles.galleryRemoveText}>✕</Text>
                </Pressable>
              </View>
            ))}
            <Pressable style={styles.galleryAdd} onPress={pickBanner} disabled={bannerUploading}>
              {bannerUploading ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.pickHint}>＋ Foto</Text>}
            </Pressable>
          </View>
        </Field>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]} disabled={saving} onPress={save}>
          <Text style={styles.saveText}>{saving ? 'Menyimpan…' : editing ? 'Simpan Perubahan' : 'Buat Event'}</Text>
        </Pressable>
      </KeyboardAwareScroll>

      <PickerSheet
        visible={catPickerOpen}
        title="Pilih Kategori"
        options={cats.map((c) => ({ key: c.slug, label: c.label }))}
        onPick={(k) => { setCategory(k); setCatPickerOpen(false); }}
        onClose={() => setCatPickerOpen(false)}
        emptyText="Belum ada kategori event."
      />

      <PickerSheet
        visible={commPickerOpen}
        title="Pilih Komunitas"
        options={communities.map((c) => ({ key: String(c.id), label: c.name }))}
        onPick={(k) => { setCommunityId(Number(k)); setCommPickerOpen(false); }}
        onClose={() => setCommPickerOpen(false)}
        emptyText="Kamu belum mengelola komunitas."
      />
    </View>
  );
}

// Native date+time picker. Stores a Unix timestamp in SECONDS (0 = unset), to
// match JetEngine's "datetime - timestamp" storage. On Android the picker is a
// two-step dialog (date, then time); on iOS a single datetime spinner in a sheet.
function DateTimeInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState<'date' | 'time'>('date');
  const [temp, setTemp] = useState<Date>(value ? new Date(value * 1000) : new Date());

  const label = value
    ? new Date(value * 1000).toLocaleString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : '--';

  const openPicker = () => {
    setTemp(value ? new Date(value * 1000) : new Date());
    setMode('date');
    setShow(true);
  };

  const onAndroidChange = (event: any, selected?: Date) => {
    if (event.type === 'dismissed' || !selected) {
      setShow(false);
      return;
    }
    if (mode === 'date') {
      const d = new Date(temp);
      d.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      setTemp(d);
      setMode('time'); // re-renders the picker in time mode
      return;
    }
    const d = new Date(temp);
    d.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    setShow(false);
    onChange(Math.floor(d.getTime() / 1000));
  };

  const onIosChange = (_event: any, selected?: Date) => {
    if (selected) setTemp(selected);
  };
  const iosDone = () => {
    setShow(false);
    onChange(Math.floor(temp.getTime() / 1000));
  };

  return (
    <>
      <Pressable style={styles.pickerBtn} onPress={openPicker}>
        <Text style={value ? styles.pickerBtnText : styles.pickerBtnPlaceholder}>{label}</Text>
        <Ionicons name="calendar-outline" size={16} color={colors.muted} />
      </Pressable>

      {show && Platform.OS === 'android' && (
        <DateTimePicker value={temp} mode={mode} is24Hour onChange={onAndroidChange} />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="fade" onRequestClose={() => setShow(false)}>
          <Pressable style={styles.pickerBackdrop} onPress={() => setShow(false)}>
            <Pressable style={styles.iosSheet} onPress={() => {}}>
              <DateTimePicker value={temp} mode="datetime" display="spinner" onChange={onIosChange} />
              <Pressable style={styles.pickerDone} onPress={iosDone}>
                <Text style={styles.pickerDoneText}>Selesai</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

function PickerSheet({ visible, title, options, onPick, onClose, emptyText }: {
  visible: boolean; title: string; options: { key: string; label: string }[];
  onPick: (key: string) => void; onClose: () => void; emptyText: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.pickerBackdrop} onPress={onClose}>
        <Pressable style={styles.typeSheet} onPress={() => {}}>
          <Text style={styles.linkPickerTitle}>{title}</Text>
          <ScrollView style={{ maxHeight: 320 }}>
            {options.map((o) => (
              <Pressable key={o.key} style={styles.typeOpt} onPress={() => onPick(o.key)}>
                <Text style={styles.typeOptText}>{o.label}</Text>
              </Pressable>
            ))}
            {options.length === 0 && <Text style={styles.empty}>{emptyText}</Text>}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
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

function ChipPicker({ options, value, onChange }: {
  options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <View style={styles.chipWrap}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <Pressable key={opt} style={[styles.chip, active && styles.chipActive]} onPress={() => onChange(opt)}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function blocksToPlainText(blocks: { type: string; text?: string; items?: string[] }[]): string {
  return (blocks || [])
    .map((b) => (b.type === 'ul' || b.type === 'ol' ? (b.items || []).join('\n') : b.text || ''))
    .join('\n\n')
    .replace(/<a href="[^"]*">(.*?)<\/a>/gi, '$1');
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
  textarea: { height: 100, textAlignVertical: 'top' },
  textareaSmall: { height: 64, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },

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
  linkPickerTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.heading, marginBottom: 14 },
  empty: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, paddingVertical: 12 },
  iosSheet: { backgroundColor: colors.card, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, paddingBottom: 28 },

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
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.text },
  chipTextActive: { color: colors.white },

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

  pickerDone: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 12 },
  pickerDoneText: { color: colors.white, fontFamily: fonts.headingSemi, fontSize: 15 },

  saveBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  pressed: { opacity: 0.85 },
  saveText: { fontFamily: fonts.headingSemi, fontSize: 16, color: colors.white },
  error: { color: colors.danger, textAlign: 'center', marginTop: 14, fontFamily: fonts.bodyMedium },
});
