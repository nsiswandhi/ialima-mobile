// Full-width event row for the Events tab list — soft, light card with a thin
// left stripe colored by jenis_event, laid out in three columns:
//   date | event info | logo   (EventON-style, adapted to the app's palette).
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

const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// Left-stripe accent by event type. Soft, brand-aligned.
const STRIPE: Record<string, string> = {
  Online: '#3E86C0',            // blue
  Offline: colors.primary,      // forest green
  Hybrid: '#C98A2E',            // warm gold
};

const two = (n: number) => String(n).padStart(2, '0');

export default function EventListCard({ event, onPress, style }: Props) {
  const start = event.start_date ? new Date(event.start_date * 1000) : null;
  const end = event.end_date ? new Date(event.end_date * 1000) : null;
  const multiDay = !!(start && end && (start.getDate() !== end.getDate() || start.getMonth() !== end.getMonth()));

  const timeRange = start
    ? `${two(start.getHours())}:${two(start.getMinutes())}` + (end ? ` - ${two(end.getHours())}:${two(end.getMinutes())}` : '')
    : '';

  const stripe = STRIPE[event.jenis_event] || colors.secondary;

  return (
    <Pressable style={({ pressed }) => [styles.card, style, pressed && styles.pressed]} onPress={onPress}>
      <View style={[styles.stripe, { backgroundColor: stripe }]} />

      {/* Date column */}
      <View style={styles.dateCol}>
        {!!start && (
          <>
            <Text style={styles.weekday}>{HARI[start.getDay()]}</Text>
            <View style={styles.dayRow}>
              <Text style={styles.day}>{two(start.getDate())}</Text>
              {multiDay && end && <Text style={styles.dayEnd}>-{two(end.getDate())}</Text>}
            </View>
            <Text style={styles.month}>{BULAN[start.getMonth()]}{multiDay && end && start.getMonth() !== end.getMonth() ? ` / ${BULAN[end.getMonth()]}` : ''}</Text>
            <Text style={styles.year}>{start.getFullYear()}</Text>
          </>
        )}
      </View>

      {/* Info column */}
      <View style={styles.info}>
        <View style={styles.badgeRow}>
          {event.is_featured && (
            <View style={[styles.badge, styles.featured]}><Text style={styles.featuredText}>Unggulan</Text></View>
          )}
          {!!event.jenis_event && (
            <View style={[styles.badge, { backgroundColor: stripe + '1A' }]}>
              <Text style={[styles.badgeText, { color: stripe }]}>{event.jenis_event}</Text>
            </View>
          )}
          {!!event.event_category && (
            <View style={styles.badge}><Text style={styles.badgeText}>{event.event_category}</Text></View>
          )}
        </View>

        <Text style={styles.title} numberOfLines={2}>{event.name}</Text>

        {!!timeRange && (
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={13} color={colors.muted} />
            <Text style={styles.metaText}>{timeRange}</Text>
          </View>
        )}
        {!!event.organizer_label && (
          <View style={styles.metaRow}>
            <Ionicons name="people-outline" size={13} color={colors.muted} />
            <Text style={styles.metaText} numberOfLines={1}>{event.organizer_label}</Text>
          </View>
        )}
      </View>

      {/* Logo column */}
      {event.logo?.thumbnail ? (
        <Image source={{ uri: event.logo.thumbnail }} style={styles.logo} />
      ) : (
        <View style={[styles.logo, styles.logoFallback]}>
          <Text style={styles.logoLetter}>{event.name?.charAt(0) || '?'}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    paddingVertical: 14, paddingRight: 14, paddingLeft: 18, marginBottom: 10, overflow: 'hidden',
    shadowColor: colors.primaryDark, shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  pressed: { backgroundColor: colors.bgAlt },
  stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },

  dateCol: { width: 46, alignItems: 'center', paddingTop: 2 },
  weekday: { fontFamily: fonts.bodySemi, fontSize: 10, color: colors.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
  dayRow: { flexDirection: 'row', alignItems: 'flex-start' },
  day: { fontFamily: fonts.heading, fontSize: 26, color: colors.heading, lineHeight: 30 },
  dayEnd: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.muted, marginTop: 2 },
  month: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  year: { fontFamily: fonts.body, fontSize: 10, color: colors.muted, marginTop: 1 },

  info: { flex: 1 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 4 },
  badge: { backgroundColor: colors.bgAlt, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontFamily: fonts.bodyMedium, fontSize: 9.5, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.3 },
  featured: { backgroundColor: '#F6E7C4' },
  featuredText: { fontFamily: fonts.bodySemi, fontSize: 9.5, color: '#8A6D1F', textTransform: 'uppercase', letterSpacing: 0.3 },

  title: { fontFamily: fonts.headingSemi, fontSize: 15.5, color: colors.heading, lineHeight: 20 },
  subtitle: { fontFamily: fonts.body, fontSize: 12.5, color: colors.text, lineHeight: 17, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  metaText: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, flex: 1 },

  logo: { width: 62, height: 62, borderRadius: 12, backgroundColor: colors.bgAlt },
  logoFallback: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  logoLetter: { fontFamily: fonts.heading, fontSize: 24, color: colors.primary },
});
