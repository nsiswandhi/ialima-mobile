import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from './theme';

// Shared with any backend field that returns { blocks } — the static info
// pages (/page/{slug}) and community WYSIWYG fields (tentang_kami,
// syarat_bergabung, cara_bergabung) both use this shape: no theme HTML/CSS is
// shipped to the app, just typed blocks the app renders with its own
// typography.
export type Block =
  | { type: 'h1' | 'h2' | 'h3' | 'p'; text: string }
  | { type: 'ul' | 'ol'; items: string[] };

export function openLink(href: string) {
  const url = /^https?:\/\//i.test(href) ? href : `https://${href}`;
  Linking.openURL(url).catch(() => {});
}

// A block's text may contain a bare <a href="...">label</a> — every other
// tag was stripped server-side. Split it into plain runs + tappable links.
const LINK_RE = /<a href="([^"]*)">(.*?)<\/a>/gi;
export function renderInline(text: string): React.ReactNode[] {
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

export function renderBlock(block: Block, i: number) {
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

const styles = StyleSheet.create({
  h1: { fontFamily: fonts.heading, fontSize: 22, color: colors.heading, marginBottom: 12 },
  h2: { fontFamily: fonts.heading, fontSize: 18, color: colors.heading, marginTop: 18, marginBottom: 10 },
  h3: { fontFamily: fonts.headingSemi, fontSize: 15, color: colors.heading, marginTop: 14, marginBottom: 8 },
  paragraph: { fontFamily: fonts.body, fontSize: 14, color: colors.text, lineHeight: 22, marginBottom: 14 },

  list: { marginBottom: 14 },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  bullet: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text, width: 16 },
  listText: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.text, lineHeight: 22 },

  link: { color: colors.accent, fontFamily: fonts.bodyMedium, textDecorationLine: 'underline' },
});
