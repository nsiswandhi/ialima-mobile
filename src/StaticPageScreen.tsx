import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { API_BASE } from './config';
import { colors, fonts } from './theme';
import Header, { DrawerProfile, NavTarget } from './Header';

type Block =
  | { type: 'h1' | 'h2' | 'h3' | 'p'; text: string }
  | { type: 'ul' | 'ol'; items: string[] };

type PageContent = { title: string; blocks: Block[] };

type Props = {
  slug: string;
  fallbackTitle: string; // shown in the header while loading / on error
  onBack: () => void;
  onLogout: () => void;
  profile?: DrawerProfile;
  onNavigate?: (target: NavTarget) => void;
};

function openLink(href: string) {
  const url = /^https?:\/\//i.test(href) ? href : `https://${href}`;
  Linking.openURL(url).catch(() => {});
}

// A block's text may contain a bare <a href="...">label</a> — every other
// tag was stripped server-side. Split it into plain runs + tappable links.
const LINK_RE = /<a href="([^"]*)">(.*?)<\/a>/gi;
function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(text))) {
    if (m.index > lastIndex) nodes.push(text.slice(lastIndex, m.index));
    const href = m[1];
    const label = m[2];
    nodes.push(
      <Text key={`link-${key++}`} style={styles.link} onPress={() => openLink(href)}>
        {label}
      </Text>,
    );
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function renderBlock(block: Block, i: number) {
  switch (block.type) {
    case 'h1':
      return <Text key={i} style={styles.h1}>{renderInline(block.text)}</Text>;
    case 'h2':
      return <Text key={i} style={styles.h2}>{renderInline(block.text)}</Text>;
    case 'h3':
      return <Text key={i} style={styles.h3}>{renderInline(block.text)}</Text>;
    case 'p':
      return <Text key={i} style={styles.paragraph}>{renderInline(block.text)}</Text>;
    case 'ul':
    case 'ol':
      return (
        <View key={i} style={styles.list}>
          {block.items.map((item, j) => (
            <View key={j} style={styles.listRow}>
              <Text style={styles.bullet}>{block.type === 'ol' ? `${j + 1}.` : '•'}</Text>
              <Text style={styles.listText}>{renderInline(item)}</Text>
            </View>
          ))}
        </View>
      );
    default:
      return null;
  }
}

// Renders a WP Page's content natively: About LIMA Circle, Privacy Policy,
// Terms and Conditions. Fetches GET /page/{slug} (public, no token — same as
// /glossary) which strips the site's theme HTML down to { title, blocks }.
export default function StaticPageScreen({ slug, fallbackTitle, onBack, onLogout, profile, onNavigate }: Props) {
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
      <Header
        title={data?.title || fallbackTitle}
        onBack={onBack}
        onLogout={onLogout}
        profile={profile}
        onNavigate={onNavigate}
      />
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {(data?.blocks || []).map(renderBlock)}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingTop: 40, paddingBottom: 40 },

  h1: { fontFamily: fonts.heading, fontSize: 22, color: colors.heading, marginBottom: 12 },
  h2: { fontFamily: fonts.heading, fontSize: 18, color: colors.heading, marginTop: 18, marginBottom: 10 },
  h3: { fontFamily: fonts.headingSemi, fontSize: 15, color: colors.heading, marginTop: 14, marginBottom: 8 },
  paragraph: { fontFamily: fonts.body, fontSize: 14, color: colors.text, lineHeight: 22, marginBottom: 14 },

  list: { marginBottom: 14 },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  bullet: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text, width: 16 },
  listText: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.text, lineHeight: 22 },

  link: { color: colors.accent, fontFamily: fonts.bodyMedium, textDecorationLine: 'underline' },
  error: { color: colors.danger, fontFamily: fonts.bodyMedium, textAlign: 'center', marginTop: 40 },
});
