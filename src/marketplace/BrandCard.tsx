import React from 'react';
import { Image, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';
import { BrandSummary, TYPE_LABELS } from './api';
import StarRating from '../reviews/StarRating';
import { promptReport } from '../report/promptReport';

// Reusable brand card. Logo-forward (square image on top) so brands stand out in
// the 2-column Marketplace grid and the Dashboard "Brand Unggulan" carousel.
// Width is controlled by the parent via `style` (flex:1 in a grid, a fixed width
// in a carousel). `showReport`/`token` add a per-card "Laporkan" icon — only
// passed `true`/set from MarketplaceScreen's grid, left unset on
// DashboardScreen's carousel (see that screen's own usage, unchanged).
export default function BrandCard({
  brand, onPress, style, token, showReport,
}: {
  brand: BrandSummary;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  token?: string;
  showReport?: boolean;
}) {
  const img = brand.logo?.thumbnail || brand.logo?.full || null;
  return (
    <Pressable style={({ pressed }) => [styles.card, style, pressed && styles.pressed]} onPress={onPress}>
      {img ? (
        <Image source={{ uri: img }} style={styles.img} />
      ) : (
        <View style={[styles.img, styles.fallback]}>
          <Text style={styles.letter}>{brand.name.charAt(0)}</Text>
        </View>
      )}
      {showReport && token && (
        <Pressable
          style={({ pressed }) => [styles.reportIcon, pressed && styles.reportIconPressed]}
          onPress={() => promptReport(token, 'listing', brand.id)}
          hitSlop={6}
          accessibilityLabel="Laporkan brand ini"
        >
          <Ionicons name="flag-outline" size={14} color={colors.white} />
        </Pressable>
      )}
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{brand.name}</Text>
        <View style={{ marginTop: 4 }}>
          <StarRating value={brand.rating_average} count={brand.rating_count} />
        </View>
        <View style={styles.metaRow}>
          {!!brand.type && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{TYPE_LABELS[brand.type]}</Text>
            </View>
          )}
        </View>
        {!!brand.city && <Text style={styles.city} numberOfLines={1}>{brand.city}</Text>}
        {typeof brand.product_count === 'number' && (
          <View style={styles.productBadge}>
            <Text style={styles.productBadgeText}>{brand.product_count} Produk</Text>
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
  reportIcon: {
    position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center',
  },
  reportIconPressed: { opacity: 0.7 },
  fallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondary },
  letter: { fontFamily: fonts.heading, fontSize: 40, color: colors.white },
  body: { padding: 11 },
  name: { fontFamily: fonts.headingSemi, fontSize: 15, color: colors.heading },
  metaRow: { flexDirection: 'row', marginTop: 6 },
  badge: { backgroundColor: colors.bgAlt, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.primary },
  city: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 6 },
  productBadge: { alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginTop: 6 },
  productBadgeText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.white },
});
