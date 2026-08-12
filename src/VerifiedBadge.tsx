// src/VerifiedBadge.tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from './theme';

// Small "verified member" checkmark shown top-left over an avatar, for an
// already-registered/activated app member (is_member === true) — as opposed
// to an imported-but-never-activated alumni record. Purely presentational:
// the caller wraps its avatar element(s) in a `position: 'relative'`
// container and renders <VerifiedBadge /> as a sibling; this positions
// itself `absolute` inside that container. Uses a non-negative inset
// (rather than overlapping the outer edge) so it isn't clipped by a parent
// with `overflow: 'hidden'` and rounded corners (e.g. BrandCard-style cards).
export default function VerifiedBadge() {
  return (
    <View style={styles.badge} accessibilityRole="image" accessibilityLabel="Member terverifikasi">
      <Ionicons name="checkmark-circle" size={12} color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute', top: 2, left: 2,
    backgroundColor: colors.white, borderRadius: 8,
    width: 15, height: 15, alignItems: 'center', justifyContent: 'center',
  },
});
