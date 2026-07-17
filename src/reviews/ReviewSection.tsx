// Bottom-of-content rating/review block for Brand/Community/Artikel detail
// screens: a 5-star + textarea input (upserts the viewer's own review), a
// stats row (average + total reviewer count), and an accordion holding the
// paginated review list ("Muat Lebih Banyak" instead of a nested FlatList,
// since this renders inside a parent ScrollView — mirrors the pattern
// MemberDetailScreen uses to avoid FlatList-in-ScrollView).
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';
import { reviewsApi, Review, ObjectType } from './api';
import StarRating from './StarRating';

type Props = {
  token: string;
  objectType: ObjectType;
  objectId: number;
};

export default function ReviewSection({ token, objectType, objectId }: Props) {
  const [average, setAverage] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [myRating, setMyRating] = useState(0);
  const [myReview, setMyReview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [listLoading, setListLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    reviewsApi
      .list(token, { objectType, objectId, page: 1 })
      .then((r) => {
        if (!alive) return;
        setAverage(r.average);
        setCount(r.count);
        setMyRating(r.my_rating || 0);
        setMyReview(r.my_review || '');
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [objectType, objectId]);

  async function loadPage(p: number) {
    setListLoading(true);
    try {
      const r = await reviewsApi.list(token, { objectType, objectId, page: p });
      setReviews((prev) => (p === 1 ? r.data : [...prev, ...r.data]));
      setPage(r.page);
      setTotalPages(r.total_pages);
      setAverage(r.average);
      setCount(r.count);
    } catch {
      /* non-fatal */
    } finally {
      setListLoading(false);
    }
  }

  function toggleAccordion() {
    const next = !open;
    setOpen(next);
    if (next && reviews.length === 0) loadPage(1);
  }

  async function submit() {
    if (myRating < 1) {
      setError('Pilih rating bintang terlebih dahulu.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const r = await reviewsApi.submit(token, { objectType, objectId, rating: myRating, review: myReview });
      setAverage(r.average);
      setCount(r.count);
      setNotice('Terima kasih atas ulasan kamu.');
      if (open) loadPage(1);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionHead}>BERI RATING & ULASAN</Text>
      <View style={styles.inputCard}>
        <View style={styles.starPickerRow}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Pressable key={i} onPress={() => setMyRating(i)} hitSlop={6}>
              <Ionicons name={i <= myRating ? 'star' : 'star-outline'} size={28} color={colors.secondary} />
            </Pressable>
          ))}
        </View>
        <TextInput
          style={styles.textarea}
          placeholder="Tulis ulasan kamu (opsional)..."
          placeholderTextColor={colors.muted}
          value={myReview}
          onChangeText={setMyReview}
          multiline
          numberOfLines={4}
        />
        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!notice && <Text style={styles.notice}>{notice}</Text>}
        <Pressable
          style={({ pressed }) => [styles.submitBtn, pressed && styles.pressed]}
          disabled={submitting}
          onPress={submit}
        >
          {submitting ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.submitText}>Kirim Ulasan</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <StarRating value={average} size="md" />
        <Text style={styles.statsCount}>{count} ulasan</Text>
      </View>

      <View style={styles.accordion}>
        <Pressable style={styles.accordionHead} onPress={toggleAccordion}>
          <Text style={styles.accordionTitle}>Lihat Semua Ulasan ({count})</Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} />
        </Pressable>
        {open && (
          <View style={styles.accordionBody}>
            {reviews.length === 0 && !listLoading ? (
              <Text style={styles.empty}>Belum ada ulasan.</Text>
            ) : (
              reviews.map((r) => (
                <View key={r.id} style={styles.reviewRow}>
                  {r.user_avatar?.thumbnail ? (
                    <Image source={{ uri: r.user_avatar.thumbnail }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <Text style={styles.avatarLetter}>{r.user_name.charAt(0)}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <View style={styles.reviewHeadRow}>
                      <Text style={styles.reviewName}>{r.user_name}</Text>
                      <StarRating value={r.rating} />
                    </View>
                    {!!r.review && <Text style={styles.reviewText}>{r.review}</Text>}
                  </View>
                </View>
              ))
            )}
            {listLoading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />}
            {!listLoading && page < totalPages && (
              <Pressable style={styles.loadMoreBtn} onPress={() => loadPage(page + 1)}>
                <Text style={styles.loadMoreText}>Muat Lebih Banyak</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionHead: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.muted, letterSpacing: 0.5, marginBottom: 10 },
  empty: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },

  inputCard: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14 },
  starPickerRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  textarea: {
    fontFamily: fonts.body, fontSize: 13.5, color: colors.text, backgroundColor: colors.bgAlt,
    borderRadius: 10, padding: 12, minHeight: 80, textAlignVertical: 'top', marginBottom: 10,
  },
  error: { color: colors.danger, fontFamily: fonts.bodyMedium, fontSize: 12.5, marginBottom: 8 },
  notice: { color: colors.primary, fontFamily: fonts.bodyMedium, fontSize: 12.5, marginBottom: 8 },
  submitBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  submitText: { fontFamily: fonts.headingSemi, fontSize: 14, color: colors.white },
  pressed: { opacity: 0.85 },

  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 10 },
  statsCount: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.muted },

  accordion: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  accordionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14 },
  accordionTitle: { fontFamily: fonts.bodyMedium, fontSize: 13.5, color: colors.heading },
  accordionBody: { paddingHorizontal: 14, paddingBottom: 12, borderTopWidth: 1, borderTopColor: colors.border },

  reviewRow: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgAlt },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontFamily: fonts.heading, fontSize: 14, color: colors.primary },
  reviewHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewName: { fontFamily: fonts.headingSemi, fontSize: 13.5, color: colors.heading },
  reviewText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.text, marginTop: 4, lineHeight: 18 },

  loadMoreBtn: { alignItems: 'center', paddingVertical: 10 },
  loadMoreText: { fontFamily: fonts.bodySemi, fontSize: 12.5, color: colors.primary },
});
