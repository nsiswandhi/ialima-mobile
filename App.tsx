import React, { useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, Pressable,
  StatusBar, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE } from './src/config';
import { colors, fonts } from './src/theme';
import Header from './src/Header';
import ProfileScreen from './src/ProfileScreen';
import SignUpScreen from './src/SignUpScreen';
import MemberDetailScreen from './src/MemberDetailScreen';
import MarketplaceScreen from './src/MarketplaceScreen';
import DashboardScreen from './src/DashboardScreen';
import KeyboardAwareScroll from './src/KeyboardAwareScroll';

// Brand logo, downloaded from the WordPress site (wp-content/.../logo-apps.png).
const logo = require('./assets/logo.png');

// ---- Types that mirror what the WordPress API returns ----
type Caps = {
  member_features: boolean;
  recognize: boolean;
  verify_same_angkatan: boolean;
  verify_any: boolean;
  appoint_pengurus: boolean;
  manage_community: boolean;
  manage_own_brand: boolean;
};
type User = {
  id: number;
  name: string;
  email: string;
  angkatan?: string;
  roles?: string[];
  is_member?: boolean;
  caps?: Caps;
};
type Member = {
  id: number;
  name: string;
  avatar: { thumbnail: string } | null;
  angkatan: string;
  job_title: string;
  company: string;
  city: string;
};

function AppInner() {
  const insets = useSafeAreaInsets();

  // Load the brand fonts before rendering so text doesn't flash in a fallback.
  // Import the exact weights directly (the package's barrel index.js references
  // weights that aren't all shipped, so we bypass it with subpath requires).
  const [fontsLoaded] = useFonts({
    Nunito_600SemiBold: require('@expo-google-fonts/nunito/600SemiBold/Nunito_600SemiBold.ttf'),
    Nunito_700Bold: require('@expo-google-fonts/nunito/700Bold/Nunito_700Bold.ttf'),
    Inter_400Regular: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
    Inter_500Medium: require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
    Inter_600SemiBold: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
  });

  // Auth state. `token` is the JWT from /login; null means logged out.
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // Login form fields.
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Which auth screen shows when logged out.
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');

  // Which authenticated tab is showing. Login lands on the Dashboard.
  const [tab, setTab] = useState<'dashboard' | 'directory' | 'marketplace' | 'profile'>('dashboard');
  // A brand id to deep-link into on the Marketplace tab (e.g. from the Dashboard).
  const [marketplaceBrandId, setMarketplaceBrandId] = useState<number | null>(null);

  // Directory + UI state.
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When a directory card is tapped, show that member's detail screen.
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);

  // Call POST /login, store the token, then load the directory.
  async function handleLogin() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ phone, password }).toString(),
      });
      const data = await res.json();
      if (!res.ok) {
        // WordPress returns { code, message } on error.
        throw new Error(data?.message || 'Login failed');
      }
      setToken(data.token);
      setUser(data.user);
      setTab('dashboard');
      await loadMembers('', data.token); // prefetch the directory for the Directory tab
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Call GET /members (auth-gated) with an optional name search. On the initial
  // post-login load the token isn't in state yet, so it can be passed explicitly.
  async function loadMembers(q: string, authToken?: string) {
    const t = authToken ?? token;
    setError(null);
    setLoading(true);
    try {
      const url = `${API_BASE}/members?per_page=50&search=${encodeURIComponent(q)}`;
      const res = await fetch(url, t ? { headers: { 'X-IA5-Token': t } } : undefined);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Could not load members');
      setMembers(data.data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setToken(null);
    setUser(null);
    setMembers([]);
    setPhone('');
    setPassword('');
    setSelectedMemberId(null);
    setTab('dashboard');
  }

  // Hold rendering until fonts are ready (keeps the brand look consistent).
  if (!fontsLoaded) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // ---------- SIGN UP SCREEN ----------
  if (!token && authView === 'signup') {
    return <SignUpScreen onBackToLogin={() => setAuthView('login')} />;
  }

  // ---------- LOGIN SCREEN ----------
  if (!token) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <KeyboardAwareScroll style={styles.flex} contentContainerStyle={styles.loginScroll}>
        <View style={styles.loginBox}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
          <Text style={styles.brand}>LIMA Circle</Text>
          <Text style={styles.subtitle}>Alumni Directory</Text>

          <TextInput
            style={styles.input}
            placeholder="Phone (e.g. 0812… or +62…)"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.muted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
          </Pressable>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={styles.signupLink} onPress={() => setAuthView('signup')}>
            <Text style={styles.signupLinkText}>Don’t have an account? Sign Up here..</Text>
          </Pressable>
        </View>
        </KeyboardAwareScroll>
      </View>
    );
  }

  // ---------- AUTHENTICATED (tabbed) ----------
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {tab === 'dashboard' ? (
        <DashboardScreen
          token={token}
          userName={user?.name}
          onOpenBrand={(id) => { setMarketplaceBrandId(id); setTab('marketplace'); }}
          onOpenMember={(id) => { setSelectedMemberId(id); setTab('directory'); }}
          onLogout={logout}
        />
      ) : tab === 'profile' ? (
        <ProfileScreen
          token={token}
          userId={user!.id}
          onLogout={logout}
          onBackToDirectory={() => setTab('directory')}
          onNameUpdated={(name) => setUser((u) => (u ? { ...u, name } : u))}
          canManage={!!user?.caps?.manage_own_brand}
        />
      ) : tab === 'marketplace' ? (
        <MarketplaceScreen
          token={token}
          viewerId={user!.id}
          onLogout={logout}
          initialBrandId={marketplaceBrandId}
        />
      ) : selectedMemberId ? (
        <MemberDetailScreen
          memberId={selectedMemberId}
          token={token}
          viewer={user}
          onBack={() => setSelectedMemberId(null)}
          onLogout={logout}
        />
      ) : (
      <View style={styles.flex}>
      <Header title="Directory" onLogout={logout} />

      <View style={styles.searchRow}>
        <TextInput
          style={[styles.input, styles.searchInput]}
          placeholder="Search by name…"
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => loadMembers(search)}
        />
        <Pressable
          style={({ pressed }) => [styles.searchBtn, pressed && styles.buttonPressed]}
          onPress={() => loadMembers(search)}
        >
          <Text style={styles.buttonText}>Go</Text>
        </Pressable>
      </View>

      {loading && <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary} />}
      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={members}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>No members found.</Text> : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => setSelectedMemberId(item.id)}
          >
            {item.avatar?.thumbnail ? (
              <Image source={{ uri: item.avatar.thumbnail }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarLetter}>{item.name?.charAt(0) || '?'}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {[item.job_title, item.company].filter(Boolean).join(' · ')}
              </Text>
              <View style={styles.metaRow}>
                {!!item.angkatan && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Angkatan {item.angkatan}</Text>
                  </View>
                )}
                {!!item.city && <Text style={styles.metaLight}>{item.city}</Text>}
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        )}
      />
      </View>
      )}

      {/* Bottom tab bar — pad by the bottom inset so it clears the gesture nav. */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom || 10 }]}>
        {([
          { key: 'dashboard', label: 'Dashboard', icon: 'grid' },
          { key: 'directory', label: 'Directory', icon: 'people' },
          { key: 'marketplace', label: 'Marketplace', icon: 'storefront' },
          { key: 'profile', label: 'Profile', icon: 'person' },
        ] as const).map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              style={styles.tabItem}
              onPress={() => {
                setSelectedMemberId(null);
                setMarketplaceBrandId(null);
                setTab(t.key);
              }}
            >
              <Ionicons
                name={(active ? t.icon : `${t.icon}-outline`) as any}
                size={22}
                color={active ? colors.primary : colors.muted}
              />
              <Text style={[styles.tabLabel, active && styles.tabActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function App() {
  // SafeAreaProvider must wrap the tree so useSafeAreaInsets() works everywhere.
  return (
    <SafeAreaProvider>
      <AppInner />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },

  // ---- Bottom tab bar ----
  tabBar: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 8, gap: 3 },
  tabLabel: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.muted },
  tabActive: { color: colors.primary },

  // ---- Login ----
  loginScroll: { flexGrow: 1, justifyContent: 'center' },
  loginBox: { flex: 1, justifyContent: 'center', padding: 28, maxWidth: 420, width: '100%', alignSelf: 'center' },
  logo: { width: 96, height: 96, alignSelf: 'center', marginBottom: 12 },
  brand: { fontFamily: fonts.heading, fontSize: 30, textAlign: 'center', color: colors.primary },
  subtitle: { fontFamily: fonts.body, fontSize: 15, color: colors.muted, textAlign: 'center', marginBottom: 28 },

  input: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13, fontSize: 16, marginBottom: 12,
    fontFamily: fonts.body, color: colors.heading,
  },
  button: {
    backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginTop: 6,
  },
  buttonPressed: { backgroundColor: colors.primaryDark },
  buttonText: { color: colors.white, fontFamily: fonts.headingSemi, fontSize: 16 },
  error: { color: colors.danger, textAlign: 'center', marginTop: 14, fontFamily: fonts.bodyMedium },
  signupLink: { alignItems: 'center', marginTop: 22 },
  signupLinkText: { color: colors.primary, fontFamily: fonts.bodyMedium, fontSize: 14 },

  // ---- Directory header ----
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14,
    backgroundColor: colors.primary, overflow: 'visible', zIndex: 10,
  },
  headerLogo: {
    position: 'absolute', left: 14, top: 8, width: 78, height: 78, zIndex: 11,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  greetBlock: { alignItems: 'flex-end' },
  hello: { fontFamily: fonts.heading, fontSize: 18, color: colors.white },
  headerSub: { fontFamily: fonts.body, fontSize: 12, color: '#DCE7E1' },
  burger: { width: 26, height: 20, justifyContent: 'space-between', paddingVertical: 2 },
  burgerLine: { height: 2.5, borderRadius: 2, backgroundColor: colors.white },

  // Burger drawer
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', flexDirection: 'row', justifyContent: 'flex-end' },
  menuPanel: { width: 250, backgroundColor: colors.card, paddingTop: 44, paddingHorizontal: 10 },
  menuHeading: { fontFamily: fonts.heading, fontSize: 20, color: colors.primary, paddingHorizontal: 10, marginBottom: 10 },
  menuItem: { paddingVertical: 14, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: colors.bgAlt },
  menuItemText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.heading },
  menuLogout: { paddingVertical: 14, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8 },
  menuLogoutText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.danger },

  // ---- Welcome banner (directory, once after login) ----
  welcomeCard: {
    marginHorizontal: 12, marginTop: 40, backgroundColor: colors.card,
    borderRadius: 14, borderLeftWidth: 4, borderLeftColor: colors.secondary,
    paddingVertical: 14, paddingHorizontal: 16,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.primaryDark, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  welcomeHi: { fontFamily: fonts.heading, fontSize: 20, color: colors.heading },
  welcomeMsg: { fontFamily: fonts.body, fontSize: 14, color: colors.text, marginTop: 4, lineHeight: 20 },

  // ---- Search ----
  searchRow: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 46, paddingBottom: 12, gap: 8, alignItems: 'center' },
  searchRowTight: { paddingTop: 14 },
  searchInput: { flex: 1, marginBottom: 0 },
  searchBtn: {
    backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 20,
  },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40, fontFamily: fonts.body },

  // ---- Member card ----
  card: {
    backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.primaryDark, shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  cardPressed: { backgroundColor: colors.bgAlt },
  chevron: { fontFamily: fonts.heading, fontSize: 24, color: colors.muted, marginLeft: 4 },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.bgAlt },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  avatarLetter: { fontFamily: fonts.heading, fontSize: 22, color: colors.primary },
  name: { fontFamily: fonts.headingSemi, fontSize: 16, color: colors.heading },
  meta: { fontFamily: fonts.body, fontSize: 13, color: colors.text, marginTop: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  metaLight: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  badge: { backgroundColor: colors.bgAlt, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.primary },
});
