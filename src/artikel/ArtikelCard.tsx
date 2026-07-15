// NYT-style article card used in the Artikel feed list.
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { ArtikelSummary } from './api';

type Props = { article: ArtikelSummary; onPress: () => void };

export default function ArtikelCard({ article, onPress }: Props) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      {article.featured_image ? (
        <Image source={{ uri: article.featured_image.full }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.imageFallback]} />
      )}
      <View style={styles.body}>
        {!!article.category_label && (
          <View style={styles.pill}>
            <Text style={styles.pillText}>{article.category_label}</Text>
          </View>
        )}
        <Text style={styles.title} numberOfLines={2}>{article.title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{article.author_name}</Text>
          {!!article.published_date_display && (
            <Text style={styles.meta}> · {article.published_date_display}</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 16 },
  pressed: { opacity: 0.85 },
  image: { width: '100%', aspectRatio: 16 / 10, backgroundColor: colors.bgAlt },
  imageFallback: { backgroundColor: colors.bgAlt },
  body: { padding: 14 },
  pill: { alignSelf: 'flex-start', backgroundColor: colors.bgAlt, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
  pillText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.primary },
  title: { fontFamily: fonts.headingSemi, fontSize: 16, color: colors.heading, marginBottom: 8, lineHeight: 22 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  meta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
});
