// The drawer's open state is triggered by internal component state (tapping
// the burger) with no controlling prop, so it can't be composed statically —
// see .design-sync/NOTES.md "Known render warns" / deferred states.
import React from 'react';
import { View } from 'react-native';
import Header from '../../src/Header';

export function Dashboard() {
  return (
    <View style={{ width: 400 }}>
      <Header
        title="Dashboard"
        profile={{
          name: 'Dewi Anggraini',
          avatar: { thumbnail: 'https://i.pravatar.cc/200?img=47' },
          angkatan: '1998',
          city: 'Bandung',
          roles: ['Pengurus'],
        }}
        onNavigate={() => {}}
        onLogout={() => {}}
        unreadCount={3}
      />
    </View>
  );
}

export function DetailScreen() {
  return (
    <View style={{ width: 400 }}>
      <Header title="Detail Alumni" onBack={() => {}} />
    </View>
  );
}

export function SimpleLogoutBar() {
  return (
    <View style={{ width: 400 }}>
      <Header title="Syarat & Ketentuan" onLogout={() => {}} />
    </View>
  );
}
