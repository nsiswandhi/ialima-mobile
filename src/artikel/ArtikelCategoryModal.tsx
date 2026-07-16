// Category filter — anchored dropdown (not full width), styled as a
// vertical list of nav links. Replaces the old chip row + overflow sheet.
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts } from '../theme';
import { ArtikelCategory } from './api';
import FilterPopover from '../FilterPopover';

type Props = {
  visible: boolean;
  categories: ArtikelCategory[];
  selected: string;
  onSelect: (slug: string) => void;
  onClose: () => void;
};

export default function ArtikelCategoryModal({ visible, categories, selected, onSelect, onClose }: Props) {
  const shown = categories.filter((c) => c.slug !== 'uncategorized');

  return (
    <FilterPopover visible={visible} onClose={onClose} topOffset={100}>
      <Pressable style={styles.link} onPress={() => { onSelect(''); onClose(); }}>
        <Text style={[styles.linkText, selected === '' && styles.linkTextActive]}>Semua Kategori</Text>
      </Pressable>
      {shown.map((c) => (
        <Pressable key={c.slug} style={styles.link} onPress={() => { onSelect(c.slug); onClose(); }}>
          <Text style={[styles.linkText, selected === c.slug && styles.linkTextActive]} numberOfLines={1}>{c.label}</Text>
        </Pressable>
      ))}
    </FilterPopover>
  );
}

const styles = StyleSheet.create({
  link: { paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  linkText: { fontFamily: fonts.body, fontSize: 14, color: colors.text },
  linkTextActive: { fontFamily: fonts.bodySemi, color: colors.primary },
});
