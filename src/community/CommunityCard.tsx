// Presentational community row for the Community list. Parent controls the outer
// margin/width via `style`. Mirrors the directory/BrandCard card shape.
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, fonts } from '../theme';
import { CommunitySummary } from './api';

type Props = {
  community: CommunitySummary;
  onPress: () => void;
  style?: ViewStyle;
};

const STATUS_COLOR: Record<string, string> = {
  'Aktif dan Berbadan Hukum': '#3B6D11',
  'Aktif': '#3B6D11',
  'Tidak Aktif': '#8A8F8A',
  'Dalam Pembentukan': '#854F0B',
};

export default function CommunityCard({ community, onPress, style }: Props) {
  const statusColor = STATUS_COLOR[community.status_komunitas] || colors.muted;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
      onPress={onPress}
    >
      {community.logo?.thumbnail ? (
        <Image source={{ uri: community.logo.thumbnail }} style={styles.logo} />
      ) : (
        <View style={[styles.logo, styles.logoFallback]}>
          <Text style={styles.logoLetter}>{community.name?.charAt(0) || '?'}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>{community.name}</Text>
        <View style={styles.metaRow}>
          {!!community.community_type && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{community.community_type}</Text>
            </View>
          )}
          {!!community.berdiri_sejak && <Text style={styles.metaLight}>Sejak {community.berdiri_sejak}</Text>}
        </View>
        {!!community.status_komunitas && (
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={styles.statusText}>{community.status_komunitas}</Text>
          </View>
        )}
        {!!community.introduction && (
          <Text style={styles.intro} numberOfLines={2}>{community.introduction}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 10,
    flexDirection: 'row', gap: 14,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.primaryDark, shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  pressed: { backgroundColor: colors.bgAlt },
  logo: { width: 54, height: 54, borderRadius: 12, backgroundColor: colors.bgAlt },
  logoFallback: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  logoLetter: { fontFamily: fonts.heading, fontSize: 22, color: colors.primary },
  name: { fontFamily: fonts.headingSemi, fontSize: 16, color: colors.heading },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  badge: { backgroundColor: colors.bgAlt, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontFamily: fonts.bodyMedium, fontSize: 10, color: colors.primary },
  metaLight: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: fonts.body, fontSize: 11, color: colors.text },
  intro: { fontFamily: fonts.body, fontSize: 12, color: colors.text, marginTop: 6, lineHeight: 17 },
});
