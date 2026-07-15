import React from 'react';
import { Image, Linking, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from './theme';

// Shared with any backend field that returns { blocks } — the static info
// pages (/page/{slug}) and every rich text CPT field (community's
// tentang_kami/syarat_bergabung/cara_bergabung, events' tentang_event) use
// this shape: no theme HTML/CSS is shipped to the app, just typed blocks the
// app renders with its own typography.
export type Block =
  | { type: 'h1' | 'h2' | 'h3' | 'p'; text: string }
  | { type: 'ul' | 'ol'; items: string[] }
  | { type: 'img'; src: string };

export function openLink(href: string) {
  const url = /^https?:\/\//i.test(href) ? href : `https://${href}`;
  Linking.openURL(url).catch(() => {});
}

// A block's text may contain bare <a href>, <strong>/<b>, <em>/<i>, <u> tags —
// every other tag was stripped server-side. Tokenize by tag (tracking nesting
// with counters) into plain runs + styled/tappable inline Text nodes.
const TAG_RE = /<(\/?)(a|strong|b|em|i|u)(?:\s+href="([^"]*)")?>/gi;

type InlineSeg = { text: string; bold: boolean; italic: boolean; underline: boolean; href?: string };

function parseInline(text: string): InlineSeg[] {
  const segs: InlineSeg[] = [];
  let bold = 0;
  let italic = 0;
  let underline = 0;
  let href: string | undefined;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  TAG_RE.lastIndex = 0;
  const push = (chunk: string) => {
    if (chunk) segs.push({ text: chunk, bold: bold > 0, italic: italic > 0, underline: underline > 0, href });
  };
  while ((m = TAG_RE.exec(text))) {
    if (m.index > lastIndex) push(text.slice(lastIndex, m.index));
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase();
    if (tag === 'a') href = closing ? undefined : m[3];
    else if (tag === 'strong' || tag === 'b') bold += closing ? -1 : 1;
    else if (tag === 'em' || tag === 'i') italic += closing ? -1 : 1;
    else if (tag === 'u') underline += closing ? -1 : 1;
    lastIndex = m.index + m[0].length;
  }
  push(text.slice(lastIndex));
  return segs;
}

export function renderInline(text: string): React.ReactNode[] {
  return parseInline(text).map((seg, i) => {
    const style = [
      seg.bold && styles.bold,
      seg.italic && styles.italic,
      seg.underline && styles.underline,
      seg.href && styles.link,
    ].filter(Boolean);
    if (!style.length) return seg.text;
    if (seg.href) {
      const href = seg.href;
      return (
        <Text key={i} style={style} onPress={() => openLink(href)}>
          {seg.text}
        </Text>
      );
    }
    return (
      <Text key={i} style={style}>
        {seg.text}
      </Text>
    );
  });
}

// Inverse of the backend's html_to_blocks() — reconstructs an HTML string
// from blocks, for seeding the rich text editor when re-editing existing
// content. Inline text already carries its <a>/<strong>/<em>/<u> tags as-is.
export function blocksToHtml(blocks: Block[]): string {
  return (blocks || [])
    .map((b) => {
      switch (b.type) {
        case 'ul':
        case 'ol':
          return `<${b.type}>${b.items.map((item) => `<li>${item}</li>`).join('')}</${b.type}>`;
        case 'img':
          return `<p><img src="${b.src}"></p>`;
        default:
          return `<${b.type}>${b.text}</${b.type}>`;
      }
    })
    .join('');
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
    case 'img':
      return <Image key={i} source={{ uri: block.src }} style={styles.image} resizeMode="cover" />;
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
  image: { width: '100%', aspectRatio: 16 / 10, borderRadius: 12, backgroundColor: colors.bgAlt, marginBottom: 14 },

  list: { marginBottom: 14 },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  bullet: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text, width: 16 },
  listText: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.text, lineHeight: 22 },

  link: { color: colors.accent, fontFamily: fonts.bodyMedium, textDecorationLine: 'underline' },
  bold: { fontFamily: fonts.bodySemi },
  italic: { fontStyle: 'italic' },
  underline: { textDecorationLine: 'underline' },
});
