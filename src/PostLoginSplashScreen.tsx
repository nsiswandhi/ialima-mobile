// Shown once, right after a user's very first login: a 3-slide, full-bleed
// (9:16) image carousel sourced from the WordPress "app-options" JetEngine
// theme options page (fields splash_1/2/3). If no images are configured yet,
// onDone() fires immediately so login is never blocked on this being set up.
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, NativeScrollEvent, NativeSyntheticEvent,
  Pressable, StyleSheet, Text, View, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE } from './config';
import { colors, fonts } from './theme';

type Props = {
  onDone: () => void;
};

export default function PostLoginSplashScreen({ onDone }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [images, setImages] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<string>>(null);

  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE}/splash-images`)
      .then((r) => r.json())
      .then((d) => {
        if (alive) setImages(Array.isArray(d?.images) ? d.images : []);
      })
      .catch(() => {
        if (alive) setImages([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Nothing configured (or the fetch failed) — skip straight past this screen.
  useEffect(() => {
    if (images && images.length === 0) onDone();
  }, [images]);

  if (!images || images.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const isLast = index === images.length - 1;

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={images!}
        keyExtractor={(uri, i) => `${i}-${uri}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={{ width, height }} resizeMode="cover" />
        )}
      />

      {!isLast && (
        <Pressable style={[styles.skip, { top: insets.top + 12 }]} onPress={onDone}>
          <Text style={styles.skipText}>Lewati</Text>
        </Pressable>
      )}

      <View style={[styles.footer, { bottom: insets.bottom + 24 }]}>
        <View style={styles.dots}>
          {images!.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        {isLast && (
          <Pressable style={styles.cta} onPress={onDone}>
            <Text style={styles.ctaText}>Mulai</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primaryDark },
  center: { alignItems: 'center', justifyContent: 'center' },
  skip: {
    position: 'absolute', right: 16,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.35)',
  },
  skipText: { color: colors.white, fontFamily: fonts.bodySemi, fontSize: 13 },
  footer: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: { backgroundColor: colors.white, width: 20 },
  cta: {
    backgroundColor: colors.white, paddingHorizontal: 40, paddingVertical: 12,
    borderRadius: 24,
  },
  ctaText: { color: colors.primaryDark, fontFamily: fonts.headingSemi, fontSize: 15 },
});
