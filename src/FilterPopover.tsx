// Small anchored dropdown-style panel — not a full-width/full-screen modal.
// Shared by the Alumni directory filter (angkatan + komunitas) and the
// Artikel category filter (vertical nav-link list).
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { colors } from './theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  topOffset?: number; // distance from the top of the screen, so callers can
                       // anchor it just below their own filter icon/row.
  children: React.ReactNode;
};

export default function FilterPopover({ visible, onClose, topOffset = 100, children }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.panel, { top: topOffset }]} onPress={() => {}}>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  panel: {
    position: 'absolute', right: 16, width: '78%', maxWidth: 300, maxHeight: '65%',
    backgroundColor: colors.card, borderRadius: 16, paddingVertical: 8,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
