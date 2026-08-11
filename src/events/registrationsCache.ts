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

export async function getMyRegistrations(
  token: string,
  opts?: { force?: boolean },
): Promise<MyRegistration[]> {
  if (cache && !opts?.force) return cache;
  if (inFlight && !opts?.force) return inFlight;
  inFlight = evApi
    .myRegistrations(token)
    .then((res) => {
      cache = res.data;
      inFlight = null;
      return cache;
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
