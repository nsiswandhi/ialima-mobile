// Where the app talks to WordPress. Pick the environment with ENV below.
//
//   production : the live site, https://ialima.id (real data over real HTTPS).
//   local      : LocalWP on this PC — reachable only from the PC browser preview
//                (localhost:8081), NOT from a physical phone.
//   livelink   : LocalWP exposed through a password-protected Live Link tunnel so
//                a physical phone can reach it. The tunnel URL + credentials below
//                change every time you toggle Live Link.
type Env = 'production' | 'local' | 'livelink';
const ENV: Env = 'production';

const HOSTS: Record<Env, string> = {
  production: 'https://ialima.id',
  local: 'http://ialima.local',
  livelink: 'https://ambiguous-coal.localsite.io', // paste your current Live Link URL
};

const HOST = HOSTS[ENV];
export const API_BASE = `${HOST}/wp-json/mobile/v1`;

// --- Live Link tunnel auth (only used when ENV === 'livelink') --------------
// The Live Link tunnel password-protects every request with HTTP Basic auth.
// These are throwaway dev credentials shown in the Local app; they change each
// time you toggle Live Link. Rather than touch every call site, we wrap fetch
// once: any request to the API host gets the Basic header injected. Our JWT rides
// in a separate `X-IA5-Token` header (see ProfileScreen) so it never collides
// with this Authorization header. Local (file://) URIs are left alone.
if (ENV === 'livelink') {
  const LIVE_LINK_USER = 'porter';
  const LIVE_LINK_PASS = 'inconclusive';

  // Self-contained base64 (ASCII) — `btoa` isn't reliably present on Hermes, and
  // a wrong/empty header makes the tunnel return its 401 HTML page, which then
  // surfaces as a "JSON Parse error" in the app. This always works.
  const encode = (s: string) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let out = '';
    for (let i = 0; i < s.length; i += 3) {
      const a = s.charCodeAt(i);
      const b = s.charCodeAt(i + 1);
      const c = s.charCodeAt(i + 2);
      const e1 = a >> 2;
      const e2 = ((a & 3) << 4) | (isNaN(b) ? 0 : b >> 4);
      const e3 = isNaN(b) ? 64 : ((b & 15) << 2) | (isNaN(c) ? 0 : c >> 6);
      const e4 = isNaN(c) ? 64 : c & 63;
      out += chars[e1] + chars[e2] + (e3 === 64 ? '=' : chars[e3]) + (e4 === 64 ? '=' : chars[e4]);
    }
    return out;
  };
  const basic = 'Basic ' + encode(`${LIVE_LINK_USER}:${LIVE_LINK_PASS}`);
  const orig = global.fetch;
  global.fetch = ((input: any, init: any = {}) => {
    const url = typeof input === 'string' ? input : input?.url ?? '';
    if (url.startsWith(HOST)) {
      init = {
        ...init,
        headers: {
          ...(init.headers || {}),
          Authorization: basic,
          // Skip ngrok's one-time HTML "browser warning" page that Live Link
          // otherwise serves on the first request (which breaks JSON.parse).
          'ngrok-skip-browser-warning': 'true',
        },
      };
    }
    return orig(input, init);
  }) as typeof fetch;
}
