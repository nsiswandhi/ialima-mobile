// Pengurus IA Lima admin-only queue: pending "Menjadi Pengurus Angkatan"
// requests with Setuju/Tolak actions. Tolak expands an inline reason textarea
// (required) before confirming — mirrors the Terima/Tolak pattern in
// CommunityDetailScreen's pending-member queue, but Tolak here needs a reason.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts } from '../theme';
import { angkatanApi, PendingRequest } from './api';

type Props = {
  token: string;
};

export default function AngkatanApprovalSection({ token }: Props) {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  function load() {
    setLoading(true);
    angkatanApi
      .list(token)
      .then((r) => setRequests(r.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [token]);

  async function approve(id: number) {
    setActing(true);
    setError(null);
    try {
      await angkatanApi.approve(token, id);
      setRequests((r) => r.filter((x) => x.id !== id));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActing(false);
    }
  }

  async function confirmReject(id: number) {
    if (!rejectReason.trim()) {
      setError('Alasan penolakan wajib diisi.');
      return;
    }
    setActing(true);
    setError(null);
    try {
      await angkatanApi.reject(token, id, rejectReason.trim());
      setRequests((r) => r.filter((x) => x.id !== id));
      setRejectingId(null);
      setRejectReason('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />;
  }
  if (requests.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionHead}>PERSETUJUAN PENGURUS ANGKATAN</Text>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {requests.map((r) => (
        <View key={r.id} style={styles.card}>
          <View style={styles.row}>
            {r.user_avatar?.thumbnail ? (
              <Image source={{ uri: r.user_avatar.thumbnail }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarLetter}>{r.user_name.charAt(0)}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{r.user_name}</Text>
              <Text style={styles.meta}>Angkatan {r.angkatan}</Text>
            </View>
          </View>
          <Text style={styles.reason}>{r.reason}</Text>

          {rejectingId === r.id ? (
            <View style={styles.rejectBox}>
              <TextInput
                style={styles.textarea}
                value={rejectReason}
                onChangeText={setRejectReason}
                placeholder="Alasan penolakan..."
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={3}
              />
              <View style={styles.actionsRow}>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => {
                    setRejectingId(null);
                    setRejectReason('');
                  }}
                >
                  <Text style={styles.cancelText}>Batal</Text>
                </Pressable>
                <Pressable style={styles.rejectConfirmBtn} disabled={acting} onPress={() => confirmReject(r.id)}>
                  <Text style={styles.rejectConfirmText}>Kirim Penolakan</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.actionsRow}>
              <Pressable style={styles.approveBtn} disabled={acting} onPress={() => approve(r.id)}>
                <Text style={styles.approveText}>Setuju</Text>
              </Pressable>
              <Pressable
                style={styles.rejectBtn}
                disabled={acting}
                onPress={() => {
                  setRejectingId(r.id);
                  setRejectReason('');
                }}
              >
                <Text style={styles.rejectText}>Tolak</Text>
              </Pressable>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24 },
  sectionHead: {
    fontFamily: fonts.headingSemi, fontSize: 13, letterSpacing: 1, color: colors.primary,
    marginBottom: 10, paddingLeft: 8, borderLeftWidth: 3, borderLeftColor: colors.primary,
  },
  error: { color: colors.danger, fontFamily: fonts.bodyMedium, fontSize: 12.5, marginBottom: 8 },

  card: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgAlt },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontFamily: fonts.heading, fontSize: 16, color: colors.primary },
  name: { fontFamily: fonts.headingSemi, fontSize: 14.5, color: colors.heading },
  meta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
  reason: { fontFamily: fonts.body, fontSize: 13, color: colors.text, marginTop: 10, lineHeight: 19 },

  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  approveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  approveText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.white },
  rejectBtn: { flex: 1, borderWidth: 1, borderColor: colors.danger, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  rejectText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.danger },

  rejectBox: { marginTop: 12 },
  textarea: {
    backgroundColor: colors.bgAlt, borderRadius: 10, padding: 12, fontFamily: fonts.body, fontSize: 13,
    color: colors.text, minHeight: 70, textAlignVertical: 'top',
  },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  cancelText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.muted },
  rejectConfirmBtn: { flex: 1, backgroundColor: colors.danger, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  rejectConfirmText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.white },
});
