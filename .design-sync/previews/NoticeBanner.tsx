import React from 'react';
import { View } from 'react-native';
import NoticeBanner from '../../src/NoticeBanner';

export function Default() {
  return (
    <View style={{ width: 360 }}>
      <NoticeBanner message="Perubahan profil berhasil disimpan." onDismiss={() => {}} />
    </View>
  );
}

export function LongMessage() {
  return (
    <View style={{ width: 360 }}>
      <NoticeBanner
        message="Pengajuan komunitas Anda telah dikirim dan sedang menunggu persetujuan dari Pengurus IA Lima."
        onDismiss={() => {}}
      />
    </View>
  );
}
