// "My Artikel" screen — Draft Saya, Artikel Saya, and (for Pengurus IA
// Lima) Persetujuan. Local list/detail/form view state machine, mirrors
// MyEventScreen patterns.
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { artikelApi, ArtikelSummary } from './api';
import ArtikelDetailScreen from './ArtikelDetailScreen';
import ArtikelFormScreen from './ArtikelFormScreen';
import ArtikelReviewModal from './ArtikelReviewModal';
import { useAndroidBack } from '../useAndroidBack';

type Props = { token: string; isIALima: boolean };
type View3 = 'list' | 'detail' | 'form';

function Row({ article, onPress }: { article: ArtikelSummary; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={onPress}>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>{article.title}</Text>
        <Text style={styles.rowMeta}>
          {article.status === 'pending' ? 'Menunggu review' : article.status === 'draft' ? 'Draft' : 'Terbit'}
        </Text>
      </View>
    </Pressable>
  );
}

export default function MyArtikelScreen({ token, isIALima }: Props) {
  const [view, setView] = useState<View3>('list');
  const [mine, setMine] = useState<ArtikelSummary[]>([]);
  const [pending, setPending] = useState<ArtikelSummary[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [reviewing, setReviewing] = useState<ArtikelSummary | null>(null);

  const load = useCallback(() => {
    artikelApi.list(token, { role: 'mine', per_page: 50 }).then((r) => setMine(r.data));
    if (isIALima) {
      artikelApi.list(token, { status: 'pending', per_page: 50 }).then((r) => setPending(r.data));
    }
  }, [token, isIALima]);

  useEffect(() => { load(); }, [load]);

  useAndroidBack(() => {
    if (view !== 'list') {
      setView('list');
      return true;
    }
    return false;
  });

  const drafts = mine.filter((a) => a.status === 'draft');
  const submitted = mine.filter((a) => a.status !== 'draft');

  const approve = async (id: number) => { await artikelApi.approve(token, id); setReviewing(null); load(); };
  const reject = async (id: number, reason: string) => { await artikelApi.reject(token, id, reason); setReviewing(null); load(); };
  const remove = async (id: number) => { await artikelApi.remove(token, id); setReviewing(null); load(); };

  if (view === 'detail' && activeId) {
    return <ArtikelDetailScreen token={token} articleId={activeId} onBack={() => { setView('list'); load(); }} onEdit={() => setView('form')} />;
  }
  if (view === 'form') {
    return (
      <ArtikelFormScreen
        token={token}
        articleId={activeId}
        isIALima={isIALima}
        onDone={() => { setView('list'); load(); }}
        onCancel={() => setView('list')}
      />
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>DRAFT SAYA</Text>
      {drafts.map((a) => (
        <Row key={a.id} article={a} onPress={() => { setActiveId(a.id); setView('form'); }} />
      ))}
      <Pressable style={styles.newBtn} onPress={() => { setActiveId(null); setView('form'); }}>
        <Text style={styles.newBtnText}>+ Tulis Artikel Baru</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>ARTIKEL SAYA</Text>
      {submitted.map((a) => (
        <Row key={a.id} article={a} onPress={() => { setActiveId(a.id); setView('detail'); }} />
      ))}

      {isIALima && (
        <>
          <Text style={styles.sectionTitle}>PERSETUJUAN</Text>
          {pending.map((a) => (
            <Row key={a.id} article={a} onPress={() => setReviewing(a)} />
          ))}
        </>
      )}

      <ArtikelReviewModal
        article={reviewing}
        onClose={() => setReviewing(null)}
        onApprove={approve}
        onReject={reject}
        onDelete={remove}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 60 },
  sectionTitle: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.muted, marginTop: 24, marginBottom: 10, letterSpacing: 0.5 },
  row: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10 },
  rowPressed: { opacity: 0.85 },
  rowBody: {},
  rowTitle: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.heading, marginBottom: 4 },
  rowMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  newBtn: { alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  newBtnText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.primary },
});
