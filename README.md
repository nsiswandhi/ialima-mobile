# IALIMA Mobile

Mobile app for the **LIMA Circle** alumni directory — browse fellow alumni, view
member profiles, and manage your own profile from your phone.

It's a client for an existing **WordPress** backend: all data (members, profiles,
auth) comes from the WordPress REST API. There is no separate server in this repo.

## Stack

| Layer | Tech |
|-------|------|
| Framework | [React Native](https://reactnative.dev/) via [Expo](https://expo.dev/) (SDK 54) |
| Language | TypeScript |
| UI | React Native core components (no UI kit); custom theme in `src/theme.ts` |
| Fonts | Nunito + Inter via `@expo-google-fonts` |
| Image picker | `expo-image-picker` (avatar upload) |
| Safe areas | `react-native-safe-area-context` |

Key package versions (see [`package.json`](package.json) for the full list):
`expo ^54`, `react-native 0.81`, `react 19.1`, `typescript ~5.9`.

## Backend

The app talks to a WordPress site through the **`ia5-core`** plugin, which exposes
a custom REST namespace: `/wp-json/mobile/v1`.

- **Production:** `https://ialima.id`
- **Plugin source:** the `ia5-core` plugin lives in the sibling repo
  [`nsiswandhi/ialima`](https://github.com/nsiswandhi/ialima)
  (`plugins/ia5-core`). It provides JWT auth, the members endpoints, and the
  profile read/write endpoints this app consumes.

Endpoints used by the app (all under `mobile/v1`):

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/login` | Phone + password → JWT |
| POST | `/signup` | Register a new alumni account (email-activated) |
| GET | `/members` | Directory list (search, pagination) |
| GET | `/member/{id}` | Single member (incl. avatar, roles) |
| GET | `/profile` | Current user's editable fields (auth) |
| POST | `/update-profile` | Save profile fields (auth) |
| POST | `/update-avatar` | Upload avatar image, 1:1 (auth) |
| POST | `/change-password` | Change password (auth) |
| GET | `/glossary/{id}` | JetEngine glossary options (e.g. Industry) |

The JWT is sent in an `X-IA5-Token` header (the server also accepts
`Authorization: Bearer`).

## Screens

- **Login** — phone + password sign-in.
- **Sign Up** — new-account registration mirroring the website's form.
- **Directory** — searchable member list; tap a card for detail.
- **Member detail** — read-only profile of another member.
- **My Profile** — read-only view + edit form (bio, career, socials, avatar,
  change password), mirroring the website's "Update Alumni Profile" JetForm.

## Project layout

```
App.tsx                    Root: auth state, login screen, directory tab bar
src/
  config.ts                API base URL + environment switch
  theme.ts                 Colors and font families
  Header.tsx               Shared top bar
  SignUpScreen.tsx         Registration form
  ProfileScreen.tsx        Profile view + edit form
  ProfileView.tsx          Read-only profile presentation
  MemberDetailScreen.tsx   Another member's profile
  KeyboardAwareScroll.tsx  Scroll wrapper that keeps fields above the keyboard
```

## Configuration

Which backend the app hits is set in [`src/config.ts`](src/config.ts) via the
`ENV` constant:

- `production` → `https://ialima.id` (default)
- `local` → `http://ialima.local` (LocalWP, PC browser preview only)
- `livelink` → a LocalWP Live Link tunnel (for testing on a physical phone)

## Develop locally

Working directory: `E:\IA52023\IALIMA-APPS\ialima-mobile`

```bash
npm install        # first time only
npm start          # Expo dev server — scan the QR with Expo Go
npm run web        # browser preview at http://localhost:8081
```

Sign in with a real member's phone + password (the default `production` config
points at the live site).
