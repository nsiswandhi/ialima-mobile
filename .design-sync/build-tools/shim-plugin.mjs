// esbuild plugin: makes 'react' / 'react-dom' / 'react-dom/client' resolve to
// the single shared window.React / window.ReactDOM instance shipped in
// _vendor/, so hooks work correctly across the bundle + preview harness
// (two separate bundled copies of react would break the hooks dispatcher).
// Also aliases 'react-native' -> 'react-native-web' since this is a React
// Native/Expo app being rendered in a browser, which the design-sync
// converter's plain esbuild pipeline has no built-in support for.
import { createRequire } from 'node:module';

const SHIMS = {
  react: 'module.exports = window.React;',
  'react-dom': 'module.exports = window.ReactDOM;',
  'react-dom/client': 'module.exports = window.ReactDOM;',
};

export function reactGlobalShimPlugin() {
  return {
    name: 'react-global-shim',
    setup(build) {
      build.onResolve({ filter: /^(react|react-dom|react-dom\/client)$/ }, (args) => {
        if (SHIMS[args.path]) return { path: args.path, namespace: 'react-shim' };
      });
      build.onLoad({ filter: /.*/, namespace: 'react-shim' }, (args) => ({
        contents: SHIMS[args.path],
        loader: 'js',
      }));
    },
  };
}

// For building _vendor/react-dom.js itself: shims 'react' -> window.React
// (react-dom needs the SAME react instance for its hooks dispatcher) but
// leaves 'react-dom'/'react-dom/client' unshimmed, since this build IS what
// produces window.ReactDOM -- shimming it here would be circular.
export function reactOnlyShimPlugin() {
  return {
    name: 'react-only-shim',
    setup(build) {
      build.onResolve({ filter: /^react$/ }, (args) => ({ path: args.path, namespace: 'react-shim' }));
      build.onLoad({ filter: /.*/, namespace: 'react-shim' }, () => ({
        contents: SHIMS.react,
        loader: 'js',
      }));
    },
  };
}

export function reactNativeWebAliasPlugin(repoRoot) {
  const require = createRequire(repoRoot + '/package.json');
  return {
    name: 'react-native-web-alias',
    setup(build) {
      build.onResolve({ filter: /^react-native$/ }, () => ({
        path: require.resolve('react-native-web'),
      }));
    },
  };
}

// expo-font is a native/universal module; our icons ship their glyph font via
// a plain @font-face in styles.css, so the actual font-loading APIs are never
// called at runtime here — a no-op shim avoids pulling in expo-font's native
// module resolution (which fails under plain esbuild browser bundling).
export function expoFontShimPlugin() {
  return {
    name: 'expo-font-shim',
    setup(build) {
      build.onResolve({ filter: /^expo-font$/ }, (args) => ({ path: args.path, namespace: 'expo-font-shim' }));
      build.onLoad({ filter: /.*/, namespace: 'expo-font-shim' }, () => ({
        contents: `
          export async function loadAsync() { return true; }
          export function isLoaded() { return true; }
          export function isLoading() { return false; }
          export async function renderToImageAsync() { return undefined; }
          export const FontDisplay = { AUTO: 'auto', SWAP: 'swap', BLOCK: 'block' };
        `,
        loader: 'js',
      }));
    },
  };
}
