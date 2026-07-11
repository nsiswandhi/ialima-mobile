import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { colors, fonts } from './theme';
import Header from './Header';
import { BrandDetail, BrandType, Hours, mkApi, TYPE_LABELS } from './marketplace/api';
import { pickAndUpload } from './marketplace/pickAndUpload';

type Props = {
  token: string;
  brandId?: number; // present => edit mode
  onBack: () => void;
  onSaved: (brand: BrandDetail) => void;
  onLogout: () => void;
};

const DAYS: [keyof Hours, string][] = [
  ['mon', 'Senin'], ['tue', 'Selasa'], ['wed', 'Rabu'], ['thu', 'Kamis'],
  ['fri', 'Jumat'], ['sat', 'Sabtu'], ['sun', 'Minggu'],
];

type DayState = { enabled: boolean; open: string; close: string };
const emptyHours = (): Record<keyof Hours, DayState> =>
  DAYS.reduce((acc, [k]) => {
    acc[k] = { enabled: false, open: '', close: '' };
    return acc;
  }, {} as Record<keyof Hours, DayState>);

// Create + edit a Brand. In create mode the member picks a type first (locked
// afterwards); place brands expose the address / coordinates / hours / offerings
// block. Logo & cover upload is a separate follow-up (needs the image picker).
export default function BrandFormScreen({ token, brandId, onBack, onSaved, onLogout }: Props) {
  const isEdit = brandId != null;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<BrandType | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');

  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [hours, setHours] = useState<Record<keyof Hours, DayState>>(emptyHours);
  const [offerings, setOfferings] = useState<string[]>([]);
  const [offerDraft, setOfferDraft] = useState('');

  // Images: *_id is set only when the user picks a new one; the preview may show
  // an existing image (edit mode) whose id we don't have — in that case we leave
  // *_id null so the partial update keeps the current attachment.
  const [logoId, setLogoId] = useState<number | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverId, setCoverId] = useState<number | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState<null | 'logo' | 'cover'>(null);

  const isPlace = type === 'place';

  // Edit mode: hydrate from the brand detail.
  useEffect(() => {
    if (!isEdit) return;
    let alive = true;
    (async () => {
      try {
        const b = await mkApi.detail(token, brandId!);
        if (!alive) return;
        setType((b.type || 'product') as BrandType);
        setName(b.name);
        setDescription(b.description);
        setWhatsapp(b.whatsapp_number);
        setCity(b.city);
        setCategory(b.category);
        setLogoPreview(b.logo?.full || null);
        setCoverPreview(b.cover?.full || null);
        if (b.place) {
          setAddress(b.place.address);
          setLat(b.place.lat ? String(b.place.lat) : '');
          setLng(b.place.lng ? String(b.place.lng) : '');
          setOfferings(b.place.offerings || []);
          const h = emptyHours();
          for (const [day] of DAYS) {
            const ranges = b.place.operating_hours?.[day] || [];
            if (ranges.length > 0) {
              h[day] = { enabled: true, open: ranges[0].open, close: ranges[0].close };
            }
          }
          setHours(h);
        }
      } catch (e: any) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [brandId]);

  const setDay = (day: keyof Hours, patch: Partial<DayState>) =>
    setHours((h) => ({ ...h, [day]: { ...h[day], ...patch } }));

  const addOffering = () => {
    const v = offerDraft.trim();
    if (!v) return;
    setOfferings((o) => (o.includes(v) ? o : [...o, v]));
    setOfferDraft('');
  };

  const pickImage = async (which: 'logo' | 'cover') => {
    setUploading(which);
    try {
      const img = await pickAndUpload(token, which === 'logo' ? [1, 1] : [16, 9]);
      if (img) {
        if (which === 'logo') {
          setLogoId(img.id);
          setLogoPreview(img.full);
        } else {
          setCoverId(img.id);
          setCoverPreview(img.full);
        }
      }
    } catch (e: any) {
      Alert.alert('Gagal unggah', e.message);
    } finally {
      setUploading(null);
    }
  };

  const hoursRows = useMemo(
    () =>
      DAYS.filter(([d]) => hours[d].enabled && hours[d].open && hours[d].close).map(([d]) => ({
        day: d,
        open: hours[d].open,
        close: hours[d].close,
      })),
    [hours],
  );

  const validate = (): string | null => {
    if (!type) return 'Pilih tipe brand.';
    if (!name.trim()) return 'Nama brand wajib diisi.';
    if (!whatsapp.trim()) return 'Nomor WhatsApp wajib diisi.';
    if (isPlace) {
      if (!address.trim()) return 'Alamat wajib diisi untuk tempat.';
      if (!lat.trim() || !lng.trim()) return 'Koordinat (lat & lng) wajib diisi untuk tempat.';
    }
    return null;
  };

  const submit = async () => {
    const problem = validate();
    if (problem) {
      Alert.alert('Lengkapi form', problem);
      return;
    }
    setSaving(true);
    setError(null);

    const fields: Record<string, unknown> = {
      name: name.trim(),
      description: description.trim(),
      whatsapp_number: whatsapp.trim(),
      city: city.trim(),
      category: category.trim(),
    };
    if (!isEdit) fields.type = type; // type is immutable after create
    if (logoId != null) fields.logo_id = logoId;
    if (coverId != null) fields.cover_id = coverId;
    if (isPlace) {
      fields.address = address.trim();
      fields.lat = lat.trim();
      fields.lng = lng.trim();
      fields.operating_hours = hoursRows;
      fields.offerings = offerings;
    }

    try {
      const saved = isEdit
        ? await mkApi.update(token, brandId!, fields)
        : await mkApi.create(token, fields);
      onSaved(saved);
    } catch (e: any) {
      if (e.code === 'quota_exceeded') {
        Alert.alert('Batas tercapai', `Paket ${e.tier || ''} dibatasi ${e.limit ?? ''} brand. Upgrade untuk menambah.`);
      } else {
        Alert.alert('Gagal menyimpan', e.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const title = isEdit ? 'Ubah Brand' : 'Buat Brand';

  if (loading) {
    return (
      <View style={styles.flex}>
        <Header title={title} onBack={onBack} onLogout={onLogout} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  // Create mode, no type yet → type picker.
  if (!isEdit && !type) {
    return (
      <View style={styles.flex}>
        <Header title={title} onBack={onBack} onLogout={onLogout} />
        <ScrollView contentContainerStyle={styles.pickerWrap}>
          <Text style={styles.pickerTitle}>Apa jenis brand Anda?</Text>
          {(['product', 'service', 'place'] as BrandType[]).map((t) => (
            <Pressable key={t} style={styles.typeCard} onPress={() => setType(t)}>
              <Text style={styles.typeTitle}>{TYPE_LABELS[t]}</Text>
              <Text style={styles.typeDesc}>
                {t === 'product'
                  ? 'Jual produk fisik (dijual via WhatsApp).'
                  : t === 'service'
                  ? 'Tawarkan jasa / layanan.'
                  : 'Tempat usaha (resto, kafe, hotel, klinik) dengan lokasi & jam buka.'}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <Header title={title} onBack={onBack} onLogout={onLogout} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{type ? TYPE_LABELS[type] : ''}</Text>
        </View>

        <Field label="Nama Brand *">
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nama brand"
            placeholderTextColor={colors.muted} />
        </Field>

        <Field label="Deskripsi">
          <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription}
            placeholder="Ceritakan tentang brand Anda" placeholderTextColor={colors.muted} multiline />
        </Field>

        <Field label="Nomor WhatsApp *">
          <TextInput style={styles.input} value={whatsapp} onChangeText={setWhatsapp}
            placeholder="08xxxxxxxxxx" placeholderTextColor={colors.muted} keyboardType="phone-pad" />
        </Field>

        <Field label="Kota">
          <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="Bandung"
            placeholderTextColor={colors.muted} />
        </Field>

        <Field label="Kategori">
          <TextInput style={styles.input} value={category} onChangeText={setCategory}
            placeholder="mis. fashion, restoran-kafe" placeholderTextColor={colors.muted} autoCapitalize="none" />
        </Field>

        <Field label="Foto (Logo & Sampul)">
          <View style={styles.photoRow}>
            <Pressable style={styles.logoPick} onPress={() => pickImage('logo')} disabled={uploading !== null}>
              {uploading === 'logo' ? (
                <ActivityIndicator color={colors.primary} />
              ) : logoPreview ? (
                <Image source={{ uri: logoPreview }} style={styles.pickImg} />
              ) : (
                <Text style={styles.pickHint}>＋ Logo</Text>
              )}
            </Pressable>
            <Pressable style={styles.coverPick} onPress={() => pickImage('cover')} disabled={uploading !== null}>
              {uploading === 'cover' ? (
                <ActivityIndicator color={colors.primary} />
              ) : coverPreview ? (
                <Image source={{ uri: coverPreview }} style={styles.pickImg} />
              ) : (
                <Text style={styles.pickHint}>＋ Sampul</Text>
              )}
            </Pressable>
          </View>
        </Field>

        {isPlace && (
          <>
            <Text style={styles.section}>Lokasi & Jam Buka</Text>

            <Field label="Alamat *">
              <TextInput style={[styles.input, styles.multiline]} value={address} onChangeText={setAddress}
                placeholder="Alamat lengkap" placeholderTextColor={colors.muted} multiline />
            </Field>

            <View style={styles.row}>
              <View style={styles.half}>
                <Field label="Latitude *">
                  <TextInput style={styles.input} value={lat} onChangeText={setLat} placeholder="-6.914744"
                    placeholderTextColor={colors.muted} keyboardType="numbers-and-punctuation" />
                </Field>
              </View>
              <View style={styles.half}>
                <Field label="Longitude *">
                  <TextInput style={styles.input} value={lng} onChangeText={setLng} placeholder="107.609810"
                    placeholderTextColor={colors.muted} keyboardType="numbers-and-punctuation" />
                </Field>
              </View>
            </View>

            <Field label="Jam Buka">
              <View>
                {DAYS.map(([day, label]) => (
                  <View style={styles.hourRow} key={day}>
                    <Switch
                      value={hours[day].enabled}
                      onValueChange={(v) => setDay(day, { enabled: v })}
                      trackColor={{ true: colors.primary, false: colors.border }}
                    />
                    <Text style={styles.hourDay}>{label}</Text>
                    {hours[day].enabled ? (
                      <View style={styles.hourTimes}>
                        <TextInput style={styles.timeInput} value={hours[day].open}
                          onChangeText={(t) => setDay(day, { open: t })} placeholder="08:00"
                          placeholderTextColor={colors.muted} />
                        <Text style={styles.dash}>–</Text>
                        <TextInput style={styles.timeInput} value={hours[day].close}
                          onChangeText={(t) => setDay(day, { close: t })} placeholder="17:00"
                          placeholderTextColor={colors.muted} />
                      </View>
                    ) : (
                      <Text style={styles.closedText}>Tutup</Text>
                    )}
                  </View>
                ))}
              </View>
            </Field>

            <Field label="Fasilitas / Penawaran">
              <View style={styles.offerInputRow}>
                <TextInput style={[styles.input, { flex: 1 }]} value={offerDraft} onChangeText={setOfferDraft}
                  placeholder="mis. WiFi, Parkir" placeholderTextColor={colors.muted}
                  onSubmitEditing={addOffering} returnKeyType="done" />
                <Pressable style={styles.addBtn} onPress={addOffering}>
                  <Text style={styles.addBtnText}>Tambah</Text>
                </Pressable>
              </View>
              {offerings.length > 0 && (
                <View style={styles.chipsRow}>
                  {offerings.map((o) => (
                    <Pressable key={o} style={styles.chip}
                      onPress={() => setOfferings((arr) => arr.filter((x) => x !== o))}>
                      <Text style={styles.chipText}>{o}  ✕</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </Field>
          </>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={[styles.saveBtn, (saving || uploading !== null) && styles.saveBtnDisabled]}
          onPress={submit} disabled={saving || uploading !== null}>
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveBtnText}>{isEdit ? 'Simpan Perubahan' : 'Buat Brand'}</Text>
          )}
        </Pressable>
      </ScrollView>
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
  content: { padding: 16, paddingTop: 52, paddingBottom: 48 },
  error: { color: colors.danger, fontFamily: fonts.bodyMedium, marginTop: 12 },

  pickerWrap: { padding: 16, paddingTop: 52 },
  pickerTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.heading, marginBottom: 16 },
  typeCard: {
    backgroundColor: colors.card, borderRadius: 14, padding: 18, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  typeTitle: { fontFamily: fonts.headingSemi, fontSize: 17, color: colors.primary },
  typeDesc: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 18 },

  typeBadge: { alignSelf: 'flex-start', backgroundColor: colors.bgAlt, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 8 },
  typeBadgeText: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.primary },

  field: { marginTop: 14 },
  label: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.heading, marginBottom: 6 },
  input: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, fontFamily: fonts.body, color: colors.heading,
  },
  multiline: { minHeight: 84, textAlignVertical: 'top' },

  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },

  section: { fontFamily: fonts.heading, fontSize: 16, color: colors.heading, marginTop: 24 },

  photoRow: { flexDirection: 'row', gap: 12 },
  logoPick: {
    width: 84, height: 84, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1,
    borderColor: colors.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  coverPick: {
    flex: 1, height: 84, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1,
    borderColor: colors.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  pickImg: { width: '100%', height: '100%' },
  pickHint: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.muted },

  hourRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  hourDay: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.heading, width: 62 },
  hourTimes: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  timeInput: {
    flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, fontFamily: fonts.body, color: colors.heading, textAlign: 'center',
  },
  dash: { fontFamily: fonts.body, color: colors.muted },
  closedText: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, flex: 1 },

  offerInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addBtn: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 16 },
  addBtnText: { color: colors.white, fontFamily: fonts.headingSemi, fontSize: 14 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { backgroundColor: colors.bgAlt, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.primary },

  saveBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 28 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: colors.white, fontFamily: fonts.headingSemi, fontSize: 16 },
});
