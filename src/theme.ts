// Brand design tokens, pulled straight from the IALIMA WordPress site's
// Elementor global kit (post-6.css) so the app matches the website 1:1.
//
//   Fonts:   Headings = Nunito, Body = Inter  (loaded via @expo-google-fonts)
//   Palette: forest green primary, warm gold + terracotta accents on cream.
export const colors = {
  primary: '#4C7A6A', // forest green — main brand / buttons / titles
  primaryDark: '#2F4F45', // deep green — pressed states
  secondary: '#E6C27A', // warm gold — highlights
  accent: '#E07A6B', // terracotta — links / secondary actions
  accentDark: '#C05E50',

  heading: '#2E3D36', // near-black green for headings
  text: '#5F635F', // body copy
  muted: '#8A8F8A', // captions / meta

  bg: '#FBF9F6', // app background (cream)
  bgAlt: '#F4F1EC', // subtle panels
  card: '#FFFFFF',
  border: '#E3E1DB',

  danger: '#C05E50',
  white: '#FFFFFF',
};

// Font family names as registered by @expo-google-fonts.
export const fonts = {
  heading: 'Nunito_700Bold',
  headingSemi: 'Nunito_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
};
