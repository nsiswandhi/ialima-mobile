import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { API_BASE } from './config';
import { colors, fonts } from './theme';
import Header from './Header';

type PageContent = { title: string; paragraphs: string[] };

type Props = {
  slug: string;
  fallbackTitle: string; // shown in the header while loading / on error
  onBack: () => void;
  onLogout: () => void;
};

// Renders a WP Page's content natively: About LIMA Circle, Privacy Policy,
// Terms and Conditions. Fetches GET /page/{slug} (public, no token — same as
// /glossary) which strips the site's theme HTML down to { title, paragraphs }.
export default function StaticPageScreen({ slug, fallbackTitle, onBack, onLogout }: Props) {
  const [data, setData] = useState<PageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/page/${slug}`);
        const body = await res.json();
        if (!res.ok) throw new Error(body?.message || 'Could not load page');
        if (alive) setData(body);
      } catch (e: any) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  return (
    <View style={styles.flex}>
      <Header title={data?.title || fallbackTitle} onBack={onBack} onLogout={onLogout} />
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {(data?.paragraphs || []).map((p, i) => (
            <Text key={i} style={styles.paragraph}>{p}</Text>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20 },
  paragraph: { fontFamily: fonts.body, fontSize: 14, color: colors.text, lineHeight: 22, marginBottom: 14 },
  error: { color: colors.danger, fontFamily: fonts.bodyMedium, textAlign: 'center', marginTop: 40 },
});
