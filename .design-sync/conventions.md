## Lima Circle — build conventions

This library is the **real IALIMA mobile app's** components (Expo / React
Native), rendered for the web via `react-native-web`. Treat every component
as a **fully self-styled black box** — never write a CSS class or a `style="
…"` string targeting its internals. There is no utility-class vocabulary and
no CSS custom properties to hook into; styling comes from React Native
`StyleSheet.create()` objects compiled inside `_ds_bundle.js`, invisible from
outside. Compose these components with layout only (flex containers, gaps,
width constraints via the component's own `style` prop where one exists —
check the component's `.d.ts`).

### Required setup

`Header` (and any future component reading `useSafeAreaInsets`) needs
`react-native-safe-area-context`'s `SafeAreaProvider` in the tree, or it
throws. Wrap the app root:

```tsx
import { SafeAreaProvider } from 'react-native-safe-area-context';

<SafeAreaProvider>
  {/* your app, including any Lima Circle components */}
</SafeAreaProvider>
```

### Brand palette (for surrounding UI you build yourself — not exposed as tokens)

Pulled from the live IALIMA website's Elementor kit. These are **not**
CSS variables or exported constants — match them by value when building
layout/background around these components:

- Primary (forest green): `#4C7A6A` · pressed/dark: `#2F4F45`
- Secondary (warm gold): `#E6C27A` · Accent (terracotta): `#E07A6B`
- Background (cream): `#FBF9F6` · Panel: `#F4F1EC` · Border: `#E3E1DB`
- Heading text: `#2E3D36` · Body text: `#5F635F` · Muted: `#8A8F8A`
- Headings: Nunito (600/700) · Body: Inter (400/500/600) — both shipped in
  `fonts/` and declared in `styles.css`.

### Where the truth lives

- `components/<Group>/<Name>/<Name>.d.ts` — the real prop contract.
- `components/<Group>/<Name>/<Name>.prompt.md` — realistic usage with real
  IALIMA-shaped data (Indonesian names/cities, WIB timestamps for events).
- `styles.css` → `fonts/fonts.css` — the only static CSS this DS ships
  (fonts); everything else is runtime-styled, so don't expect component CSS
  to be inspectable there.

### Idiomatic composition

```tsx
<SafeAreaProvider>
  <Header
    title="Dashboard"
    profile={{ name: 'Dewi Anggraini', avatar: { thumbnail: url }, angkatan: '1998', city: 'Bandung', roles: ['Pengurus'] }}
    onNavigate={(target) => navigate(target)}
    onLogout={() => logout()}
    unreadCount={3}
  />
  <View style={{ flexDirection: 'row', gap: 12, padding: 16, flexWrap: 'wrap' }}>
    <AlumniCard member={{ id: 1, name: 'Rangga Wirawan', avatar: null, angkatan: '2004' }} onPress={() => {}} style={{ width: 170 }} />
    <BrandCard brand={{ id: 1, name: 'Kopi Senja', type: 'product', category: 'Minuman', city: 'Bandung', logo, has_location: true, owner_id: 1, rating_average: 4.6, rating_count: 32 }} onPress={() => {}} style={{ width: 170 }} />
  </View>
</SafeAreaProvider>
```

Cards (`AlumniCard`/`BrandCard`/`CommunityCard`) size via their own `style`
prop from the parent (grid cell vs. carousel item) — they don't have an
intrinsic width. `EventListCard` is full-width by design.
