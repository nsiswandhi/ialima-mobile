import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import Header, { DrawerProfile, NavTarget } from '../Header';
import BrandFormScreen from '../BrandFormScreen';
import ManageItemsScreen from '../ManageItemsScreen';
import MyBrandsSection from './MyBrandsSection';

type BrandNav = null | { kind: 'create' } | { kind: 'edit'; id: number } | { kind: 'items'; id: number };

type Props = {
  token: string;
  viewerId: number;
  canManage: boolean;
  onBack: () => void;
  onLogout: () => void;
  profile?: DrawerProfile;
  onNavigate?: (target: NavTarget) => void;
};

// Burger-menu destination for "My Marketplace" — full-screen version of the
// brand list ProfileScreen embeds inline, reusing the same MyBrandsSection +
// create/edit/items sub-navigation (mirrors ProfileScreen.tsx's brandNav state).
export default function MyMarketplaceScreen({ token, viewerId, canManage, onBack, onLogout, profile, onNavigate }: Props) {
  const [brandNav, setBrandNav] = useState<BrandNav>(null);
  const [refresh, setRefresh] = useState(0);

  if (brandNav) {
    const back = () => setBrandNav(null);
    const saved = () => { setBrandNav(null); setRefresh((k) => k + 1); };
    if (brandNav.kind === 'items') {
      return <ManageItemsScreen token={token} brandId={brandNav.id} onBack={back} onLogout={onLogout} />;
    }
    return (
      <BrandFormScreen
        token={token}
        brandId={brandNav.kind === 'edit' ? brandNav.id : undefined}
        onBack={back}
        onSaved={saved}
        onLogout={onLogout}
      />
    );
  }

  return (
    <View style={styles.flex}>
      <Header title="My Marketplace" onBack={onBack} onLogout={onLogout} profile={profile} onNavigate={onNavigate} />
      <View style={styles.content}>
        {canManage ? (
          <MyBrandsSection
            key={refresh}
            token={token}
            viewerId={viewerId}
            onCreate={() => setBrandNav({ kind: 'create' })}
            onEdit={(id) => setBrandNav({ kind: 'edit', id })}
            onItems={(id) => setBrandNav({ kind: 'items', id })}
          />
        ) : (
          <Text style={styles.emptyText}>Kamu belum memiliki akses untuk mengelola brand.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, padding: 16 },
  emptyText: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 40 },
});
