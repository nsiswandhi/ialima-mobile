// Presentational community row for the Community list. Parent controls the outer
// margin/width via `style`. Mirrors the directory/BrandCard card shape.
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';
import { CommunitySummary } from './api';

type Props = {
  community: CommunitySummary;
  onPress: () => void;
  style?: ViewStyle;
};

export default function CommunityCard({ community, onPress, style }: Props) {
  const thumb = community.logo?.thumbnail || community.cover?.thumbnail;
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
      onPress={onPress}
    >
      {thumb ? (
        <Image source={{ uri: thumb }} style={styles.logo} />
      ) : (
        <View style={[styles.logo, styles.logoFallback]}>
          <Text style={styles.logoLetter}>{community.name?.charAt(0) || '?'}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>{community.name}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="people" size={13} color={colors.muted} />
          <Text style={styles.meta}>{community.member_count} anggota</Text>
          {!!community.city && <Text style={styles.metaLight}>· {community.city}</Text>}
        </View>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.primaryDark, shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  pressed: { backgroundColor: colors.bgAlt },
  logo: { width: 54, height: 54, borderRadius: 12, backgroundColor: colors.bgAlt },
  logoFallback: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  logoLetter: { fontFamily: fonts.heading, fontSize: 22, color: colors.primary },
  name: { fontFamily: fonts.headingSemi, fontSize: 16, color: colors.heading },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  meta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  metaLight: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  chevron: { fontFamily: fonts.heading, fontSize: 24, color: colors.muted, marginLeft: 4 },
});
