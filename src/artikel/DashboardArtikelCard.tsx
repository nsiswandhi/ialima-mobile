// Dashboard-only Artikel row card — image-left layout, distinct from the
// grid ArtikelCard used on the Artikel tab itself.
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { ArtikelSummary } from './api';

type Props = { article: ArtikelSummary; onPress: () => void };

export default function DashboardArtikelCard({ article, onPress }: Props) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={onPress}>
      {article.featured_image ? (
        <Image source={{ uri: article.featured_image.full }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]} />
      )}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{article.title}</Text>
        <Text style={styles.excerpt} numberOfLines={2}>{article.excerpt}</Text>
        <Text style={styles.meta}>{article.published_date_display} · by {article.author_name}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 10, marginBottom: 12, gap: 12 },
  pressed: { opacity: 0.85 },
  thumb: { width: 72, height: 72, borderRadius: 10, backgroundColor: colors.bgAlt },
  thumbFallback: { backgroundColor: colors.bgAlt },
  body: { flex: 1, justifyContent: 'center' },
  title: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.heading, marginBottom: 4 },
  excerpt: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginBottom: 4 },
  meta: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
});
