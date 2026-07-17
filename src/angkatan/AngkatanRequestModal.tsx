// "Menjadi Pengurus Angkatan" request form — bottom-sheet modal opened from
// ProfileScreen. Angkatan is always the viewer's own (disabled, read-only);
// only the reason is editable. Mirrors AppointKomunitasSheet's sheet styling.
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts } from '../theme';
import { angkatanApi } from './api';

type Props = {
  token: string;
  angkatan: string;
  visible: boolean;
  onClose: () => void;
  onSubmitted: () => void;
};

export default function AngkatanRequestModal({ token, angkatan, visible, onClose, onSubmitted }: Props) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setReason('');
      setError(null);
    }
  }, [visible]);

  async function submit() {
    if (!reason.trim()) {
      setError('Alasan wajib diisi.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await angkatanApi.submit(token, reason.trim());
      onSubmitted();
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
          <Text style={styles.title}>Menjadi Pengurus Angkatan</Text>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Text style={styles.label}>ANGKATAN</Text>
          <View style={styles.disabledInput}>
            <Text style={styles.disabledText}>{angkatan}</Text>
          </View>

          <Text style={styles.label}>KENAPA HARUS DIPILIH?</Text>
          <TextInput
            style={styles.textarea}
            value={reason}
            onChangeText={setReason}
            placeholder="Ceritakan alasan kamu..."
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={4}
          />

          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
            disabled={submitting}
            onPress={submit}
          >
            <Text style={styles.primaryText}>{submitting ? 'Mengirim…' : 'Kirim Permintaan'}</Text>
          </Pressable>

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
  title: { fontFamily: fonts.heading, fontSize: 18, color: colors.heading, textAlign: 'center', marginBottom: 14 },

  label: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 0.5, color: colors.primary, marginBottom: 5, marginTop: 10 },
  disabledInput: {
    backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12,
  },
  disabledText: { fontFamily: fonts.body, fontSize: 15, color: colors.muted },
  textarea: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, fontFamily: fonts.body, color: colors.heading,
    minHeight: 90, textAlignVertical: 'top',
  },

  primaryBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  pressed: { opacity: 0.85 },
  primaryText: { fontFamily: fonts.headingSemi, fontSize: 15, color: colors.white },
  error: { color: colors.danger, textAlign: 'center', marginBottom: 8, fontFamily: fonts.bodyMedium },
  cancel: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  cancelText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.muted },
});
