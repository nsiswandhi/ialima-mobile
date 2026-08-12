// Module-level singleton cache for the alumni's event registrations, shared
// between EventDetailScreen (to check "am I already registered for this
// event" without re-hitting the register endpoint) and MyEventScreen's
// "Terdaftar" section (the same list). A simple singleton rather than React
// Context, per this codebase's per-feature-duplication/no-shared-client
// convention — both screens live in the same JS module graph so a plain
// module-level variable is sufficient.
import { evApi, MyRegistration } from './api';

let cache: MyRegistration[] | null = null;
let inFlight: Promise<MyRegistration[]> | null = null;
// Bumped on every fetch start so a resolving fetch can tell whether it's
// still the most recently started one. Without this, a `force: true` fetch
// (e.g. pull-to-refresh) racing an in-flight unforced fetch (e.g. another
// screen's mount) could have the unforced one resolve LAST and silently
// overwrite `cache` with stale data, even though the forced fetch started
// more recently and should win.
let generation = 0;

// Called on logout so a subsequent login (same app process, no reload) never
// serves a different alumni's cached registrations or their downloaded QR
// check-in images — this cache is per-session, not per-device.
export function resetMyRegistrations() {
  cache = null;
  inFlight = null;
  generation++;
}

export async function getMyRegistrations(
  token: string,
  opts?: { force?: boolean },
): Promise<MyRegistration[]> {
  if (cache && !opts?.force) return cache;
  if (inFlight && !opts?.force) return inFlight;
  const myGeneration = ++generation;
  inFlight = evApi
    .myRegistrations(token)
    .then((res) => {
      // Only the most recently started fetch is allowed to update the
      // shared cache; an older fetch that resolves late still returns its
      // own data to whoever awaited it, it just doesn't clobber `cache`.
      if (myGeneration === generation) {
        cache = res.data;
      }
      inFlight = null;
      return res.data;
    })
    .catch((err) => {
      inFlight = null;
      throw err;
    });
  return inFlight;
}

// Called right after a successful new registration so the cache (and thus
// both screens) reflect it instantly, without a re-fetch.
export function addMyRegistration(reg: MyRegistration) {
  if (cache) {
    cache = [reg, ...cache.filter((r) => r.id !== reg.id)];
  }
}
