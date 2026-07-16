// Account deletion — required by Android/iOS store policy for any app that
// supports account creation. Explains what gets removed, is explicit that
// the action is irreversible, and gates the destructive call behind typing
// "DELETE" so it can't be triggered by an accidental tap.
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE } from './config';
import { colors, fonts } from './theme';
import Header, { DrawerProfile, NavTarget } from './Header';

type Props = {
  token: string;
  onBack: () => void;
  onLogout: () => void;
  onDeleted: () => void; // account gone — reset auth state, distinct from a normal logout
  profile?: DrawerProfile;
  onNavigate?: (target: NavTarget) => void;
};

const DELETED_ITEMS = [
  'Profil, foto profil, dan seluruh data pribadi kamu',
  'Brand & produk yang kamu miliki di Marketplace',
  'Komunitas yang kamu buat sendiri (jika kamu satu-satunya anggota)',
  'Artikel yang kamu tulis',
  'Riwayat "Saya Kenal Dia" / "Dia Kenal Saya"',
  'Notifikasi dan token perangkat untuk push notification',
];

export default function DeleteAccountScreen({ token, onBack, onLogout, onDeleted, profile, onNavigate }: Props) {
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = confirmText.trim().toUpperCase() === 'DELETE';

  function confirmAndDelete() {
    Alert.alert(
      'Hapus akun secara permanen?',
      'Tindakan ini tidak dapat dibatalkan. Semua data kamu akan dihapus.',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Hapus Akun', style: 'destructive', onPress: doDelete },
      ],
    );
  }

  async function doDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/me/delete`, {
        method: 'POST',
        headers: { 'X-IA5-Token': token },
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.message || 'Gagal menghapus akun');
      onDeleted();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <View style={styles.flex}>
      <Header title="Delete Account" onBack={onBack} onLogout={onLogout} profile={profile} onNavigate={onNavigate} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.warningBox}>
          <Ionicons name="warning-outline" size={22} color={colors.danger} />
          <Text style={styles.warningText}>
            Menghapus akun bersifat permanen dan tidak dapat dibatalkan.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Data yang akan dihapus</Text>
        {DELETED_ITEMS.map((item) => (
          <View key={item} style={styles.itemRow}>
            <Ionicons name="close-circle" size={16} color={colors.danger} />
            <Text style={styles.itemText}>{item}</Text>
          </View>
        ))}

        <Text style={styles.note}>
          Pesan yang sudah kamu kirim ke anggota lain akan tetap muncul di percakapan mereka, namun
          nama kamu akan ditampilkan sebagai "Pengguna Terhapus". Komunitas yang kamu buat dan masih
          memiliki anggota lain tidak akan dihapus — kepengurusan akan dialihkan ke anggota lain.
        </Text>

        <Text style={styles.confirmLabel}>
          Ketik <Text style={styles.confirmWord}>DELETE</Text> untuk mengonfirmasi
        </Text>
        <TextInput
          style={styles.confirmInput}
          value={confirmText}
          onChangeText={setConfirmText}
          placeholder="DELETE"
          placeholderTextColor={colors.muted}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[styles.deleteBtn, (!canDelete || deleting) && styles.deleteBtnDisabled]}
          onPress={confirmAndDelete}
          disabled={!canDelete || deleting}
        >
          {deleting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.deleteBtnText}>Hapus Akun Saya</Text>}
        </Pressable>

        <Pressable style={styles.cancelBtn} onPress={onBack}>
          <Text style={styles.cancelText}>Batal</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 48 },

  warningBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FDECEC',
    borderRadius: 12, padding: 14, marginBottom: 20,
  },
  warningText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 13, color: '#7A2E24', lineHeight: 18 },

  sectionTitle: { fontFamily: fonts.headingSemi, fontSize: 15, color: colors.heading, marginBottom: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  itemText: { flex: 1, fontFamily: fonts.body, fontSize: 13.5, color: colors.text, lineHeight: 19 },

  note: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted, lineHeight: 18, marginTop: 8, marginBottom: 24 },

  confirmLabel: { fontFamily: fonts.body, fontSize: 13.5, color: colors.text, marginBottom: 8 },
  confirmWord: { fontFamily: fonts.bodySemi, color: colors.danger },
  confirmInput: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.heading, marginBottom: 20,
  },

  error: { color: colors.danger, textAlign: 'center', marginBottom: 12, fontFamily: fonts.bodyMedium },

  deleteBtn: { backgroundColor: colors.danger, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  deleteBtnDisabled: { opacity: 0.4 },
  deleteBtnText: { color: colors.white, fontFamily: fonts.headingSemi, fontSize: 16 },

  cancelBtn: { alignItems: 'center', marginTop: 14, paddingVertical: 8 },
  cancelText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
});
