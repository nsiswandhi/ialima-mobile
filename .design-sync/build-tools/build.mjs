// Off-script design-sync build for ialima-mobile (Expo/React Native app —
// the packaged design-sync converter can't bundle React Native for a browser,
// see .design-sync/NOTES.md). Produces the upload layout the claude.ai/design
// app expects: _ds_bundle.js, styles.css, components/<group>/<Name>/{.html,
// .jsx,.d.ts,.prompt.md}, _vendor/, fonts/, README.md, .ds-build-meta.json.
// Gated by the packaged package-validate.mjs after this runs.
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative as pathRelative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { COMPONENTS } from './components.mjs';
import { reactGlobalShimPlugin, reactNativeWebAliasPlugin, expoFontShimPlugin } from './shim-plugin.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const OUT = join(REPO_ROOT, 'ds-bundle');
const NAMESPACE = 'LimaCircle';

const rel = (from, to) => pathRelative(from, to).split('\\').join('/');

function fresh(dir) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

console.log('== 1/7 clean output ==');
fresh(OUT);
mkdirSync(join(OUT, '_vendor'), { recursive: true });
mkdirSync(join(OUT, 'fonts'), { recursive: true });
mkdirSync(join(OUT, 'components'), { recursive: true });

console.log('== 2/7 vendor (React/ReactDOM globals) ==');
execFileSync(process.execPath, [join(HERE, 'vendor-build.mjs')], { stdio: 'inherit' });

const commonPlugins = (repoRoot) => [reactGlobalShimPlugin(), reactNativeWebAliasPlugin(repoRoot), expoFontShimPlugin()];
const commonOpts = {
  absWorkingDir: REPO_ROOT,
  bundle: true,
  platform: 'browser',
  format: 'iife',
  jsx: 'transform',
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
  resolveExtensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.json'],
  mainFields: ['browser', 'module', 'main'],
  conditions: ['browser'],
  loader: { '.png': 'dataurl', '.jpg': 'dataurl', '.ttf': 'dataurl', '.js': 'jsx' },
  logLevel: 'warning',
  target: 'es2020',
  // React Native's global dev flag (used by @expo/vector-icons and RN core
  // internals) has no browser equivalent -- statically replace it.
  define: { __DEV__: 'false' },
};

console.log('== 3/7 _ds_bundle.js (importable bundle) ==');
const entryLines = COMPONENTS.map((c, i) =>
  `import C${i} from ${JSON.stringify('./' + c.srcPath)};`,
).join('\n');
const assignLines = COMPONENTS.map((c, i) => `  ${c.name}: C${i},`).join('\n');
const bundleEntrySrc = `${entryLines}\nwindow.${NAMESPACE} = {\n${assignLines}\n};\n`;

const bundleResult = await build({
  ...commonOpts,
  stdin: { contents: bundleEntrySrc, resolveDir: REPO_ROOT, loader: 'js', sourcefile: 'ds-bundle-entry.js' },
  write: false,
  minify: true,
  plugins: commonPlugins(REPO_ROOT),
});
let bundleJs = bundleResult.outputFiles[0].text;

const sourceHashes = {};
for (const c of COMPONENTS) {
  sourceHashes[c.name] = createHash('sha256')
    .update(readFileSync(join(REPO_ROOT, c.srcPath)))
    .digest('hex')
    .slice(0, 12);
}
const headerMeta = {
  namespace: NAMESPACE,
  components: COMPONENTS.map((c) => ({ name: c.name, group: c.group })),
  sourceHashes,
  inlinedExternals: ['react-native-web', '@expo/vector-icons', 'react-native-safe-area-context'],
};
bundleJs = `/* @ds-bundle: ${JSON.stringify(headerMeta)} */\n` + bundleJs;
writeFileSync(join(OUT, '_ds_bundle.js'), bundleJs);
console.log(`  _ds_bundle.js: ${(bundleJs.length / 1024).toFixed(0)} KB`);

console.log('== 4/7 fonts ==');
const FONT_FILES = [
  ['node_modules/@expo-google-fonts/nunito/600SemiBold/Nunito_600SemiBold.ttf', 'Nunito_600SemiBold.ttf'],
  ['node_modules/@expo-google-fonts/nunito/700Bold/Nunito_700Bold.ttf', 'Nunito_700Bold.ttf'],
  ['node_modules/@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf', 'Inter_400Regular.ttf'],
  ['node_modules/@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf', 'Inter_500Medium.ttf'],
  ['node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf', 'Inter_600SemiBold.ttf'],
  ['node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf', 'Ionicons.ttf'],
];
for (const [src, name] of FONT_FILES) {
  cpSync(join(REPO_ROOT, src), join(OUT, 'fonts', name));
}
const fontsCss = `/* @font-face declarations for the fonts referenced by src/theme.ts + @expo/vector-icons' Ionicons set. */
@font-face { font-family: 'Nunito_600SemiBold'; src: url('./Nunito_600SemiBold.ttf') format('truetype'); font-weight: 600; font-display: swap; }
@font-face { font-family: 'Nunito_700Bold'; src: url('./Nunito_700Bold.ttf') format('truetype'); font-weight: 700; font-display: swap; }
@font-face { font-family: 'Inter_400Regular'; src: url('./Inter_400Regular.ttf') format('truetype'); font-weight: 400; font-display: swap; }
@font-face { font-family: 'Inter_500Medium'; src: url('./Inter_500Medium.ttf') format('truetype'); font-weight: 500; font-display: swap; }
@font-face { font-family: 'Inter_600SemiBold'; src: url('./Inter_600SemiBold.ttf') format('truetype'); font-weight: 600; font-display: swap; }
@font-face { font-family: 'Ionicons'; src: url('./Ionicons.ttf') format('truetype'); font-display: block; }
`;
writeFileSync(join(OUT, 'fonts', 'fonts.css'), fontsCss);

console.log('== 5/7 styles.css ==');
// react-native-web styles itself at runtime (StyleSheet.create objects, not
// static CSS) — see [CSS_RUNTIME] in package-validate.mjs. The only static
// CSS this DS ships is its @font-face rules.
writeFileSync(join(OUT, 'styles.css'), `@import "./fonts/fonts.css";\n/* @ds-styles: runtime — react-native-web injects component styles at runtime */\n`);

console.log('== 6/7 components/ (bundle + preview cards + docs) ==');
const USAGE = {
  AlumniCard: `<AlumniCard\n  member={{ id: 1, name: 'Dewi Anggraini', avatar: { thumbnail: url }, angkatan: '1998', job_title: 'Head of Marketing' }}\n  onPress={() => openProfile(1)}\n/>`,
  BrandCard: `<BrandCard\n  brand={{ id: 1, name: 'Kopi Senja', type: 'product', category: 'Minuman', city: 'Bandung', logo: { full, thumbnail }, has_location: true, owner_id: 10, rating_average: 4.6, rating_count: 32 }}\n  onPress={() => openBrand(1)}\n/>`,
  CommunityCard: `<CommunityCard\n  community={{ id: 1, name: 'Komunitas Runners IA Lima', community_type: 'Olahraga', logo, berdiri_sejak: '2016', status_komunitas: 'Aktif', ... }}\n  onPress={() => openCommunity(1)}\n/>`,
  EventListCard: `<EventListCard\n  event={{ id: 1, name: 'Reuni Akbar Angkatan 1996–2000', jenis_event: 'Offline', start_date, end_date, organizer_label: 'Angkatan 1996', ... }}\n  onPress={() => openEvent(1)}\n/>`,
  StarRating: `<StarRating value={4.6} count={32} size="sm" />`,
  NoticeBanner: `<NoticeBanner message="Perubahan profil berhasil disimpan." onDismiss={() => setNotice(null)} />`,
  FilterPopover: `<FilterPopover visible={open} onClose={() => setOpen(false)} topOffset={64}>\n  {/* filter option rows */}\n</FilterPopover>`,
  Header: `<Header\n  title="Dashboard"\n  profile={{ name, avatar, angkatan, city, roles }}\n  onNavigate={(target) => navigate(target)}\n  onLogout={() => logout()}\n  unreadCount={3}\n/>`,
};

for (const c of COMPONENTS) {
  const dir = join(OUT, 'components', c.group, c.name);
  mkdirSync(dir, { recursive: true });

  // .jsx — illustrative one-line re-export stub (the real export ships
  // compiled into _ds_bundle.js as window.LimaCircle.<Name>).
  writeFileSync(join(dir, `${c.name}.jsx`), `export { default } from ${JSON.stringify('../../../../' + c.srcPath)};\n`);

  // .d.ts — hand-written props (auto-extraction needs a ts-morph .d.ts
  // pipeline this off-script build doesn't run; see NOTES.md).
  writeFileSync(join(dir, `${c.name}.d.ts`), c.dts + '\n');

  // .prompt.md — first line is the element-index summary the design agent reads.
  const promptMd = `${c.summary}\n\n## Props\n\n\`\`\`ts\n${c.dts}\n\`\`\`\n\n## Usage\n\n\`\`\`tsx\n${USAGE[c.name]}\n\`\`\`\n`;
  writeFileSync(join(dir, `${c.name}.prompt.md`), promptMd);

  // Preview harness — bundles the authored .design-sync/previews/<Name>.tsx,
  // mounts each named export into its own labeled cell, wrapped in
  // SafeAreaProvider (Header reads useSafeAreaInsets and throws without it).
  const previewSrc = join(REPO_ROOT, '.design-sync', 'previews', `${c.name}.tsx`);
  const harnessSrc = `
import * as Stories from ${JSON.stringify(previewSrc)};
import { SafeAreaProvider } from 'react-native-safe-area-context';
const insetProps = { initialMetrics: { insets: { top: 0, left: 0, right: 0, bottom: 0 }, frame: { x: 0, y: 0, width: 430, height: 932 } } };
const names = Object.keys(Stories);
window.__dsCells = names;
const grid = document.getElementById('ds-grid');
for (const name of names) {
  const section = document.createElement('section');
  section.className = 'ds-cell';
  const h4 = document.createElement('h4');
  h4.textContent = name;
  const mount = document.createElement('div');
  mount.id = 'r-' + name;
  section.appendChild(h4);
  section.appendChild(mount);
  grid.appendChild(section);
  const Story = Stories[name];
  try {
    ReactDOM.createRoot(mount).render(React.createElement(SafeAreaProvider, insetProps, React.createElement(Story)));
  } catch (e) {
    mount.textContent = '⚠ ' + (e && e.message ? e.message : String(e));
  }
}
`;
  await build({
    ...commonOpts,
    stdin: { contents: harnessSrc, resolveDir: REPO_ROOT, loader: 'js', sourcefile: `${c.name}.preview-entry.js` },
    outfile: join(dir, `${c.name}.preview.js`),
    minify: false,
    plugins: commonPlugins(REPO_ROOT),
  });

  // .html card
  const stylesHref = rel(dir, join(OUT, 'styles.css'));
  const html = `<!-- @dsCard group="${c.group}" -->
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${c.name}</title>
<link rel="stylesheet" href="${stylesHref}">
<style>
  body { margin: 0; background: #FBF9F6; font-family: Inter_400Regular, system-ui, sans-serif; }
  #ds-grid { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 28px; padding: 28px; }
  .ds-cell { display: flex; flex-direction: column; gap: 10px; }
  .ds-cell h4 { margin: 0; font: 600 11px system-ui; letter-spacing: .04em; text-transform: uppercase; color: #8A8F8A; }
</style>
</head>
<body>
<div id="ds-grid"></div>
<script src="${rel(dir, join(OUT, '_vendor', 'react.js'))}"></script>
<script src="${rel(dir, join(OUT, '_vendor', 'react-dom.js'))}"></script>
<script src="./${c.name}.preview.js"></script>
</body>
</html>
`;
  writeFileSync(join(dir, `${c.name}.html`), html);
  console.log(`  ${c.group}/${c.name}`);
}

console.log('== 7/7 README.md + .ds-build-meta.json ==');
let readmeHeader = '';
const headerPath = join(REPO_ROOT, '.design-sync', 'conventions.md');
if (existsSync(headerPath)) readmeHeader = readFileSync(headerPath, 'utf8') + '\n\n---\n\n';

const readme = `${readmeHeader}# Lima Circle

Component library extracted from the IALIMA mobile app (Expo / React Native,
rendered for the web via react-native-web). ${COMPONENTS.length} components across ${[...new Set(COMPONENTS.map((c) => c.group))].join(', ')}.

## Components

${COMPONENTS.map((c) => `- **${c.name}** (${c.group}) — ${c.summary}`).join('\n')}
`;
writeFileSync(join(OUT, 'README.md'), readme);

writeFileSync(
  join(OUT, '.ds-build-meta.json'),
  JSON.stringify({ componentCount: COMPONENTS.length, shape: 'package', builtBy: 'lima-circle-custom-build', builtAt: new Date().toISOString() }, null, 2),
);

console.log(`\nDone. ${COMPONENTS.length} components built to ${OUT}`);
