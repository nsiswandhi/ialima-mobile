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
            {data.author.avatar ? (
              <Image source={{ uri: data.author.avatar.full }} style={styles.authorAvatar} />
            ) : (
              <View style={[styles.authorAvatar, styles.authorAvatarFallback]}>
                <Text style={styles.authorAvatarLetter}>{data.author.name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.authorBody}>
              <Text style={styles.authorName}>{data.author.name}</Text>
              {!!data.author.angkatan && <Text style={styles.authorMeta}>Angkatan {data.author.angkatan}</Text>}
              {data.author.roles.length > 0 && (
                <View style={styles.authorRoleRow}>
                  {data.author.roles.map((r) => (
                    <View key={r} style={styles.authorRolePill}>
                      <Text style={styles.authorRolePillText}>{r}</Text>
                    </View>
                  ))}
                </View>
              )}
              {!!data.author.job_title && <Text style={styles.authorMeta}>{data.author.job_title}</Text>}
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
  authorCard: { flexDirection: 'row', gap: 12, marginTop: 24, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  authorAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.bgAlt },
  authorAvatarFallback: { alignItems: 'center', justifyContent: 'center' },
  authorAvatarLetter: { fontFamily: fonts.headingSemi, fontSize: 20, color: colors.primary },
  authorBody: { flex: 1, justifyContent: 'center' },
  authorName: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.heading, marginBottom: 2 },
  authorMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginBottom: 2 },
  authorRoleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 4 },
  authorRolePill: { backgroundColor: colors.bgAlt, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  authorRolePillText: { fontFamily: fonts.bodyMedium, fontSize: 10, color: colors.primary },
});
