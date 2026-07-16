// Full-width event row — soft, light card with a thin left stripe colored by
// jenis_event, laid out as date | event info | chevron (EventON-style, adapted
// to the app's palette). Used on both the Events tab list and the Dashboard.
import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';
import { EventSummary } from './api';
import { BULAN, HARI, pad2, wibParts, wibTime } from './datetime';

type Props = {
  event: EventSummary;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

// Left-stripe accent by event type. Soft, brand-aligned.
const STRIPE: Record<string, string> = {
  Online: '#3E86C0',            // blue
  Offline: colors.primary,      // forest green
  Hybrid: '#C98A2E',            // warm gold
};

export default function EventListCard({ event, onPress, style }: Props) {
  // All event times are rendered in WIB (GMT+7), regardless of device tz.
  const start = event.start_date ? wibParts(event.start_date) : null;
  const end = event.end_date ? wibParts(event.end_date) : null;
  const multiDay = !!(start && end && (start.day !== end.day || start.month !== end.month));

  const timeRange = event.start_date
    ? wibTime(event.start_date) + (event.end_date ? ` - ${wibTime(event.end_date)}` : '')
    : '';

  const stripe = STRIPE[event.jenis_event] || colors.secondary;

  return (
    <Pressable style={({ pressed }) => [styles.card, style, pressed && styles.pressed]} onPress={onPress}>
      <View style={[styles.stripe, { backgroundColor: stripe }]} />

      {/* Date column */}
      <View style={styles.dateCol}>
        {!!start && (
          <>
            <Text style={styles.weekday}>{HARI[start.weekday]}</Text>
            <View style={styles.dayRow}>
              <Text style={styles.day}>{pad2(start.day)}</Text>
              {multiDay && end && <Text style={styles.dayEnd}>-{pad2(end.day)}</Text>}
            </View>
            <Text style={styles.month}>{BULAN[start.month]}{multiDay && end && start.month !== end.month ? ` / ${BULAN[end.month]}` : ''}</Text>
            <Text style={styles.year}>{start.year}</Text>
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
        {typeof event.follower_count === 'number' && (
          <View style={styles.metaRow}>
            <Ionicons name="person-outline" size={13} color={colors.muted} />
            <Text style={styles.metaText} numberOfLines={1}>{event.follower_count} Pengikut Event</Text>
          </View>
        )}
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.muted} style={styles.chevron} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    paddingVertical: 14, paddingRight: 12, paddingLeft: 18, marginBottom: 10, overflow: 'hidden',
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

  chevron: { alignSelf: 'center' },
});
