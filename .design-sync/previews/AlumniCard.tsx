import React from 'react';
import { View } from 'react-native';
import AlumniCard from '../../src/AlumniCard';

const wrap = { width: 170 } as const;

export function WithPhoto() {
  return (
    <View style={wrap}>
      <AlumniCard
        member={{
          id: 1,
          name: 'Dewi Anggraini',
          avatar: { thumbnail: 'https://i.pravatar.cc/200?img=47' },
          angkatan: '1998',
          job_title: 'Head of Marketing, Bank Mandiri',
        }}
        onPress={() => {}}
      />
    </View>
  );
}

export function NoPhoto() {
  return (
    <View style={wrap}>
      <AlumniCard
        member={{ id: 2, name: 'Rangga Wirawan', avatar: null, angkatan: '2004' }}
        onPress={() => {}}
      />
    </View>
  );
}

export function LongName() {
  return (
    <View style={wrap}>
      <AlumniCard
        member={{
          id: 3,
          name: 'Muhammad Fadillah Ramadhan Putra',
          avatar: { thumbnail: 'https://i.pravatar.cc/200?img=12' },
          angkatan: '2011',
          job_title: 'Senior Product Manager, Gojek Indonesia',
        }}
        onPress={() => {}}
      />
    </View>
  );
}
