// Presentational community card for the Community list / Dashboard carousel.
// Parent controls the outer width via `style`. Mirrors AlumniCard's shape:
// image on top, name, "Sejak ..." badge, then status.
import React from 'react';
import { Image, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, fonts } from '../theme';
import { CommunitySummary } from './api';

type Props = {
  community: CommunitySummary;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
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
    <Pressable style={({ pressed }) => [styles.card, style, pressed && styles.pressed]} onPress={onPress}>
      {community.logo?.thumbnail ? (
        <Image source={{ uri: community.logo.thumbnail }} style={styles.img} />
      ) : (
        <View style={[styles.img, styles.fallback]}>
          <Text style={styles.letter}>{community.name?.charAt(0) || '?'}</Text>
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{community.name}</Text>
        {!!community.berdiri_sejak && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Sejak {community.berdiri_sejak}</Text>
          </View>
        )}
        {!!community.status_komunitas && (
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={styles.statusText} numberOfLines={1}>{community.status_komunitas}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: colors.primaryDark, shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  pressed: { backgroundColor: colors.bgAlt },
  img: { width: '100%', aspectRatio: 1, backgroundColor: colors.bgAlt },
  fallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  letter: { fontFamily: fonts.heading, fontSize: 40, color: colors.white },
  body: { padding: 11 },
  name: { fontFamily: fonts.headingSemi, fontSize: 15, color: colors.heading },
  badge: { alignSelf: 'flex-start', backgroundColor: colors.bgAlt, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginTop: 6 },
  badgeText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.primary },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
});
