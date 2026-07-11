import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Image, Platform, Pressable,
  StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { API_BASE } from './config';
import { colors, fonts } from './theme';
import Header from './Header';
import ProfileView, { ProfileViewData } from './ProfileView';
import KeyboardAwareScroll from './KeyboardAwareScroll';
import BrandFormScreen from './BrandFormScreen';
import ManageItemsScreen from './ManageItemsScreen';
import MyBrandsSection from './marketplace/MyBrandsSection';

// Brand-management sub-navigation within My Profile (replaces the "Brand Saya" screen).
type BrandNav = null | { kind: 'create' } | { kind: 'edit'; id: number } | { kind: 'items'; id: number };

// Field metadata, mirroring the WordPress "Update Alumni Profile" JetForm.
// Keys are the real WP user-meta keys (confirmed against the DB); the labels
// and hints match the website form 1:1.
type FieldDef = {
  label: string;
  hint?: string;
  multiline?: boolean;
  keyboard?: any;
  noCaps?: boolean;
};
const FIELDS: Record<string, FieldDef> = {
  phone: { label: 'Phone', hint: 'Format +62xxxxxxxxxx (+62 Kode Negara)', keyboard: 'phone-pad' },
  email: { label: 'Email', keyboard: 'email-address', noCaps: true },
  first_name: { label: 'First name' },
  last_name: { label: 'Last name' },
  nickname: { label: 'Nickname', hint: 'Nama Panggilan' },
  angkatan: { label: 'Angkatan', hint: 'Tahun Kelulusan', keyboard: 'number-pad' },
  alamat: {
    label: 'Alamat',
    hint: 'Contoh: Nama Jalan dan No. Rumah, Komplek, Desa/Kelurahan, Kecamatan',
    multiline: true,
  },
  kota_dan_provinsi: { label: 'Kota dan Provinsi', hint: 'Kota/Kabupaten - Provinsi' },
  job_title: { label: 'Job title' },
  company: { label: 'Company' },
  industry: { label: 'Industry' },
  linkedin: { label: 'LinkedIn URL', keyboard: 'url', noCaps: true },
  instagram: { label: 'Instagram URL', keyboard: 'url', noCaps: true },
  youtube: { label: 'YouTube URL', keyboard: 'url', noCaps: true },
  facebook: { label: 'Facebook URL', keyboard: 'url', noCaps: true },
  tiktok: { label: 'TikTok URL', keyboard: 'url', noCaps: true },
};

// Section groupings, matching the website form's column headings.
const BIO = ['first_name', 'last_name', 'nickname', 'angkatan', 'alamat', 'kota_dan_provinsi'];
const KARIR = ['job_title', 'company'];
const SOCIAL = ['linkedin', 'instagram', 'youtube', 'facebook', 'tiktok'];

// Boolean meta, stored server-side as the strings 'true' / 'false'.
const TOGGLES: { key: string; label: string; hint: string }[] = [
  { key: 'open_to_opportunities', label: 'Open to opportunities', hint: 'Terbuka untuk peluang karir?' },
  { key: 'open_for_collaboration', label: 'Open for collaboration', hint: 'Terbuka untuk kolaborasi?' },
];

const MEMBER_SCORE = 60; // "Untuk menjadi MEMBER membutuhkan SKOR minimal 60%"
const INDUSTRY_GLOSSARY_ID = 1; // JetEngine glossary backing the Industry select

type Option = { value: string; label: string };

// Profile completion score — mirrors the JetFormBuilder "Skor Kelengkapan Data"
// calc field exactly. Each field scores its weight when non-empty; the avatar
// adds 20 when present. (industry stores '0' when unset, whose length is 1, so
// it counts as filled — matching the website's 85% for a bio-only profile.)
const SCORE_WEIGHTS: Record<string, number> = {
  first_name: 10, last_name: 10, nickname: 10, angkatan: 10, alamat: 10, kota_dan_provinsi: 10,
  job_title: 5, company: 5, industry: 5,
  linkedin: 1, instagram: 1, youtube: 1, facebook: 1, tiktok: 1,
};
const AVATAR_SCORE = 20;

function computeScore(form: Record<string, string>, hasAvatar: boolean): number {
  let total = hasAvatar ? AVATAR_SCORE : 0;
  for (const key in SCORE_WEIGHTS) {
    if ((form[key] ?? '').length > 0) total += SCORE_WEIGHTS[key];
  }
  return total;
}

type Props = {
  token: string;
  userId: number;
  onLogout: () => void;
  onBackToDirectory: () => void;
  onNameUpdated?: (name: string) => void;
  canManage?: boolean;          // viewer can create/manage brands (member+)
};

export default function ProfileScreen({
  token, userId, onLogout, onBackToDirectory, onNameUpdated, canManage,
}: Props) {
  // Profile opens read-only; the Edit Profile button switches to the form.
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  // Brand management: when set, a full-screen brand form/items screen takes over.
  const [brandNav, setBrandNav] = useState<BrandNav>(null);
  const [brandRefresh, setBrandRefresh] = useState(0); // bump to reload the brands list
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [avatar, setAvatar] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});

  // Industry dropdown (from the JetEngine glossary endpoint).
  const [industryOptions, setIndustryOptions] = useState<Option[]>([]);
  const [industryOpen, setIndustryOpen] = useState(false);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  // JWT rides in a custom header (not Authorization) so it can coexist with the
  // Live Link tunnel's Basic auth. The server accepts both X-IA5-Token and Bearer.
  const authHeaders = { 'X-IA5-Token': token };

  const setField = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  // Load editable fields (/profile) and the avatar URL (/member/{id}) together.
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [pRes, mRes, gRes] = await Promise.all([
          fetch(`${API_BASE}/profile`, { headers: authHeaders }),
          fetch(`${API_BASE}/member/${userId}`),
          fetch(`${API_BASE}/glossary/${INDUSTRY_GLOSSARY_ID}`),
        ]);
        const p = await pRes.json();
        if (!pRes.ok) throw new Error(p?.message || 'Could not load profile');
        const m = mRes.ok ? await mRes.json() : null;
        const g = gRes.ok ? await gRes.json() : null;
        if (!alive) return;
        setIndustryOptions(g?.options || []);

        // WP's get_user_meta returns { key: [value] } — flatten to strings.
        const meta = p.meta || {};
        const val = (k: string) => meta[k]?.[0] ?? '';

        const next: Record<string, string> = { email: p.email || '', phone: p.phone || '' };
        Object.keys(FIELDS).forEach((k) => {
          if (next[k] === undefined) next[k] = val(k);
        });
        TOGGLES.forEach(({ key }) => {
          next[key] = val(key) === 'true' ? 'true' : 'false';
        });

        setForm(next);
        setAvatar(m?.avatar?.full || m?.avatar?.thumbnail || null);
        setRoles(m?.roles || []);
      } catch (e: any) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId, token]);

  // Pick a 1:1 image and POST it to /update-avatar as multipart form-data.
  async function pickAvatar() {
    setError(null);
    setNotice(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Photo library permission is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // form requires 1:1 ratio
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const name = asset.fileName || 'avatar.jpg';
    const type = asset.mimeType || 'image/jpeg';

    setUploading(true);
    try {
      const body = new FormData();
      if (Platform.OS === 'web') {
        const blob = await (await fetch(asset.uri)).blob();
        body.append('avatar', blob, name);
      } else {
        body.append('avatar', { uri: asset.uri, name, type } as any);
      }
      const res = await fetch(`${API_BASE}/update-avatar`, {
        method: 'POST',
        headers: authHeaders, // no Content-Type — fetch sets the multipart boundary
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Upload failed');
      setAvatar(data.avatar?.full || data.avatar?.thumbnail || null);
      setNotice('Photo updated.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  // Save all editable fields via /update-profile.
  async function save() {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      // display_name follows the website: "First Last".
      const display = `${form.first_name || ''} ${form.last_name || ''}`.trim();
      const payload: Record<string, string> = { ...form };
      if (display) payload.name = display;

      const res = await fetch(`${API_BASE}/update-profile`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(payload).toString(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Save failed');
      setNotice('Profile saved.');
      if (display) onNameUpdated?.(display);
      setMode('view'); // back to the read-only view after a successful save
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    if (!currentPw || !newPw) {
      setError('Enter both your current and new password.');
      return;
    }
    setPwSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`${API_BASE}/change-password`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ current_password: currentPw, new_password: newPw }).toString(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Could not change password');
      setNotice(data.message || 'Password updated.');
      setCurrentPw('');
      setNewPw('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPwSaving(false);
    }
  }

  // Render one labelled text field from the FIELDS map.
  const renderField = (key: string) => {
    const f = FIELDS[key];
    return (
      <View key={key} style={styles.fieldRow}>
        <Text style={styles.label}>{f.label.toUpperCase()}</Text>
        <TextInput
          style={[styles.input, f.multiline && styles.multiline]}
          value={form[key] ?? ''}
          onChangeText={(t) => setField(key, t)}
          placeholder={f.label}
          placeholderTextColor={colors.muted}
          autoCapitalize={f.noCaps ? 'none' : 'sentences'}
          keyboardType={f.keyboard}
          multiline={f.multiline}
        />
        {!!f.hint && <Text style={styles.hint}>{f.hint}</Text>}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.flex, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const initial = (form.first_name || '?').charAt(0).toUpperCase();
  const scorePct = Math.max(0, Math.min(100, computeScore(form, !!avatar)));

  // ---------- VIEW MODE (read-only, shown first) ----------
  if (mode === 'view') {
    const viewData: ProfileViewData = {
      name: `${form.first_name || ''} ${form.last_name || ''}`.trim() || form.email || 'Member',
      avatar: avatar ? { full: avatar } : null,
      email: form.email,
      phone: form.phone,
      angkatan: form.angkatan,
      kota_dan_provinsi: form.kota_dan_provinsi,
      roles,
      job_title: form.job_title,
      company: form.company,
      industryLabel: industryOptions.find((o) => o.value === form.industry)?.label || '',
      open_to_opportunities: form.open_to_opportunities,
      open_for_collaboration: form.open_for_collaboration,
      social: {
        linkedin: form.linkedin,
        instagram: form.instagram,
        youtube: form.youtube,
        facebook: form.facebook,
        tiktok: form.tiktok,
      },
    };

    // Brand management takes over the whole screen when active.
    if (brandNav) {
      const back = () => setBrandNav(null);
      const saved = () => { setBrandNav(null); setBrandRefresh((k) => k + 1); };
      if (brandNav.kind === 'items') {
        return <ManageItemsScreen token={token} brandId={brandNav.id} onBack={back} onLogout={onLogout} />;
      }
      return (
        <BrandFormScreen
          token={token}
          brandId={brandNav.kind === 'edit' ? brandNav.id : undefined}
          onBack={back}
          onSaved={saved}
          onLogout={onLogout}
        />
      );
    }

    return (
      <View style={styles.flex}>
      <Header title="My Profile" onBack={onBackToDirectory} onLogout={onLogout} />
      <KeyboardAwareScroll style={styles.flex} contentContainerStyle={styles.content}>
        {/* Completion score — mirrors "SKOR KELENGKAPAN DATA". */}
        <Text style={styles.sectionHead}>SKOR KELENGKAPAN DATA</Text>
        <View style={styles.scoreTrack}>
          <View style={[styles.scoreFill, { width: `${scorePct}%` }]}>
            <Text style={styles.scoreText}>{scorePct}%</Text>
          </View>
        </View>
        <Text style={styles.scoreNote}>
          Untuk menjadi MEMBER membutuhkan SKOR minimal {MEMBER_SCORE}%
        </Text>

        {!!notice && <Text style={styles.notice}>{notice}</Text>}

        <ProfileView data={viewData} />

        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
          onPress={() => {
            setNotice(null);
            setError(null);
            setMode('edit');
          }}
        >
          <Text style={styles.primaryBtnText}>Edit Profile</Text>
        </Pressable>

        {canManage && (
          <View style={styles.mpSection}>
            <Text style={styles.sectionHead}>MARKETPLACE</Text>
            <MyBrandsSection
              key={brandRefresh}
              token={token}
              viewerId={userId}
              onCreate={() => setBrandNav({ kind: 'create' })}
              onEdit={(id) => setBrandNav({ kind: 'edit', id })}
              onItems={(id) => setBrandNav({ kind: 'items', id })}
            />
          </View>
        )}

        <Pressable style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </KeyboardAwareScroll>
      </View>
    );
  }

  // ---------- EDIT MODE (the form) ----------
  return (
    <View style={styles.flex}>
    <Header title="Update Profile" onBack={() => setMode('view')} onLogout={onLogout} />
    <KeyboardAwareScroll style={styles.flex} contentContainerStyle={styles.content}>

      {/* Completion score — mirrors "SKOR KELENGKAPAN DATA". */}
      <Text style={styles.sectionHead}>SKOR KELENGKAPAN DATA</Text>
      <View style={styles.scoreTrack}>
        <View style={[styles.scoreFill, { width: `${scorePct}%` }]}>
          <Text style={styles.scoreText}>{scorePct}%</Text>
        </View>
      </View>
      <Text style={styles.scoreNote}>
        Untuk menjadi MEMBER membutuhkan SKOR minimal {MEMBER_SCORE}%
      </Text>

      {!!notice && <Text style={styles.notice}>{notice}</Text>}
      {!!error && <Text style={styles.error}>{error}</Text>}

      {/* LOGIN DATA */}
      <Text style={styles.sectionHead}>LOGIN DATA</Text>
      <View style={styles.cardSection}>
        <Text style={styles.label}>PROFILE PICTURE</Text>
        <View style={styles.avatarBlock}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarLetter}>{initial}</Text>
            </View>
          )}
          <Pressable style={styles.changePhoto} onPress={pickAvatar} disabled={uploading}>
            <Text style={styles.changePhotoText}>{uploading ? 'Uploading…' : 'Choose File'}</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>Maximum file size: 2 MB · Ratio 1:1</Text>
        {renderField('phone')}
        {renderField('email')}
      </View>

      {/* BIO DATA */}
      <Text style={styles.sectionHead}>BIO DATA</Text>
      <View style={styles.cardSection}>{BIO.map(renderField)}</View>

      {/* KARIR DATA */}
      <Text style={styles.sectionHead}>KARIR DATA</Text>
      <View style={styles.cardSection}>
        {KARIR.map(renderField)}

        {/* Industry — glossary-backed dropdown, matching the website select. */}
        <View style={styles.fieldRow}>
          <Text style={styles.label}>INDUSTRY</Text>
          <Pressable style={styles.select} onPress={() => setIndustryOpen((o) => !o)}>
            <Text
              style={[
                styles.selectText,
                (!form.industry || form.industry === '0') && styles.selectPlaceholder,
              ]}
            >
              {industryOptions.find((o) => o.value === form.industry)?.label || 'Select Industry'}
            </Text>
            <Text style={styles.selectCaret}>{industryOpen ? '▴' : '▾'}</Text>
          </Pressable>
          {industryOpen && (
            <View style={styles.selectMenu}>
              {industryOptions.map((o) => (
                <Pressable
                  key={o.value}
                  style={styles.selectOption}
                  onPress={() => {
                    setField('industry', o.value);
                    setIndustryOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.selectOptionText,
                      form.industry === o.value && styles.selectOptionActive,
                    ]}
                  >
                    {o.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {TOGGLES.map(({ key, label, hint }) => (
          <View key={key} style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{label.toUpperCase()}</Text>
              <Text style={styles.hint}>{hint}</Text>
            </View>
            <Switch
              value={form[key] === 'true'}
              onValueChange={(v) => setField(key, v ? 'true' : 'false')}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.white}
            />
          </View>
        ))}
      </View>

      {/* MEDIA SOSIAL */}
      <Text style={styles.sectionHead}>MEDIA SOSIAL</Text>
      <View style={styles.cardSection}>{SOCIAL.map(renderField)}</View>

      <Pressable
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
        onPress={save}
        disabled={saving}
      >
        <Text style={styles.primaryBtnText}>{saving ? 'Saving…' : 'Submit'}</Text>
      </Pressable>

      {/* Change password (app-only convenience) */}
      <Text style={styles.sectionHead}>CHANGE PASSWORD</Text>
      <View style={styles.cardSection}>
        <View style={styles.fieldRow}>
          <Text style={styles.label}>CURRENT PASSWORD</Text>
          <TextInput
            style={styles.input}
            value={currentPw}
            onChangeText={setCurrentPw}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={colors.muted}
          />
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.label}>NEW PASSWORD</Text>
          <TextInput
            style={styles.input}
            value={newPw}
            onChangeText={setNewPw}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={colors.muted}
          />
        </View>
      </View>
      <Pressable
        style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.85 }]}
        onPress={changePassword}
        disabled={pwSaving}
      >
        <Text style={styles.secondaryBtnText}>{pwSaving ? 'Updating…' : 'Update password'}</Text>
      </Pressable>

      <Pressable style={styles.logoutBtn} onPress={onLogout}>
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
    </KeyboardAwareScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingTop: 40, paddingBottom: 40 },

  screenTitle: { fontFamily: fonts.heading, fontSize: 26, color: colors.primary, marginBottom: 16 },

  cancelRow: { marginBottom: 6 },
  cancelLink: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.primary },

  sectionHead: {
    fontFamily: fonts.headingSemi, fontSize: 13, letterSpacing: 1, color: colors.primary,
    marginBottom: 8, marginTop: 6, paddingLeft: 8, borderLeftWidth: 3, borderLeftColor: colors.primary,
  },

  // Score bar
  scoreTrack: {
    height: 22, borderRadius: 4, backgroundColor: colors.muted, overflow: 'hidden', justifyContent: 'center',
  },
  scoreFill: { height: '100%', backgroundColor: colors.primary, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 8 },
  scoreText: { color: colors.white, fontFamily: fonts.bodySemi, fontSize: 11 },
  scoreNote: { color: colors.primary, fontFamily: fonts.body, fontSize: 12, textAlign: 'center', marginTop: 6, marginBottom: 8 },

  notice: { color: colors.primary, fontFamily: fonts.bodyMedium, textAlign: 'center', marginVertical: 6 },
  error: { color: colors.danger, fontFamily: fonts.bodyMedium, textAlign: 'center', marginVertical: 6 },

  cardSection: {
    backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 8, marginBottom: 14,
  },

  avatarBlock: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 6 },
  avatar: { width: 76, height: 76, borderRadius: 12, backgroundColor: colors.bgAlt },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  avatarLetter: { fontFamily: fonts.heading, fontSize: 30, color: colors.primary },
  changePhoto: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border },
  changePhotoText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.heading },

  fieldRow: { paddingVertical: 8 },
  label: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 0.5, color: colors.primary, marginBottom: 5 },
  input: {
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontFamily: fonts.body, color: colors.heading,
  },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  hint: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 5 },

  // Industry dropdown
  select: {
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  selectText: { fontFamily: fonts.body, fontSize: 15, color: colors.heading },
  selectPlaceholder: { color: colors.muted },
  selectCaret: { fontSize: 14, color: colors.primary },
  selectMenu: {
    marginTop: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    backgroundColor: colors.card, overflow: 'hidden',
  },
  selectOption: { paddingHorizontal: 12, paddingVertical: 11, borderTopWidth: 1, borderTopColor: colors.bgAlt },
  selectOptionText: { fontFamily: fonts.body, fontSize: 15, color: colors.text },
  selectOptionActive: { fontFamily: fonts.bodySemi, color: colors.primary },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border, gap: 12,
  },

  primaryBtn: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 24 },
  primaryBtnPressed: { backgroundColor: colors.accentDark },
  primaryBtnText: { color: colors.white, fontFamily: fonts.headingSemi, fontSize: 16 },
  mpSection: { marginTop: -6, marginBottom: 20 },

  secondaryBtn: {
    borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 24,
    borderWidth: 1.5, borderColor: colors.accent,
  },
  secondaryBtnText: { color: colors.accent, fontFamily: fonts.headingSemi, fontSize: 15 },

  logoutBtn: { alignItems: 'center', paddingVertical: 10 },
  logoutText: { color: colors.danger, fontFamily: fonts.bodySemi, fontSize: 15 },
});
