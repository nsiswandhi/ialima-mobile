// Dashboard hero ad slider — 16:9, up to 5 banners (server already applied
// the random-if-more-than-5 selection), paging FlatList + bullet footer nav.
// Fires an impression the first time each slide becomes visible and a click
// (+ resolveAdTap routing) on tap. Renders nothing while loading or empty,
// so it never reserves layout space with no ads configured.
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  FlatList, Image, Pressable, StyleSheet, View, Linking, useWindowDimensions,
  ViewToken,
} from 'react-native';
import { adsApi, resolveAdTap, Ad } from './api';

type Props = {
  onInternalLink: (type: string, id: number) => void;
};

export default function HeroBannerSlider({ onInternalLink }: Props) {
  const { width } = useWindowDimensions();
  const [ads, setAds] = useState<Ad[]>([]);
  const [index, setIndex] = useState(0);
  const seenImpressions = useRef<Set<number>>(new Set());

  useEffect(() => {
    let alive = true;
    adsApi.list('hero').then((res) => {
      if (alive) setAds(res.data);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const fireImpression = useCallback((ad: Ad) => {
    if (seenImpressions.current.has(ad.id)) return;
    seenImpressions.current.add(ad.id);
    adsApi.impression(ad.id);
  }, []);

  useEffect(() => {
    if (ads[0]) fireImpression(ads[0]);
  }, [ads]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]?.index != null) {
      setIndex(viewableItems[0].index);
      const ad = viewableItems[0].item as Ad;
      fireImpression(ad);
    }
  }).current;

  function handleTap(ad: Ad) {
    adsApi.click(ad.id);
    const target = resolveAdTap(ad.target_url);
    if (target?.kind === 'internal') onInternalLink(target.type, target.id);
    else if (target?.kind === 'external') Linking.openURL(target.url);
  }

  if (ads.length === 0) return null;

  const height = (width * 9) / 16;

  return (
    <View>
      <FlatList
        data={ads}
        keyExtractor={(a) => String(a.id)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={({ item }) => (
          <Pressable onPress={() => handleTap(item)} style={{ width, height }}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={{ width, height }} resizeMode="cover" />
            ) : null}
          </Pressable>
        )}
      />
      {ads.length > 1 ? (
        <View style={styles.dots} pointerEvents="none">
          {ads.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    position: 'absolute', bottom: 8, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: { backgroundColor: '#fff', width: 16 },
});
