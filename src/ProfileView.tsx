import React from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from './theme';

// Read-only presentation of a member's public profile. Shared by the directory
// Member Detail screen and the Profile tab's view mode so both look identical.
export type ProfileViewData = {
  name: string;
  avatar?: { full?: string; thumbnail?: string } | null;
  // Contact — only passed for the signed-in user's own profile.
  email?: string;
  phone?: string;
  angkatan?: string;
  kota_dan_provinsi?: string;
  roles?: string[]; // alumni role labels (Member, Pengurus …); others filtered out server-side
  job_title?: string;
  company?: string;
  industryLabel?: string; // resolved glossary label (not the raw value)
  open_to_opportunities?: string; // 'true' | 'false'
  open_for_collaboration?: string;
  social?: Record<string, string>;
};

type SocialDef = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};
const SOCIALS: SocialDef[] = [
  { key: 'linkedin', label: 'LinkedIn', icon: 'logo-linkedin', color: '#0A66C2' },
  { key: 'instagram', label: 'Instagram', icon: 'logo-instagram', color: '#E4405F' },
  { key: 'youtube', label: 'YouTube', icon: 'logo-youtube', color: '#FF0000' },
  { key: 'facebook', label: 'Facebook', icon: 'logo-facebook', color: '#1877F2' },
  { key: 'tiktok', label: 'TikTok', icon: 'logo-tiktok', color: '#000000' },
];

const filled = (v?: string) => !!(v || '').trim();

// Some stored values are bare handles rather than full URLs; make them openable.
const toUrl = (v: string) => (/^https?:\/\//i.test(v.trim()) ? v.trim() : `https://${v.trim()}`);

export default function ProfileView({ data }: { data: ProfileViewData }) {
  const avatarUri = data.avatar?.full || data.avatar?.thumbnail || null;
  const initial = (data.name || '?').charAt(0).toUpperCase();
  const socials = SOCIALS.filter((s) => filled(data.social?.[s.key]));
  const hasCareer = filled(data.job_title) || filled(data.company) || filled(data.industryLabel);
  const hasContact = filled(data.email) || filled(data.phone);

  const InfoRow = ({ label, value }: { label: string; value?: string }) =>
    filled(value) ? (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    ) : null;

  return (
    <View>
      {/* Identity card */}
      <View style={styles.hero}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarLetter}>{initial}</Text>
          </View>
        )}
        <Text style={styles.name}>{data.name}</Text>
        <View style={styles.badgeRow}>
          {filled(data.angkatan) && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Angkatan {data.angkatan}</Text>
            </View>
          )}
          {filled(data.kota_dan_provinsi) && <Text style={styles.city}>{data.kota_dan_provinsi}</Text>}
        </View>
        {(data.roles?.length ?? 0) > 0 && (
          <View style={styles.roleRow}>
            {data.roles!.map((r) => (
              <View key={r} style={styles.rolePill}>
                <Text style={styles.rolePillText}>{r}</Text>
              </View>
            ))}
          </View>
        )}
        {(data.open_to_opportunities === 'true' || data.open_for_collaboration === 'true') && (
          <View style={styles.chipRow}>
            {data.open_to_opportunities === 'true' && (
              <View style={styles.chip}>
                <Text style={styles.chipText}>Open to opportunities</Text>
              </View>
            )}
            {data.open_for_collaboration === 'true' && (
              <View style={styles.chip}>
                <Text style={styles.chipText}>Open for collaboration</Text>
              </View>
            )}
          </View>
        )}
        {socials.length > 0 && (
          <View style={styles.socialRow}>
            {socials.map((s) => (
              <Pressable
                key={s.key}
                style={({ pressed }) => [styles.socialIcon, pressed && styles.socialIconPressed]}
                accessibilityRole="link"
                accessibilityLabel={s.label}
                onPress={() => Linking.openURL(toUrl(data.social![s.key])).catch(() => {})}
              >
                <Ionicons name={s.icon} size={24} color="#fff" />
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Contact (own profile only) */}
      {hasContact && (
        <>
          <Text style={styles.sectionHead}>KONTAK</Text>
          <View style={styles.cardSection}>
            <InfoRow label="PHONE" value={data.phone} />
            <InfoRow label="EMAIL" value={data.email} />
          </View>
        </>
      )}

      {/* Career */}
      {hasCareer && (
        <>
          <Text style={styles.sectionHead}>KARIR DATA</Text>
          <View style={styles.cardSection}>
            <InfoRow label="JOB TITLE" value={data.job_title} />
            <InfoRow label="COMPANY" value={data.company} />
            <InfoRow label="INDUSTRY" value={data.industryLabel} />
          </View>
        </>
      )}

      {!hasCareer && socials.length === 0 && !hasContact && (
        <Text style={styles.emptyNote}>No additional details yet.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: 18, marginBottom: 6 },
  avatar: { width: 104, height: 104, borderRadius: 52, backgroundColor: colors.bgAlt },
  avatarFallback: {
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
  },
  avatarLetter: { fontFamily: fonts.heading, fontSize: 42, color: colors.primary },
  name: { fontFamily: fonts.heading, fontSize: 22, color: colors.heading, marginTop: 12, textAlign: 'center' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' },
  badge: { backgroundColor: colors.bgAlt, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  badgeText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.primary },
  city: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  roleRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' },
  rolePill: { backgroundColor: colors.secondary, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  rolePillText: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.heading },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' },
  chip: { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  chipText: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.white },

  sectionHead: {
    fontFamily: fonts.headingSemi, fontSize: 13, letterSpacing: 1, color: colors.primary,
    marginBottom: 8, marginTop: 8, paddingLeft: 8, borderLeftWidth: 3, borderLeftColor: colors.primary,
  },
  cardSection: {
    backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 4, marginBottom: 14,
  },

  infoRow: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.bgAlt },
  infoLabel: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 0.5, color: colors.primary, marginBottom: 3 },
  infoValue: { fontFamily: fonts.body, fontSize: 15, color: colors.heading },

  socialRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14, justifyContent: 'center' },
  socialIcon: {
    width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.accent,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  socialIconPressed: { opacity: 0.75 },

  emptyNote: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 10 },
});
