// Read-only star-rating display: 5 Ionicons stars filled proportionally by
// rounding, plus an optional "(N)" review count. Used on cards (sm) and
// detail-screen summary lines (md). For the interactive picker see
// ReviewSection's inline star row (kept local — different tap behavior).
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';

type Props = {
  value?: number | null;
  count?: number | null;
  size?: 'sm' | 'md';
};

export default function StarRating({ value, count, size = 'sm' }: Props) {
  const iconSize = size === 'sm' ? 12 : 16;
  const rounded = Math.round(value || 0);
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= rounded ? 'star' : 'star-outline'}
          size={iconSize}
          color={colors.secondary}
        />
      ))}
      {(value != null || count != null) && (
        <Text style={[styles.text, size === 'md' && styles.textMd]}>
          {value != null ? value.toFixed(1) : '0.0'}
          {count != null ? ` (${count})` : ''}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  text: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.muted, marginLeft: 4 },
  textMd: { fontSize: 13 },
});
