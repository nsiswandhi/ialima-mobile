import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { colors, fonts } from './theme';
import Header from './Header';
import {
  BrandDetail, Item, Place, mkApi, whatsappUrl, directionsUrl, TYPE_LABELS,
} from './marketplace/api';

type Props = {
  brandId: number;
  token: string;
  viewerId: number;
  onBack: () => void;
  onLogout: () => void;
  onManage: (brand: BrandDetail) => void; // owner taps "Kelola Brand"
};

const DAY_LABELS: [keyof Place['operating_hours'], string][] = [
  ['mon', 'Sen'], ['tue', 'Sel'], ['wed', 'Rab'], ['thu', 'Kam'],
  ['fri', 'Jum'], ['sat', 'Sab'], ['sun', 'Min'],
];

// Public brand page. Fires a one-time view increment on open, then renders the
// items and (for place brands) hours + directions. Owners get a manage button.
export default function BrandDetailScreen({ brandId, token, viewerId, onBack, onLogout, onManage }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brand, setBrand] = useState<BrandDetail | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const d = await mkApi.detail(token, brandId);
        if (!alive) return;
        setBrand(d);
        mkApi.trackView(token, brandId); // fire-and-forget, matches profile-view
      } catch (e: any) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [brandId]);

  const isOwner = !!brand && brand.owner_id === viewerId;
  const isPlace = brand?.type === 'place';

  const openWhatsApp = (itemName?: string) => brand && Linking.openURL(whatsappUrl(brand, itemName));
  const openDirections = () => brand?.place && Linking.openURL(directionsUrl(brand.place));

  const ctaLabel =
    brand?.type === 'service' ? 'Hubungi via WhatsApp' : 'Beli via WhatsApp';

  return (
    <View style={styles.flex}>
      <Header title={brand?.name || 'Brand'} onBack={onBack} onLogout={onLogout} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error && !brand ? (
        <Text style={styles.error}>{error}</Text>
      ) : brand ? (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Cover + logo */}
          {brand.cover?.full ? (
            <Image source={{ uri: brand.cover.full }} style={styles.cover} />
          ) : (
            <View style={[styles.cover, styles.coverFallback]} />
          )}
          <View style={styles.headRow}>
            {brand.logo?.thumbnail ? (
              <Image source={{ uri: brand.logo.thumbnail }} style={styles.logo} />
            ) : (
              <View style={[styles.logo, styles.logoFallback]}>
                <Text style={styles.logoLetter}>{brand.name.charAt(0)}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{brand.name}</Text>
              <View style={styles.metaRow}>
                {!!brand.type && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{TYPE_LABELS[brand.type]}</Text>
                  </View>
                )}
                {!!brand.city && <Text style={styles.metaLight}>{brand.city}</Text>}
              </View>
            </View>
          </View>

          {/* View counter — "{n} kali dilihat" */}
          <Text style={styles.views}>{brand.view_count} kali dilihat</Text>

          {!!brand.description && <Text style={styles.desc}>{brand.description}</Text>}

          {/* Primary CTA */}
          {isPlace ? (
            <Pressable style={styles.primaryBtn} onPress={openDirections}>
              <Text style={styles.primaryBtnText}>Get Directions</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={[isPlace ? styles.secondaryBtn : styles.primaryBtn]}
            onPress={() => openWhatsApp()}
          >
            <Text style={isPlace ? styles.secondaryBtnText : styles.primaryBtnText}>{ctaLabel}</Text>
          </Pressable>

          {isOwner && (
            <Pressable style={styles.manageBtn} onPress={() => onManage(brand)}>
              <Text style={styles.manageBtnText}>Kelola Brand</Text>
            </Pressable>
          )}

          {/* Place block */}
          {isPlace && brand.place && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Jam Buka</Text>
              {DAY_LABELS.map(([key, label]) => {
                const ranges = brand.place!.operating_hours[key] || [];
                return (
                  <View style={styles.hourRow} key={key}>
                    <Text style={styles.hourDay}>{label}</Text>
                    <Text style={styles.hourVal}>
                      {ranges.length === 0
                        ? 'Tutup'
                        : ranges.map((r) => `${r.open}–${r.close}`).join(', ')}
                    </Text>
                  </View>
                );
              })}
              {brand.place.offerings.length > 0 && (
                <View style={styles.chipsRow}>
                  {brand.place.offerings.map((o) => (
                    <View style={styles.chip} key={o}>
                      <Text style={styles.chipText}>{o}</Text>
                    </View>
                  ))}
                </View>
              )}
              {!!brand.place.address && <Text style={styles.address}>{brand.place.address}</Text>}
            </View>
          )}

          {/* Items */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {brand.type === 'service' ? 'Layanan' : brand.type === 'place' ? 'Menu' : 'Produk'}
            </Text>
            {brand.items.length === 0 ? (
              <Text style={styles.empty}>Belum ada item.</Text>
            ) : (
              brand.items.map((it) => <ItemRow key={it.id} item={it} onTap={() => openWhatsApp(it.name)} />)
            )}
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

function ItemRow({ item, onTap }: { item: Item; onTap: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.item, pressed && styles.itemPressed]} onPress={onTap}>
      {item.image?.thumbnail ? (
        <Image source={{ uri: item.image.thumbnail }} style={styles.itemImg} />
      ) : (
        <View style={[styles.itemImg, styles.itemImgFallback]} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.itemName}>{item.name}</Text>
        {!!item.description && (
          <Text style={styles.itemDesc} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <Text style={styles.itemPrice}>
          {item.price_display || 'Hubungi untuk harga'}
          {!!item.price_note && <Text style={styles.itemNote}> {item.price_note}</Text>}
        </Text>
      </View>
      {!item.is_available && <Text style={styles.soldOut}>Habis</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingBottom: 40 },
  error: { color: colors.danger, textAlign: 'center', marginTop: 16, fontFamily: fonts.bodyMedium },
  empty: { color: colors.muted, fontFamily: fonts.body, paddingVertical: 8 },

  cover: { width: '100%', height: 150, backgroundColor: colors.bgAlt },
  coverFallback: { backgroundColor: colors.primaryDark, opacity: 0.15 },

  headRow: { flexDirection: 'row', gap: 14, paddingHorizontal: 16, marginTop: -30, alignItems: 'flex-end' },
  logo: { width: 72, height: 72, borderRadius: 16, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.card },
  logoFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondary },
  logoLetter: { fontFamily: fonts.heading, fontSize: 30, color: colors.white },
  name: { fontFamily: fonts.heading, fontSize: 22, color: colors.heading },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  metaLight: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  badge: { backgroundColor: colors.bgAlt, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.primary },

  views: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted, paddingHorizontal: 16, marginTop: 10 },
  desc: { fontFamily: fonts.body, fontSize: 14, color: colors.text, lineHeight: 20, paddingHorizontal: 16, marginTop: 10 },

  primaryBtn: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 16, marginHorizontal: 16 },
  primaryBtnText: { color: colors.white, fontFamily: fonts.headingSemi, fontSize: 16 },
  secondaryBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12, marginHorizontal: 16, borderWidth: 1.5, borderColor: colors.primary },
  secondaryBtnText: { color: colors.primary, fontFamily: fonts.headingSemi, fontSize: 15 },
  manageBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12, marginHorizontal: 16, backgroundColor: colors.bgAlt },
  manageBtnText: { color: colors.heading, fontFamily: fonts.headingSemi, fontSize: 15 },

  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 17, color: colors.heading, marginBottom: 10 },

  hourRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: colors.border },
  hourDay: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.heading, width: 44 },
  hourVal: { fontFamily: fonts.body, fontSize: 13, color: colors.text },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { backgroundColor: colors.bgAlt, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.primary },
  address: { fontFamily: fonts.body, fontSize: 13, color: colors.text, marginTop: 12, lineHeight: 19 },

  item: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemPressed: { opacity: 0.6 },
  itemImg: { width: 56, height: 56, borderRadius: 10, backgroundColor: colors.bgAlt },
  itemImgFallback: { borderWidth: 1, borderColor: colors.border },
  itemName: { fontFamily: fonts.headingSemi, fontSize: 15, color: colors.heading },
  itemDesc: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted, marginTop: 2 },
  itemPrice: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.primary, marginTop: 3 },
  itemNote: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  soldOut: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.danger },
});
