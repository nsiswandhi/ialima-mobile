// Presentational event card for the Events list / Dashboard carousel. Mirrors
// CommunityCard/AlumniCard's image-on-top shape: logo, title, a pill row
// (category / organizer / jenis_event), then the start date line.
import React from 'react';
import { Image, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';
import { EventSummary } from './api';

type Props = {
  event: EventSummary;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export default function EventCard({ event, onPress, style }: Props) {
  const pills = [event.event_category, event.organizer_label, event.jenis_event].filter(Boolean);
  return (
    <Pressable style={({ pressed }) => [styles.card, style, pressed && styles.pressed]} onPress={onPress}>
      {event.logo?.thumbnail ? (
        <Image source={{ uri: event.logo.thumbnail }} style={styles.img} />
      ) : (
        <View style={[styles.img, styles.fallback]}>
          <Text style={styles.letter}>{event.name?.charAt(0) || '?'}</Text>
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>{event.name}</Text>
        {pills.length > 0 && (
          <View style={styles.pillRow}>
            {pills.map((p, i) => (
              <View style={styles.pill} key={`${p}-${i}`}>
                <Text style={styles.pillText} numberOfLines={1}>{p}</Text>
              </View>
            ))}
          </View>
        )}
        {!!event.start_date_display && (
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={12} color={colors.muted} />
            <Text style={styles.dateText} numberOfLines={1}>{event.start_date_display}</Text>
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
  fallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  letter: { fontFamily: fonts.heading, fontSize: 40, color: colors.white },
  body: { padding: 11 },
  name: { fontFamily: fonts.headingSemi, fontSize: 15, color: colors.heading, lineHeight: 20 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  pill: { backgroundColor: colors.bgAlt, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, maxWidth: '100%' },
  pillText: { fontFamily: fonts.bodyMedium, fontSize: 10, color: colors.primary },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 },
  dateText: { fontFamily: fonts.body, fontSize: 11.5, color: colors.muted, flex: 1 },
});
