// Modal sheet for "Jadikan Pengurus Komunitas" (Pengurus IA Lima only). Lets the
// actor either pick an existing community or create a new one, then appoints the
// target member as its manager via POST /appoint-pengurus-komunitas.
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { colors, fonts } from '../theme';
import { commApi, CommunitySummary } from './api';

type Props = {
  token: string;
  targetId: number;
  targetName?: string;
  visible: boolean;
  onClose: () => void;
  onDone: (communityName: string) => void;
};

export default function AppointKomunitasSheet({ token, targetId, targetName, visible, onClose, onDone }: Props) {
  const [mode, setMode] = useState<'pick' | 'create'>('pick');
  const [communities, setCommunities] = useState<CommunitySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    if (!visible) return;
    setMode('pick');
    setError(null);
    setName('');
    setCategory('');
    setLoading(true);
    commApi
      .list(token, {})
      .then((r) => setCommunities(r.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [visible]);

  async function appoint(fields: { community_id?: number; name?: string; category?: string }) {
    setSubmitting(true);
    setError(null);
    try {
      const r = await commApi.appointKomunitas(token, { target_id: targetId, ...fields });
      onDone(r.community.name);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Jadikan Pengurus Komunitas</Text>
          {!!targetName && <Text style={styles.sub}>{targetName}</Text>}

          <View style={styles.tabs}>
            <Pressable style={[styles.tab, mode === 'pick' && styles.tabActive]} onPress={() => setMode('pick')}>
              <Text style={[styles.tabText, mode === 'pick' && styles.tabTextActive]}>Pilih Komunitas</Text>
            </Pressable>
            <Pressable style={[styles.tab, mode === 'create' && styles.tabActive]} onPress={() => setMode('create')}>
              <Text style={[styles.tabText, mode === 'create' && styles.tabTextActive]}>Buat Baru</Text>
            </Pressable>
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}

          {mode === 'pick' ? (
            loading ? (
              <ActivityIndicator style={{ marginVertical: 24 }} color={colors.primary} />
            ) : (
              <ScrollView style={styles.list}>
                {communities.length === 0 ? (
                  <Text style={styles.empty}>Belum ada komunitas. Buat baru.</Text>
                ) : (
                  communities.map((c) => (
                    <Pressable
                      key={c.id}
                      style={styles.row}
                      disabled={submitting}
                      onPress={() => appoint({ community_id: c.id })}
                    >
                      <Text style={styles.rowName}>{c.name}</Text>
                      <Text style={styles.rowMeta}>{c.member_count} anggota</Text>
                    </Pressable>
                  ))
                )}
              </ScrollView>
            )
          ) : (
            <View style={styles.createBox}>
              <TextInput
                style={styles.input}
                placeholder="Nama komunitas"
                placeholderTextColor={colors.muted}
                value={name}
                onChangeText={setName}
              />
              <TextInput
                style={styles.input}
                placeholder="Kategori (opsional)"
                placeholderTextColor={colors.muted}
                value={category}
                onChangeText={setCategory}
                autoCapitalize="none"
              />
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                disabled={submitting || name.trim() === ''}
                onPress={() => appoint({ name, category })}
              >
                <Text style={styles.primaryText}>{submitting ? 'Memproses…' : 'Buat & Angkat'}</Text>
              </Pressable>
            </View>
          )}

          <Pressable style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>Batal</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 14 },
  title: { fontFamily: fonts.heading, fontSize: 18, color: colors.heading, textAlign: 'center' },
  sub: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 2 },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 16 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.muted },
  tabTextActive: { color: colors.white },
  list: { marginTop: 14, maxHeight: 280 },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowName: { fontFamily: fonts.headingSemi, fontSize: 15, color: colors.heading },
  rowMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
  empty: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 20 },
  createBox: { marginTop: 14 },
  input: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: fonts.body, color: colors.heading, marginBottom: 12,
  },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  pressed: { opacity: 0.85 },
  primaryText: { fontFamily: fonts.headingSemi, fontSize: 15, color: colors.white },
  error: { color: colors.danger, textAlign: 'center', marginTop: 12, fontFamily: fonts.bodyMedium },
  cancel: { alignItems: 'center', paddingVertical: 14, marginTop: 6 },
  cancelText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.muted },
});
