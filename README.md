# IALIMA Mobile (Expo)

Native mobile app for the LIMA Circle alumni directory. Talks to the WordPress
`ia5-core` REST API (`mobile/v1`). v1 scope: login + member directory.

## Run it (web preview — current setup)

```bash
cd E:/IA52023/IALIMA-APPS/ialima-mobile
npm run web
```

Then open **http://localhost:8081** in your browser. Log in with a member's
phone + password. The API base URL is in [`src/config.ts`](src/config.ts) and
points at `http://ialima.local` (your local WordPress).

Requirements: the LocalWP site **ialima.local must be running** in the LocalWP
app, and the `ia5-core` plugin active. CORS for localhost is handled by the
plugin's `class-ia5-cors.php` (dev only).

## Run it on a real phone later (Expo Go)

1. Install the free **Expo Go** app (App Store / Google Play).
2. Make the API reachable over WiFi: in `src/config.ts` change the host from
   `ialima.local` to your PC's LAN IP — currently **`http://192.168.1.18`** —
   *and* make sure LocalWP is reachable on the LAN (ask Claude to set this up;
   LocalWP defaults to localhost-only).
3. `npm start`, then scan the QR code with Expo Go (phone + PC on same WiFi).

> Native apps ignore CORS, so that part only matters for the web preview.

## Project layout

- `App.tsx` — the whole app for now: login screen + directory list.
- `src/config.ts` — API base URL (the one thing you change per environment).

## Next steps (not built yet)

- Member detail screen (`GET /member/{id}`) + profile-view tracking.
- "My profile" view/edit + avatar upload (needs the `Authorization: Bearer`
  header; the plugin CORS already allows it).
- Persist the login token (expo-secure-store) so you stay logged in.
- Navigation (expo-router) once there is more than one screen.
