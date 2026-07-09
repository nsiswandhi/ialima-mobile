import React, { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from './theme';

const logo = require('../assets/logo.png');

type Props = {
  title: string;
  onBack?: () => void;   // shows a back chevron when provided
  onLogout?: () => void; // shows the burger menu (with Log out) when provided
};

// Shared top bar used on every screen after login (and Sign Up): the brand
// green bar with the logo overlapping on the left, the page title, an optional
// back chevron, and — when signed in — a burger menu that opens Log out.
export default function Header({ title, onBack, onLogout }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    // Pad the top by the status-bar inset so the bar isn't drawn under the
    // status bar (the app runs edge-to-edge on Android by default).
    <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
      {/* Logo overlaps the green bar, spilling onto the content below. */}
      <Image
        source={logo}
        style={[styles.headerLogo, { top: insets.top + 8 }]}
        resizeMode="contain"
      />

      <View style={styles.headerRight}>
        {!!onBack && (
          <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
        )}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {!!onLogout && (
          <Pressable onPress={() => setMenuOpen(true)} hitSlop={10} style={styles.burger}>
            <View style={styles.burgerLine} />
            <View style={styles.burgerLine} />
            <View style={styles.burgerLine} />
          </Pressable>
        )}
      </View>

      {/* Burger drawer — mobile-specific items will be added later. */}
      {!!onLogout && (
        <Modal
          visible={menuOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuOpen(false)}
        >
          <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
            <Pressable style={styles.menuPanel} onPress={() => {}}>
              <Text style={styles.menuHeading}>Menu</Text>
              <Pressable
                style={styles.menuLogout}
                onPress={() => {
                  setMenuOpen(false);
                  onLogout();
                }}
              >
                <Text style={styles.menuLogoutText}>Log out</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14,
    backgroundColor: colors.primary, overflow: 'visible', zIndex: 10,
  },
  headerLogo: { position: 'absolute', left: 14, top: 8, width: 78, height: 78, zIndex: 11 },

  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1, maxWidth: '82%' },
  backBtn: { paddingRight: 2 },
  backArrow: { color: colors.white, fontSize: 30, lineHeight: 30, fontFamily: fonts.heading },
  title: { fontFamily: fonts.heading, fontSize: 18, color: colors.white, flexShrink: 1 },

  burger: { width: 26, height: 20, justifyContent: 'space-between', paddingVertical: 2 },
  burgerLine: { height: 2.5, borderRadius: 2, backgroundColor: colors.white },

  menuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', flexDirection: 'row', justifyContent: 'flex-end' },
  menuPanel: { width: 250, backgroundColor: colors.card, paddingTop: 44, paddingHorizontal: 10 },
  menuHeading: { fontFamily: fonts.heading, fontSize: 20, color: colors.primary, paddingHorizontal: 10, marginBottom: 10 },
  menuLogout: { paddingVertical: 14, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8 },
  menuLogoutText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.danger },
});
