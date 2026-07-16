// Announcement composer for Pengurus Angkatan / Pengurus Komunitas / Pengurus
// IA Lima. Scope defaults to the sender's own angkatan; org-wide is only
// offered when canMessageAll is true.
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Header, { DrawerProfile, NavTarget } from '../Header';
import { colors, fonts } from '../theme';
import { chatApi, BroadcastScope } from './api';

type Props = {
  token: string;
  angkatan?: string;
  canMessageAngkatan: boolean;
  canMessageKomunitas: boolean;
  canMessageAll: boolean;
  komunitasId?: number; // the community this pengurus manages, if canMessageKomunitas
  komunitasName?: string;
  onBack: () => void;
  onLogout: () => void;
  profile?: DrawerProfile;
  onNavigate?: (target: NavTarget) => void;
};

export default function BroadcastComposerScreen({
  token, angkatan, canMessageAngkatan, canMessageKomunitas, canMessageAll, komunitasId, komunitasName,
  onBack, onLogout, profile, onNavigate,
}: Props) {
  const options: { scope: BroadcastScope; label: string }[] = [
    ...(canMessageAngkatan ? [{ scope: 'angkatan' as const, label: `Angkatan ${angkatan}` }] : []),
    ...(canMessageKomunitas && komunitasId ? [{ scope: 'komunitas' as const, label: komunitasName || 'Komunitas saya' }] : []),
    ...(canMessageAll ? [{ scope: 'all' as const, label: 'Semua anggota' }] : []),
  ];

  const [scope, setScope] = useState<BroadcastScope | null>(options[0]?.scope ?? null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function send() {
    if (!scope || !title.trim() || !body.trim()) return;
    setSending(true);
    setError(null);
    setNotice(null);
    try {
      await chatApi.sendBroadcast(token, {
        scope,
        scope_ref: scope === 'komunitas' ? komunitasId : undefined,
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
      <Header title="Buat Pengumuman" onBack={onBack} onLogout={onLogout} profile={profile} onNavigate={onNavigate} />
      <View style={styles.content}>
        {options.length === 0 ? (
          <Text style={styles.empty}>Fitur pengumuman komunitas akan segera hadir.</Text>
        ) : (
          <>
            <Text style={styles.label}>Target</Text>
            <View style={styles.scopeRow}>
              {options.map((o) => (
                <Pressable
                  key={o.scope}
                  style={[styles.scopeChip, scope === o.scope && styles.scopeChipActive]}
                  onPress={() => setScope(o.scope)}
                >
                  <Text style={[styles.scopeChipText, scope === o.scope && styles.scopeChipTextActive]}>{o.label}</Text>
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
              disabled={sending || !scope || !title.trim() || !body.trim()}
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
