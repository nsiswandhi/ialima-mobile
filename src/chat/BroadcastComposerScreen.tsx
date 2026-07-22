// Announcement composer for Pengurus Angkatan / Pengurus Komunitas / Pengurus
// IA Lima. Scope defaults to the sender's own angkatan; org-wide is only
// offered when canMessageAll is true. Komunitas targets are resolved by
// fetching the communities the viewer manages (role=manager) — a pengurus
// appointed to more than one community gets one chip per community.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Header, { DrawerProfile, NavTarget } from '../Header';
import { colors, fonts } from '../theme';
import { chatApi, BroadcastScope } from './api';
import { commApi, CommunitySummary } from '../community/api';

type Props = {
  token: string;
  angkatan?: string;
  canMessageAngkatan: boolean;
  canMessageKomunitas: boolean;
  canMessageAll: boolean;
  onBack: () => void;
  onLogout: () => void;
  profile?: DrawerProfile;
  onNavigate?: (target: NavTarget) => void;
  unreadCount?: number;
};

type Option = { key: string; scope: BroadcastScope; komunitasId?: number; label: string };

export default function BroadcastComposerScreen({
  token, angkatan, canMessageAngkatan, canMessageKomunitas, canMessageAll,
  onBack, onLogout, profile, onNavigate, unreadCount,
}: Props) {
  const [komunitasList, setKomunitasList] = useState<CommunitySummary[]>([]);
  const [loadingKomunitas, setLoadingKomunitas] = useState(canMessageKomunitas);

  useEffect(() => {
    if (!canMessageKomunitas) return;
    let alive = true;
    commApi.list(token, { role: 'manager' })
      .then((res) => {
        if (alive) setKomunitasList(res.data);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoadingKomunitas(false);
      });
    return () => {
      alive = false;
    };
  }, [token, canMessageKomunitas]);

  const options: Option[] = [
    ...(canMessageAngkatan ? [{ key: 'angkatan', scope: 'angkatan' as const, label: `Angkatan ${angkatan}` }] : []),
    ...komunitasList.map((c) => ({ key: `komunitas-${c.id}`, scope: 'komunitas' as const, komunitasId: c.id, label: c.name })),
    ...(canMessageAll ? [{ key: 'all', scope: 'all' as const, label: 'Semua anggota' }] : []),
  ];

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = options.find((o) => o.key === selectedKey) ?? options[0] ?? null;

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function send() {
    if (!selected || !title.trim() || !body.trim()) return;
    setSending(true);
    setError(null);
    setNotice(null);
    try {
      await chatApi.sendBroadcast(token, {
        scope: selected.scope,
        scope_ref: selected.scope === 'komunitas' ? selected.komunitasId : undefined,
        title: title.trim(),
        body: body.trim(),
      });
      setTitle('');
      setBody('');
      setNotice('Pengumuman terkirim.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.flex}>
      <Header title="Buat Pengumuman" onBack={onBack} onLogout={onLogout} profile={profile} onNavigate={onNavigate} unreadCount={unreadCount} />
      <View style={styles.content}>
        {loadingKomunitas && options.length === 0 ? (
          <ActivityIndicator color={colors.primary} style={styles.loadingSpinner} />
        ) : options.length === 0 ? (
          <Text style={styles.empty}>Anda belum memiliki target pengumuman yang tersedia.</Text>
        ) : (
          <>
            <Text style={styles.label}>Target</Text>
            <View style={styles.scopeRow}>
              {options.map((o) => (
                <Pressable
                  key={o.key}
                  style={[styles.scopeChip, selected?.key === o.key && styles.scopeChipActive]}
                  onPress={() => setSelectedKey(o.key)}
                >
                  <Text style={[styles.scopeChipText, selected?.key === o.key && styles.scopeChipTextActive]}>{o.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Judul</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Judul pengumuman" />

            <Text style={styles.label}>Isi</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={body}
              onChangeText={setBody}
              placeholder="Isi pengumuman"
              multiline
            />

            {!!notice && <Text style={styles.notice}>{notice}</Text>}
            {!!error && <Text style={styles.error}>{error}</Text>}

            <Pressable
              style={({ pressed }) => [styles.sendBtn, pressed && styles.sendBtnPressed]}
              onPress={send}
              disabled={sending || !selected || !title.trim() || !body.trim()}
            >
              {sending ? <ActivityIndicator color={colors.white} /> : <Text style={styles.sendBtnText}>Kirim</Text>}
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16 },
  empty: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 40 },
  loadingSpinner: { marginTop: 40 },
  label: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.muted, marginTop: 16, marginBottom: 8 },
  scopeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  scopeChip: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  scopeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  scopeChipText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.text },
  scopeChipTextActive: { color: colors.white },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontFamily: fonts.body, fontSize: 14, color: colors.text },
  textarea: { height: 100, textAlignVertical: 'top' },
  notice: { color: colors.primary, textAlign: 'center', marginTop: 16, fontFamily: fonts.bodyMedium },
  error: { color: colors.danger, textAlign: 'center', marginTop: 16, fontFamily: fonts.bodyMedium },
  sendBtn: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  sendBtnPressed: { backgroundColor: colors.accentDark },
  sendBtnText: { color: colors.white, fontFamily: fonts.headingSemi, fontSize: 15 },
});
