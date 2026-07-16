// Review modal shown to Pengurus IA Lima for a single pending article —
// Approve / Reject-with-reason / Delete. Mirrors event review modal patterns.
import React, { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts } from '../theme';
import { ArtikelSummary } from './api';

type Props = {
  article: ArtikelSummary | null;
  onClose: () => void;
  onApprove: (id: number) => void;
  onReject: (id: number, reason: string) => void;
  onDelete: (id: number) => void;
};

export default function ArtikelReviewModal({ article, onClose, onApprove, onReject, onDelete }: Props) {
  const [reason, setReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  if (!article) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{article.title}</Text>
          <Text style={styles.meta}>{article.author_name}</Text>

          {showReject ? (
            <>
              <TextInput
                style={styles.reasonInput}
                placeholder="Alasan penolakan"
                value={reason}
                onChangeText={setReason}
                multiline
              />
              <Pressable
                style={[styles.btn, styles.rejectBtn]}
                onPress={() => { if (reason.trim()) onReject(article.id, reason.trim()); }}
              >
                <Text style={styles.rejectBtnText}>Kirim Penolakan</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable style={[styles.btn, styles.approveBtn]} onPress={() => onApprove(article.id)}>
                <Text style={styles.approveBtnText}>Setujui</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.rejectBtn]} onPress={() => setShowReject(true)}>
                <Text style={styles.rejectBtnText}>Tolak</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.deleteBtn]}
                onPress={() => {
                  Alert.alert('Kamu yakin menghapus ini?', undefined, [
                    { text: 'Batal', style: 'cancel' },
                    { text: 'Hapus', style: 'destructive', onPress: () => onDelete(article.id) },
                  ]);
                }}
              >
                <Text style={styles.deleteBtnText}>Hapus</Text>
              </Pressable>
            </>
          )}
          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Tutup</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  title: { fontFamily: fonts.headingSemi, fontSize: 16, color: colors.heading, marginBottom: 4 },
  meta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginBottom: 16 },
  reasonInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, minHeight: 80, fontFamily: fonts.body, fontSize: 13, marginBottom: 12, textAlignVertical: 'top' },
  btn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 10 },
  approveBtn: { backgroundColor: colors.primary },
  approveBtnText: { color: '#fff', fontFamily: fonts.bodyMedium, fontSize: 14 },
  rejectBtn: { backgroundColor: '#FDECEC' },
  rejectBtnText: { color: '#B3261E', fontFamily: fonts.bodyMedium, fontSize: 14 },
  deleteBtn: { backgroundColor: '#F5F5F5' },
  deleteBtnText: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 14 },
  cancelBtn: { alignItems: 'center', marginTop: 4 },
  cancelText: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
});
