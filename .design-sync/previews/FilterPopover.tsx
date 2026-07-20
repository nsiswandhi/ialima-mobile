import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import FilterPopover from '../../src/FilterPopover';
import { colors, fonts } from '../../src/theme';

const OPTIONS = ['Semua Angkatan', 'Angkatan 1996', 'Angkatan 2004', 'Angkatan 2011', 'Angkatan 2018'];

function FilterList() {
  return (
    <View style={styles.list}>
      {OPTIONS.map((label, i) => (
        <Pressable key={label} style={styles.row}>
          <Text style={[styles.rowText, i === 0 && styles.rowTextActive]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Open() {
  return (
    <View style={{ width: 400, height: 420 }}>
      <FilterPopover visible onClose={() => {}} topOffset={16}>
        <FilterList />
      </FilterPopover>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: 4 },
  row: { paddingVertical: 11, paddingHorizontal: 18 },
  rowText: { fontFamily: fonts.body, fontSize: 14, color: colors.text },
  rowTextActive: { fontFamily: fonts.bodySemi, color: colors.primary },
});
