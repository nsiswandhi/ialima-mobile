// NYT-style article card used in the Artikel feed list.
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { ArtikelSummary } from './api';

type Props = { article: ArtikelSummary; onPress: () => void };

export default function ArtikelCard({ article, onPress }: Props) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.imageWrap}>
        {article.featured_image ? (
          <Image source={{ uri: article.featured_image.full }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imageFallback]} />
        )}
        {!!article.category_label && (
          <View style={styles.pill}>
            <Text style={styles.pillText}>{article.category_label}</Text>
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{article.title}</Text>
        <View style={styles.metaRow}>
          {!!article.published_date_display && <Text style={styles.meta}>{article.published_date_display}</Text>}
          <Text style={styles.meta}> - by {article.author_name}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 16 },
  pressed: { opacity: 0.85 },
  imageWrap: { position: 'relative' },
  image: { width: '100%', aspectRatio: 16 / 10, backgroundColor: colors.bgAlt },
  imageFallback: { backgroundColor: colors.bgAlt },
  body: { padding: 14 },
  pill: { position: 'absolute', top: 5, right: 5, backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.white },
  title: { fontFamily: fonts.headingSemi, fontSize: 16, color: colors.heading, marginBottom: 8, lineHeight: 22 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  meta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
});
