import React from 'react';
import { View } from 'react-native';
import CommunityCard from '../../src/community/CommunityCard';

const wrap = { width: 170 } as const;

export function Active() {
  return (
    <View style={wrap}>
      <CommunityCard
        community={{
          id: 1,
          name: 'Komunitas Runners IA Lima',
          community_type: 'Olahraga',
          logo: { full: 'https://picsum.photos/seed/runners/300', thumbnail: 'https://picsum.photos/seed/runners/300' },
          berdiri_sejak: '2016',
          status_komunitas: 'Aktif',
          introduction: '',
          member_count: 214,
          view_count: 5400,
          owner_id: 5,
          approval_status: 'approved',
          rating_average: 4.8,
          rating_count: 51,
        }}
        onPress={() => {}}
      />
    </View>
  );
}

export function DalamPembentukan() {
  return (
    <View style={wrap}>
      <CommunityCard
        community={{
          id: 2,
          name: 'Komunitas Fotografi Alumni',
          community_type: 'Hobi',
          logo: null,
          berdiri_sejak: '2024',
          status_komunitas: 'Dalam Pembentukan',
          introduction: '',
          member_count: 12,
          view_count: 80,
          owner_id: 6,
          approval_status: 'pending',
          rating_average: null,
          rating_count: 0,
        }}
        onPress={() => {}}
      />
    </View>
  );
}
