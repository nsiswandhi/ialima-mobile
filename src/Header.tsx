import React, { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from './theme';

const logo = require('../assets/logo.png');

// Everything the drawer's profile card needs — same field shapes /member/{id}
// already returns and ProfileView.tsx already renders elsewhere in the app.
export type DrawerProfile = {
  name: string;
  avatar?: { full?: string; thumbnail?: string } | null;
  angkatan?: string;
  city?: string;
  roles?: string[];
};

export type NavTarget =
  | 'dashboard' | 'profile' | 'my-marketplace' | 'my-komunitas'
  | 'about' | 'review' | 'privacy' | 'terms';

type Props = {
  title: string;
  onBack?: () => void;   // shows a back chevron when provided
  onLogout?: () => void; // shows the burger menu when provided
  profile?: DrawerProfile;      // when set (with onNavigate), the full drawer renders
  onNavigate?: (target: NavTarget) => void;
};

type MenuRow = { icon: keyof typeof Ionicons.glyphMap; label: string; target?: NavTarget; comingSoon?: boolean };

const PROFILE_ROWS: MenuRow[] = [
  { icon: 'grid-outline', label: 'Dashboard', target: 'dashboard' },
  { icon: 'person-outline', label: 'My Profile', target: 'profile' },
  { icon: 'storefront-outline', label: 'My Marketplace', target: 'my-marketplace' },
  { icon: 'people-circle-outline', label: 'My Komunitas', target: 'my-komunitas' },
  { icon: 'calendar-outline', label: 'My Event', comingSoon: true },
  { icon: 'newspaper-outline', label: 'My Article', comingSoon: true },
];

const APP_ROWS: MenuRow[] = [
  { icon: 'information-circle-outline', label: 'About LIMA Circle', target: 'about' },
  { icon: 'star-outline', label: 'Review App', target: 'review' },
  { icon: 'shield-checkmark-outline', label: 'Privacy Policy', target: 'privacy' },
  { icon: 'document-text-outline', label: 'Terms and Conditions', target: 'terms' },
];

// Shared top bar used on every screen after login (and Sign Up): the brand
// green bar with the logo overlapping on the left, the page title, an optional
// back chevron, and — when signed in — a burger menu. When `profile` +
// `onNavigate` are supplied (the top-level tab screens), the burger opens the
// full drawer (profile card + nav links + app links + log out). Otherwise it
// falls back to a bare "Log out" panel, unchanged from before — every detail /
// form screen keeps that simpler behavior with no code changes on their end.
export default function Header({ title, onBack, onLogout, profile, onNavigate }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const close = () => setMenuOpen(false);
  const navigate = (target: NavTarget) => {
    close();
    onNavigate?.(target);
  };

  const avatarUri = profile?.avatar?.full || profile?.avatar?.thumbnail || null;
  const initial = (profile?.name || '?').charAt(0).toUpperCase();

  return (
    // Pad the top by the status-bar inset so the bar isn't drawn under the
    // status bar (the app runs edge-to-edge on Android by default).
    <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
      {/* Logo overlaps the green bar, spilling onto the content below. Tapping it
          jumps back to Dashboard wherever a nav handler is available. */}
      <Pressable
        disabled={!onNavigate}
        onPress={() => onNavigate?.('dashboard')}
        style={[styles.headerLogo, { top: insets.top + 8 }]}
        hitSlop={8}
      >
        <Image source={logo} style={styles.headerLogoImg} resizeMode="contain" />
      </Pressable>

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

      {!!onLogout && (
        <Modal
          visible={menuOpen}
          transparent
          animationType="fade"
          onRequestClose={close}
        >
          {profile && onNavigate ? (
            <View style={styles.menuBackdropLeft}>
              <Pressable style={styles.menuFill} onPress={close} />
              <View style={[styles.drawer, { paddingTop: insets.top + 18 }]}>
                {/* Profile card */}
                <View style={styles.profileCard}>
                  <View style={styles.profileRow}>
                    {avatarUri ? (
                      <Image source={{ uri: avatarUri }} style={styles.profileAvatar} />
                    ) : (
                      <View style={[styles.profileAvatar, styles.profileAvatarFallback]}>
                        <Text style={styles.profileAvatarLetter}>{initial}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.profileName} numberOfLines={1}>{profile.name}</Text>
                      <View style={styles.profileMetaRow}>
                        {!!profile.angkatan && (
                          <View style={styles.profileBadge}>
                            <Text style={styles.profileBadgeText}>Angkatan {profile.angkatan}</Text>
                          </View>
                        )}
                        {!!profile.city && <Text style={styles.profileCity}>{profile.city}</Text>}
                      </View>
                    </View>
                  </View>
                  {(profile.roles?.length ?? 0) > 0 && (
                    <View style={styles.profileRoleRow}>
                      {profile.roles!.map((r) => (
                        <View key={r} style={styles.profileRolePill}>
                          <Text style={styles.profileRolePillText}>{r}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <ScrollView
                  style={styles.drawerScroll}
                  contentContainerStyle={styles.drawerScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.sectionLabel}>PROFIL</Text>
                  {PROFILE_ROWS.map((row) => (
                    <Pressable
                      key={row.label}
                      style={styles.menuRow}
                      disabled={row.comingSoon}
                      onPress={() => row.target && navigate(row.target)}
                    >
                      <Ionicons
                        name={row.icon}
                        size={19}
                        color={row.comingSoon ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.9)'}
                      />
                      <Text style={[styles.menuRowText, row.comingSoon && styles.menuRowTextDim]}>
                        {row.label}
                      </Text>
                      {row.comingSoon && (
                        <View style={styles.comingSoonPill}>
                          <Text style={styles.comingSoonPillText}>Segera</Text>
                        </View>
                      )}
                    </Pressable>
                  ))}

                  <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>APLIKASI</Text>
                  {APP_ROWS.map((row) => (
                    <Pressable
                      key={row.label}
                      style={styles.menuRow}
                      onPress={() => row.target && navigate(row.target)}
                    >
                      <Ionicons name={row.icon} size={19} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.menuRowText}>{row.label}</Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <View style={[styles.logoutRow, { paddingBottom: insets.bottom + 12 }]}>
                  <Pressable
                    style={styles.menuRow}
                    onPress={() => {
                      close();
                      onLogout();
                    }}
                  >
                    <Ionicons name="log-out-outline" size={19} color={colors.accent} />
                    <Text style={styles.logoutText}>Log out</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : (
            <Pressable style={styles.menuBackdrop} onPress={close}>
              <Pressable style={styles.menuPanel} onPress={() => {}}>
                <Text style={styles.menuHeading}>Menu</Text>
                <Pressable
                  style={styles.menuLogout}
                  onPress={() => {
                    close();
                    onLogout();
                  }}
                >
                  <Text style={styles.menuLogoutText}>Log out</Text>
                </Pressable>
              </Pressable>
            </Pressable>
          )}
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
  headerLogoImg: { width: '100%', height: '100%' },

  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1, maxWidth: '82%' },
  backBtn: { paddingRight: 2 },
  backArrow: { color: colors.white, fontSize: 30, lineHeight: 30, fontFamily: fonts.heading },
  title: { fontFamily: fonts.heading, fontSize: 18, color: colors.white, flexShrink: 1 },

  burger: { width: 26, height: 20, justifyContent: 'space-between', paddingVertical: 2 },
  burgerLine: { height: 2.5, borderRadius: 2, backgroundColor: colors.white },

  // ---- Simple fallback drawer (detail/form screens — unchanged from before) ----
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', flexDirection: 'row', justifyContent: 'flex-end' },
  menuPanel: { width: 250, backgroundColor: colors.card, paddingTop: 44, paddingHorizontal: 10 },
  menuHeading: { fontFamily: fonts.heading, fontSize: 20, color: colors.primary, paddingHorizontal: 10, marginBottom: 10 },
  menuLogout: { paddingVertical: 14, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8 },
  menuLogoutText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.danger },

  // ---- Full drawer (top-level tab screens) ----
  menuBackdropLeft: { flex: 1, flexDirection: 'row' },
  menuFill: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  drawer: { width: '78%', maxWidth: 300, backgroundColor: colors.primaryDark, flexDirection: 'column' },
  drawerScroll: { flex: 1, paddingHorizontal: 10, paddingTop: 10 },
  drawerScrollContent: { paddingBottom: 16 },

  profileCard: { paddingHorizontal: 18, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.15)' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.15)' },
  profileAvatarFallback: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)' },
  profileAvatarLetter: { fontFamily: fonts.heading, fontSize: 20, color: colors.white },
  profileName: { fontFamily: fonts.headingSemi, fontSize: 15, color: colors.white },
  profileMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  profileBadge: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  profileBadgeText: { fontFamily: fonts.bodyMedium, fontSize: 10, color: colors.white },
  profileCity: { fontFamily: fonts.body, fontSize: 11, color: 'rgba(255,255,255,0.75)' },
  profileRoleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  profileRolePill: { backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  profileRolePillText: { fontFamily: fonts.bodyMedium, fontSize: 10, color: colors.white },

  sectionLabel: { color: 'rgba(255,255,255,0.5)', fontFamily: fonts.bodySemi, fontSize: 10, letterSpacing: 0.6, marginHorizontal: 10, marginBottom: 6, marginTop: 4 },
  sectionLabelSpaced: { marginTop: 14 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, paddingHorizontal: 10 },
  menuRowText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.white, flex: 1 },
  menuRowTextDim: { color: 'rgba(255,255,255,0.5)' },
  comingSoonPill: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  comingSoonPillText: { fontFamily: fonts.bodyMedium, fontSize: 9, color: 'rgba(255,255,255,0.7)' },

  logoutRow: { paddingHorizontal: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' },
  logoutText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.accent, flex: 1 },
});
