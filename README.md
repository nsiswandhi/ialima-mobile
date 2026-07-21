# IALIMA Mobile — Lima Circle

Mobile app for **Lima Circle**, the alumni community platform for IA Lima
(Ikatan Alumni). Browse fellow alumni, join communities and events, buy from
or promote alumni-run businesses, read and write articles, chat with other
members, and manage your own profile — all from your phone.

It's a client for an existing **WordPress** backend: all data (members,
profiles, auth, communities, marketplace, events, articles, chat) comes from
a custom WordPress REST API. There is no separate server in this repo.

## Stack

| Layer | Tech |
|-------|------|
| Framework | [React Native](https://reactnative.dev/) via [Expo](https://expo.dev/) (SDK 54) |
| Language | TypeScript |
| UI | React Native core components (no UI kit); custom theme in `src/theme.ts` |
| Fonts | Nunito + Inter via `@expo-google-fonts` |
| Auth storage | `expo-secure-store` (JWT) |
| Image picker | `expo-image-picker` (avatars, listing/gallery photos) |
| Push notifications | `expo-notifications`, relayed through Expo's push service (backed by Firebase Cloud Messaging) |
| Analytics & crash reporting | `@react-native-firebase/analytics` + `/crashlytics` (see `src/analytics.ts`) |
| Safe areas | `react-native-safe-area-context` |

Key package versions (see [`package.json`](package.json) for the full list):
`expo ^54`, `react-native 0.81`, `react 19.1`, `typescript ~5.9`.

Because the app now includes native Firebase modules, it requires a custom
**EAS development/preview build** — plain `expo start` with **Expo Go will
not work**. See [Develop locally](#develop-locally) below.

## Backend

The app talks to a WordPress site through the **`ia5-core`** plugin, which
exposes a custom REST namespace: `/wp-json/mobile/v1`.

- **Production:** `https://ialima.id`
- **Plugin source:** `ia5-core` lives in the sibling repo
  [`nsiswandhi/ialima`](https://github.com/nsiswandhi/ialima)
  (`plugins/ia5-core`). It provides JWT auth, the member directory,
  marketplace, community, events, articles, chat, push, and notifications
  endpoints this app consumes.

The JWT is sent in an `X-IA5-Token` header (the server also accepts
`Authorization: Bearer`). See that repo's Postman collection
(`ialima-mobile-api.postman_collection.json`) for the full endpoint list.

## Features / screens

- **Auth** — login (phone + password), sign up, forgot/reset password
- **Dashboard** — activity overview and shortcuts into other sections
- **Directory** — searchable alumni list; tap a card for a member's profile
- **My Profile** — view/edit your profile (bio, career, socials, avatar,
  change password)
- **Komunitas (Community)** — browse, create, join, and manage alumni
  interest communities
- **Marketplace** — browse and manage alumni-run business listings
  (products, services, places)
- **Events** — browse, create, and follow/RSVP to events
- **Artikel (Articles)** — read, write, and submit articles for review
- **Chat** — 1:1 messaging between members
- **Notifications & Broadcasts** — in-app activity feed and announcements
- **Angkatan** — graduating-class (batch) membership requests/verification
- **Account** — delete account, privacy policy, terms

## Project layout

```
App.tsx                    Root: auth state, tab navigation (hand-rolled state machine)
index.ts                   Entry point: error boundary + global exception handler
src/
  analytics.ts             Firebase Analytics/Crashlytics wrapper (screens, events, errors)
  ErrorBoundary.tsx         App-wide React error boundary
  config.ts                API base URL + environment switch
  theme.ts                 Colors and font families
  Header.tsx               Shared top bar
  SignUpScreen.tsx         Registration form
  ForgotPasswordScreen.tsx Password recovery (request code + reset)
  ProfileScreen.tsx        Profile view + edit form
  ProfileView.tsx          Read-only profile presentation
  MemberDetailScreen.tsx   Another member's profile
  marketplace/             Marketplace feature (screens + api.ts)
  community/               Komunitas feature (screens + api.ts)
  events/                  Events feature (screens + api.ts)
  artikel/                 Articles feature (screens + api.ts)
  chat/                    Chat feature (screens + api.ts)
  angkatan/                Angkatan request/approval feature
  reviews/                 Shared ratings/review UI
```

Each feature module follows the same convention: its own `api.ts` with thin
`fetch` wrappers (own `headers`/`parse`/`form` helpers per module, by design —
not shared across features) plus its own screen components.

## Configuration

Which backend the app hits is set in [`src/config.ts`](src/config.ts) via the
`ENV` constant:

- `production` → `https://ialima.id` (default)
- `local` → `http://ialima.local` (LocalWP, PC browser preview only)
- `livelink` → a LocalWP Live Link tunnel (for testing on a physical phone)

## Develop locally

Working directory: `E:\IA52023\IALIMA-APPS\ialima-mobile`

```bash
npm install                              # first time only
npx eas-cli build --profile development --platform android   # one-time / after native deps change
npx expo start --dev-client              # start Metro, then connect from the dev-client app on your phone
```

Sign in with a real member's phone + password (the default `production`
config points at the live site).

### Push notifications & analytics setup

- Firebase project credentials (`google-services.json`) are required for
  `@react-native-firebase/*` and are already committed (contains only public
  identifiers, per Firebase's own guidance).
- Android push notifications require an FCM V1 service-account key uploaded
  to EAS credentials (`npx eas-cli credentials`) — this key itself is a
  secret and is **not** committed to this repo.
