import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from './theme';
import Header, { DrawerProfile, NavTarget } from './Header';

type Props = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onBack: () => void;
  onLogout: () => void;
  profile?: DrawerProfile;
  onNavigate?: (target: NavTarget) => void;
  unreadCount?: number;
};

// Placeholder for Phase 3 destinations (Event, Article) — wired into the nav
// shell now so it doesn't need to change again once those features ship.
export default function ComingSoonScreen({ title, icon, onBack, onLogout, profile, onNavigate, unreadCount }: Props) {
  return (
    <View style={styles.flex}>
      <Header title={title} onBack={onBack} onLogout={onLogout} profile={profile} onNavigate={onNavigate} unreadCount={unreadCount} />
      <View style={styles.center}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={34} color={colors.primary} />
        </View>
        <Text style={styles.heading}>Segera hadir</Text>
        <Text style={styles.subtitle}>{title} akan tersedia di update berikutnya.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.bgAlt,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  heading: { fontFamily: fonts.heading, fontSize: 18, color: colors.heading, marginBottom: 6 },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, textAlign: 'center' },
});
