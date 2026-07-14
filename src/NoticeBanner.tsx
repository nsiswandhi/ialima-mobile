import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { fonts } from './theme';

// Dismissable success banner shown after a form submit. Self-contained
// margins so it drops in directly under a Header with no surrounding
// padding required from the parent — mirrors MyKomunitasScreen's
// already-shipped noticeBanner style.
export default function NoticeBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <Pressable style={styles.banner} onPress={onDismiss}>
      <Text style={styles.text}>{message}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#EAF3DE', borderRadius: 12, padding: 14,
    marginHorizontal: 12, marginTop: 10, marginBottom: 4,
  },
  text: { fontFamily: fonts.bodyMedium, fontSize: 13, color: '#3B6D11', lineHeight: 19 },
});
