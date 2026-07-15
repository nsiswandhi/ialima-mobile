// "Lainnya" overflow picker — every article category past the top 5
// shown as chips on ArtikelScreen. Scoped to this screen only.
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { ArtikelCategory } from './api';

type Props = {
  categories: ArtikelCategory[];
  onSelect: (slug: string) => void;
  onClose: () => void;
};

export default function ArtikelCategoryModal({ categories, onSelect, onClose }: Props) {
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Semua Kategori</Text>
          <ScrollView contentContainerStyle={styles.grid}>
            {categories.map((c) => (
              <Pressable key={c.slug} style={styles.cell} onPress={() => { onSelect(c.slug); onClose(); }}>
                <Text style={styles.cellText}>{c.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
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
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  title: { fontFamily: fonts.headingSemi, fontSize: 16, color: colors.heading, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { width: '47%', borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  cellText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text },
  cancelBtn: { alignItems: 'center', marginTop: 16 },
  cancelText: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
});
