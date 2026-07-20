// Builds _vendor/react.js (window.React) and _vendor/react-dom.js
// (window.ReactDOM, from react-dom/client so createRoot is available --
// React 19 dropped the legacy ReactDOM.render UMD global). react-dom is built
// with 'react' aliased to window.React (via shim-plugin) so both share one
// react instance -- required for hooks to work.
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { reactOnlyShimPlugin } from './shim-plugin.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const OUT = join(REPO_ROOT, 'ds-bundle', '_vendor');

mkdirSync(OUT, { recursive: true });

await build({
  absWorkingDir: REPO_ROOT,
  entryPoints: [{ in: 'react', out: 'react' }],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  globalName: 'React',
  outfile: join(OUT, 'react.js'),
  minify: true,
  logLevel: 'warning',
});

await build({
  absWorkingDir: REPO_ROOT,
  stdin: {
    // Plain CJS (no import/export keywords) so esbuild's IIFE globalName
    // wrapping exposes module.exports directly as window.ReactDOM, instead
    // of nesting it under a synthetic `.default` (which `export default`/
    // `export *` from a CJS module both do). Merges 'react-dom' (createPortal,
    // flushSync -- react-native-web's Modal uses createPortal) with
    // 'react-dom/client' (createRoot, which moved there in React 18+).
    contents: `module.exports = Object.assign({}, require('react-dom'), require('react-dom/client'));`,
    resolveDir: REPO_ROOT,
    loader: 'js',
  },
  bundle: true,
  format: 'iife',
  platform: 'browser',
  globalName: 'ReactDOM',
  outfile: join(OUT, 'react-dom.js'),
  minify: true,
  logLevel: 'warning',
  plugins: [reactOnlyShimPlugin()],
});

console.log('_vendor/react.js + react-dom.js built.');
