import React from 'react';
import { View } from 'react-native';
import EventListCard from '../../src/events/EventListCard';

const wrap = { width: 360 } as const;

export function Offline() {
  return (
    <View style={wrap}>
      <EventListCard
        event={{
          id: 1,
          name: 'Reuni Akbar Angkatan 1996–2000',
          event_category: 'Reuni',
          logo: null,
          organizer: 'Angkatan',
          organizer_label: 'Angkatan 1996',
          event_angkatan: '1996',
          jenis_event: 'Offline',
          start_date: 1786759200,
          start_date_display: '',
          end_date: 1786770000,
          end_date_display: '',
          is_featured: true,
          view_count: 320,
          owner_id: 1,
          approval_status: 'approved',
          follower_count: 128,
        }}
        onPress={() => {}}
      />
    </View>
  );
}

export function OnlineMultiDay() {
  return (
    <View style={wrap}>
      <EventListCard
        event={{
          id: 2,
          name: 'Webinar Karier: Membangun Personal Brand di LinkedIn',
          event_category: 'Webinar',
          logo: null,
          organizer: 'IA Lima',
          organizer_label: 'Pengurus IA Lima',
          event_angkatan: '',
          jenis_event: 'Online',
          start_date: 1788562800,
          start_date_display: '',
          end_date: 1788685200,
          end_date_display: '',
          is_featured: false,
          view_count: 95,
          owner_id: 2,
          approval_status: 'approved',
        }}
        onPress={() => {}}
      />
    </View>
  );
}

export function Hybrid() {
  return (
    <View style={wrap}>
      <EventListCard
        event={{
          id: 3,
          name: 'Bakti Sosial Komunitas Peduli Lima',
          event_category: 'Bakti Sosial',
          logo: null,
          organizer: 'Komunitas',
          organizer_label: 'Komunitas Peduli Lima',
          event_angkatan: '',
          jenis_event: 'Hybrid',
          start_date: 1786759200,
          start_date_display: '',
          end_date: 1786770000,
          end_date_display: '',
          is_featured: false,
          view_count: 44,
          owner_id: 3,
          approval_status: 'approved',
          follower_count: 0,
        }}
        onPress={() => {}}
      />
    </View>
  );
}
