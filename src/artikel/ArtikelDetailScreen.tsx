// Article detail — hero image, meta row, pending/rejected banner, body
// content, edit CTA, and an author card at the bottom. Mirrors
// EventDetailScreen's pending-banner styling and renderBlock usage.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';
import { artikelApi, ArtikelDetail } from './api';
import { renderBlock } from '../Blocks';

type Props = {
  token: string;
  articleId: number;
  onBack: () => void;
  onEdit: () => void;
};

export default function ArtikelDetailScreen({ token, articleId, onBack, onEdit }: Props) {
  const [data, setData] = useState<ArtikelDetail | null>(null);

  useEffect(() => {
    artikelApi.detail(token, articleId).then((d) => {
      setData(d);
      if (d.status === 'publish') artikelApi.trackView(token, articleId);
    });
  }, [token, articleId]);

  if (!data) {
    return <ActivityIndicator style={styles.loading} color={colors.primary} />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.heroWrap}>
        {data.featured_image ? (
          <Image source={{ uri: data.featured_image.full }} style={styles.hero} resizeMode="cover" />
        ) : (
          <View style={[styles.hero, styles.heroFallback]} />
        )}
        <Pressable style={styles.backBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
      </View>
      <View style={styles.body}>
        <View style={styles.metaTopRow}>
          {!!data.category_label && (
            <View style={styles.pill}><Text style={styles.pillText}>{data.category_label}</Text></View>
          )}
          {!!data.published_date_display && <Text style={styles.date}>{data.published_date_display}</Text>}
        </View>
        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.author}>{data.author_name}</Text>

        {data.status !== 'publish' && (data.is_owner || data.is_ia_lima_review) && (
          <View style={styles.banner}>
            <Ionicons name="time-outline" size={16} color="#854F0B" />
            <Text style={styles.bannerText}>
              {data.status === 'pending' ? 'Menunggu persetujuan Pengurus IA Lima.' : 'Draft'}
              {!!data.reject_reason && ` — Ditolak: ${data.reject_reason}`}
            </Text>
          </View>
        )}

        <View style={styles.content}>
          {data.content.map((block, i) => renderBlock(block, i))}
        </View>

        {(data.is_owner || data.is_ia_lima_review) && (
          <Pressable style={styles.editBtn} onPress={onEdit}>
            <Text style={styles.editBtnText}>Kelola Artikel</Text>
          </Pressable>
        )}

        {data.author && (
          <View style={styles.authorCard}>
            <Text style={styles.authorLabel}>Penulis Artikel</Text>
            <View style={styles.authorRow}>
              {data.author.avatar ? (
                <Image source={{ uri: data.author.avatar.full }} style={styles.authorAvatar} />
              ) : (
                <View style={[styles.authorAvatar, styles.authorAvatarFallback]}>
                  <Text style={styles.authorAvatarLetter}>{data.author.name.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.authorName}>{data.author.name}</Text>
                <View style={styles.authorBadges}>
                  {!!data.author.angkatan && (
                    <View style={styles.authorBadge}>
                      <Text style={styles.authorBadgeText}>Angkatan {data.author.angkatan}</Text>
                    </View>
                  )}
                  {data.author.roles.map((r) => (
                    <View key={r} style={styles.authorRoleBadge}>
                      <Text style={styles.authorRoleText}>{r}</Text>
                    </View>
                  ))}
                </View>
                {!!data.author.job_title && <Text style={styles.authorJobTitle}>{data.author.job_title}</Text>}
              </View>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loading: { marginTop: 60 },
  heroWrap: { position: 'relative' },
  hero: { width: '100%', aspectRatio: 4 / 3, backgroundColor: colors.bgAlt },
  heroFallback: { backgroundColor: colors.bgAlt },
  backBtn: { position: 'absolute', top: 16, left: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20 },
  metaTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  pill: { backgroundColor: colors.bgAlt, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.primary },
  date: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  title: { fontFamily: fonts.heading, fontSize: 22, color: colors.heading, marginBottom: 8 },
  author: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text, marginBottom: 16 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FAEEDA', borderRadius: 10, padding: 12, marginBottom: 16 },
  bannerText: { fontFamily: fonts.body, fontSize: 12, color: '#854F0B', flex: 1 },
  content: { marginBottom: 20 },
  editBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  editBtnText: { color: '#fff', fontFamily: fonts.bodyMedium, fontSize: 14 },
  authorCard: { marginTop: 24, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14 },
  authorLabel: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  authorAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.bgAlt },
  authorAvatarFallback: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  authorAvatarLetter: { fontFamily: fonts.heading, fontSize: 22, color: colors.primary },
  authorName: { fontFamily: fonts.headingSemi, fontSize: 16, color: colors.heading },
  authorBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  authorBadge: { backgroundColor: colors.bgAlt, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  authorBadgeText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.primary },
  authorRoleBadge: { backgroundColor: colors.secondary, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  authorRoleText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.heading },
  authorJobTitle: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 4 },
});
