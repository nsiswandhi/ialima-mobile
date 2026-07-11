import React from 'react';
import { Image, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, fonts } from './theme';

export type AlumniSummary = {
  id: number;
  name: string;
  avatar: { thumbnail: string } | null;
  angkatan?: string;
  job_title?: string;
};

// Alumni card mirroring the brand card shape, for the Dashboard "Alumni Populer"
// carousel. Parent controls width via `style`.
export default function AlumniCard({
  member, onPress, style,
}: {
  member: AlumniSummary;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.card, style, pressed && styles.pressed]} onPress={onPress}>
      {member.avatar?.thumbnail ? (
        <Image source={{ uri: member.avatar.thumbnail }} style={styles.img} />
      ) : (
        <View style={[styles.img, styles.fallback]}>
          <Text style={styles.letter}>{member.name?.charAt(0) || '?'}</Text>
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{member.name}</Text>
        {!!member.angkatan && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Angkatan {member.angkatan}</Text>
          </View>
        )}
        {!!member.job_title && <Text style={styles.role} numberOfLines={1}>{member.job_title}</Text>}
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
  role: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 6 },
});
