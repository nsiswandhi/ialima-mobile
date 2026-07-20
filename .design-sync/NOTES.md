# Lima Circle design-sync — repo notes

## Off-script build (read this first on any re-sync)

`ialima-mobile` is an Expo/React Native app, not a web component library — the
packaged design-sync converter (`package-build.mjs`) bundles with plain
esbuild targeting the browser and has **no support for aliasing
`react-native` → `react-native-web`**, and that alias would have to live in
`lib/bundle.mjs`, which the skill explicitly forbids forking. So this repo
uses a **fully custom off-script pipeline** instead:

- `.design-sync/build-tools/build.mjs` — the build entry point (`node build.mjs`
  from `.design-sync/build-tools/`). Cleans `ds-bundle/`, builds `_vendor/`,
  builds `_ds_bundle.js`, copies fonts, writes `styles.css`, builds each
  component's preview card, writes `.jsx`/`.d.ts`/`.prompt.md`/`README.md`/
  `.ds-build-meta.json`.
- `.design-sync/build-tools/vendor-build.mjs` — builds `_vendor/react.js`
  (`window.React`) and `_vendor/react-dom.js` (`window.ReactDOM`, merging
  `react-dom` + `react-dom/client` since `createRoot` moved to the `/client`
  subpath in React 18+ while `createPortal`/`flushSync` stayed on the base
  package — react-native-web's `Modal` needs `createPortal`).
- `.design-sync/build-tools/shim-plugin.mjs` — esbuild plugins:
  `reactGlobalShimPlugin` (routes `react`/`react-dom`/`react-dom/client` to
  the shared `window.React`/`window.ReactDOM` so hooks share one dispatcher —
  do NOT use this plugin while building `_vendor/react-dom.js` itself, that's
  circular; use `reactOnlyShimPlugin` there instead, which only shims `react`),
  `reactNativeWebAliasPlugin` (aliases bare `react-native` → the repo's
  `react-native-web`), `expoFontShimPlugin` (no-op stub for `expo-font`'s
  `loadAsync`/`renderToImageAsync` — icons ship their glyph font via a plain
  `@font-face`, so the real font-loading API is never called at runtime).
- `.design-sync/build-tools/components.mjs` — the curated 8-component scope
  (hand-written `componentSrcMap` equivalent) with hand-written `.d.ts` prop
  shapes (no ts-morph `.d.ts` extraction pipeline in this build).
- `.design-sync/build-tools/node_modules/` (gitignored) has its own `esbuild`
  + `playwright` install, isolated from the app's own lockfile — same
  isolation principle the packaged converter uses for `.ds-sync/`.
- Playwright's `playwright` npm package also had to be installed directly
  into the **skill's own temp directory**
  (`<bundled-skills>/.../design-sync/node_modules/playwright`) — `package-
  validate.mjs`'s `await import('playwright')` is a bare-specifier ESM import
  that resolves relative to the script's own location, not the repo's
  `node_modules`. This is a one-off per machine/skill-version; if a future
  re-sync hits `[RENDER_SKIPPED] playwright not importable`, redo that
  install (chromium itself is cached globally at
  `%LOCALAPPDATA%\ms-playwright`, so only the npm package needs
  reinstalling).

**To re-sync**: `cd .design-sync/build-tools && node build.mjs`, then run the
packaged `package-validate.mjs` (not the packaged `package-build.mjs`)
against `../../ds-bundle`. Bump the component list in `components.mjs` to
scope in more components — check each new component's imports first (native-
only Expo APIs like `expo-image-picker`/`expo-notifications`/`expo-secure-
store`/navigation have no web story and would need their own shims or
exclusion).

## Curation scope

Scoped in 8 genuinely reusable, purely presentational components (no
navigation, no data-fetching): AlumniCard, BrandCard, CommunityCard,
EventListCard, StarRating, NoticeBanner, FilterPopover, Header. The rest of
`src/` is screen-level code organized by feature (angkatan/artikel/chat/
community/events/marketplace/reviews) tightly coupled to navigation and API
calls — not componentized for reuse, and out of scope for this run.

## Known render warns / deferred states

- **Header's navigation drawer (open state)** is triggered by internal
  `useState` on tapping the burger — no controlling prop — so it can't be
  composed statically in a preview. Only the three closed-bar configurations
  are authored (Dashboard/top-level, DetailScreen back-bar, SimpleLogoutBar).
  The drawer's actual visual (profile card, nav rows, app rows, logout row)
  is unverified by this sync.
- **FilterPopover's "Open" story**: react-native-web's `Modal` always portals
  to `document.body` at full-viewport `position: fixed` (see
  `node_modules/react-native-web/.../Modal/ModalPortal.js` — no container
  prop). At the render-check's 1200×800 viewport the panel (which is
  hardcoded `right: 16` in the real component, sized for a ~390-430px phone
  screen) lands near the top-right of the page. The full render-check
  screenshot (`_screenshots/Overlay__FilterPopover.png`) confirms it renders
  correctly and styled; the *contact-sheet thumbnail* only crops the
  top-left, so it shows solid gray there — a known cosmetic artifact of this
  repo's review tooling, not a broken render. Confirmed via the full
  screenshot before grading.

## Fonts / icons

Real assets shipped, not substitutes: Nunito 600/700 + Inter 400/500/600
(`@expo-google-fonts/*`), and Ionicons.ttf (`@expo/vector-icons`'s vendored
`react-native-vector-icons` font) — all copied into `ds-bundle/fonts/` with
`@font-face` rules in `fonts/fonts.css`, imported from `styles.css`.
react-native-web itself styles components at runtime (StyleSheet.create
objects, not static CSS) — `styles.css` legitimately has no component rules,
matching the `[CSS_RUNTIME]` case.

## Re-sync risks

- `components.mjs`'s hand-written `.d.ts` prop shapes are a manual mirror of
  the real TS types in `src/*/api.ts` — they will silently drift if those
  types change. No automated extraction catches this in the off-script build.
- The curated 8-component scope is a snapshot; if `AlumniCard`/`BrandCard`/
  `CommunityCard` etc. are refactored (props renamed, `theme.ts` tokens
  changed), re-run `build.mjs` and eyeball the contact sheet again — nothing
  auto-detects a silent prop/behavior drift in this off-script setup.
- `_ds_sync.json` is intentionally omitted (off-script layout, no
  `.stories-map.json` manifest) — every re-sync re-verifies and re-uploads
  the full set; there's no verified-by-upload skip.
