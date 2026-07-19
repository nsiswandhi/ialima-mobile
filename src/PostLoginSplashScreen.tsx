// Shown once, right after a user's very first login: a 3-slide, full-bleed
// (9:16) image carousel sourced from the WordPress "app-options" JetEngine
// theme options page (fields splash_1/2/3). If no images are configured yet,
// onDone() fires immediately so login is never blocked on this being set up.
// Interaction: tap anywhere advances to the next slide; tapping the last
// slide finishes and hands control back to the app (like a stories viewer).
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Image, Pressable, StyleSheet, View, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE } from './config';
import { colors } from './theme';

type Props = {
  onDone: () => void;
};

export default function PostLoginSplashScreen({ onDone }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [images, setImages] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);

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

  function handleTap() {
    if (isLast) {
      onDone();
    } else {
      setIndex((i) => i + 1);
    }
  }

  return (
    <Pressable style={styles.container} onPress={handleTap}>
      <Image source={{ uri: images[index] }} style={{ width, height }} resizeMode="cover" />

      <View style={[styles.dots, { top: insets.top + 12 }]} pointerEvents="none">
        {images.map((_, i) => (
          <View key={i} style={[styles.dotTrack, i === index && styles.dotTrackActive]} />
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primaryDark },
  center: { alignItems: 'center', justifyContent: 'center' },
  dots: {
    position: 'absolute', left: 12, right: 12,
    flexDirection: 'row', gap: 6,
  },
  dotTrack: {
    flex: 1, height: 3, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotTrackActive: { backgroundColor: colors.white },
});
