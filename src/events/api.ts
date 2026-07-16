// Events API layer — types + thin fetch helpers over the `mobile/v1` endpoints
// in class-ia5-events.php. Mirrors community/api.ts: every call carries the JWT
// in the X-IA5-Token header. Own copies of headers/parse/form per the codebase's
// per-feature-duplication convention (they are not shared across modules).
import { API_BASE } from '../config';
import { Block } from '../Blocks';

export type Img = { full: string; thumbnail: string } | null;

// Whether the event itself has been approved by Pengurus IA Lima yet.
export type ApprovalStatus = 'pending' | 'approved';

export type GalleryImage = { id: number; full: string; thumbnail: string };
export type EventCategory = { slug: string; label: string; parent: number };

// Directory card shape (GET /events).
export type EventSummary = {
  id: number;
  name: string;
  event_category: string;
  logo: Img;
  organizer: string;        // 'IA Lima' | 'Angkatan' | 'Komunitas'
  organizer_label: string;  // resolved display text ("Angkatan 1996", community title, …)
  event_angkatan: string;
  jenis_event: string;      // 'Online' | 'Offline' | 'Hybrid'
  start_date: number;       // Unix timestamp
  start_date_display: string;
  end_date: number;
  end_date_display: string;
  is_featured: boolean;
  view_count: number;
  owner_id: number;
  approval_status: ApprovalStatus;
  follower_count?: number;
};

// Full event (GET /event/{id}).
export type EventDetail = EventSummary & {
  cover: Img;
  introduction: string;
  tentang_event: Block[];
  online_platform: string;
  meeting_url: string;
  meeting_id: string;
  password: string;
  nama_lokasi: string;
  alamat: string;
  google_maps_url: string;
  latitude: string;
  longitude: string;
  link_registrasi: string;
  banner_informasi: GalleryImage[];
  owner_name: string;
  created_at: string;
  is_owner: boolean;
  is_following: boolean;
  follower_count: number;
};

// A person row in GET /event/{id}/followers ("Pengikut Event").
export type EventFollower = {
  id: number;
  name: string;
  avatar: Img;
  angkatan: string;
  job_title: string;
};

export type Paged<T> = {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

export type ApiError = Error & { code?: string };
export type UploadedImage = { id: number; full: string; thumbnail: string };

function headers(token: string, json = false) {
  const h: Record<string, string> = { 'X-IA5-Token': token };
  if (json) h['Content-Type'] = 'application/x-www-form-urlencoded';
  return h;
}

async function parse<T>(res: Response): Promise<T> {
  const body = await res.json();
  if (!res.ok) {
    const err: ApiError = new Error(body?.message || 'Request failed');
    err.code = body?.code;
    throw err;
  }
  return body as T;
}

// Encode a record as a urlencoded form body (PHP bracket notation for nested
// values, booleans as '1'/'0'). Mirrors community/api.ts.
function form(fields: Record<string, unknown>) {
  const p = new URLSearchParams();
  const add = (key: string, val: unknown) => {
    if (val === undefined || val === null) return;
    if (Array.isArray(val)) {
      val.forEach((v, i) => add(`${key}[${i}]`, v));
    } else if (typeof val === 'object') {
      for (const [k, v] of Object.entries(val)) add(`${key}[${k}]`, v);
    } else if (typeof val === 'boolean') {
      p.append(key, val ? '1' : '0');
    } else {
      p.append(key, String(val));
    }
  };
  for (const [k, v] of Object.entries(fields)) add(k, v);
  return p.toString();
}

export const evApi = {
  list(
    token: string,
    opts: {
      event_category?: string;
      search?: string;
      when?: 'upcoming' | 'past';
      role?: 'mine-as-member' | 'mine-as-organizer';
      status?: 'pending';
      page?: number;
      per_page?: number;
    } = {},
  ) {
    const q = new URLSearchParams({
      per_page: String(opts.per_page ?? 20),
      page: String(opts.page ?? 1),
    });
    if (opts.event_category) q.append('event_category', opts.event_category);
    if (opts.search) q.append('search', opts.search);
    if (opts.when) q.append('when', opts.when);
    if (opts.role) q.append('role', opts.role);
    if (opts.status) q.append('status', opts.status);
    return fetch(`${API_BASE}/events?${q.toString()}`, { headers: headers(token) }).then(
      parse<Paged<EventSummary>>,
    );
  },

  listCategories(token: string) {
    return fetch(`${API_BASE}/event-categories`, { headers: headers(token) }).then(
      parse<{ data: EventCategory[] }>,
    );
  },

  detail(token: string, id: number) {
    return fetch(`${API_BASE}/event/${id}`, { headers: headers(token) }).then(parse<EventDetail>);
  },

  // Fire-and-forget view increment. Ignore failures.
  trackView(token: string, id: number) {
    fetch(`${API_BASE}/event/${id}/view`, { method: 'POST', headers: headers(token) }).catch(() => {});
  },

  // Pengurus IA Lima: publish a pending event.
  approveEvent(token: string, id: number) {
    return fetch(`${API_BASE}/event/${id}/approve`, { method: 'POST', headers: headers(token) }).then(
      parse<{ success: boolean; approval_status: ApprovalStatus }>,
    );
  },

  // Do NOT set Content-Type — React Native fills the multipart boundary.
  uploadImage(token: string, uri: string) {
    const name = uri.split('/').pop() || 'upload.jpg';
    const ext = (name.split('.').pop() || 'jpg').toLowerCase();
    const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    const fd = new FormData();
    fd.append('image', { uri, name, type } as any);
    return fetch(`${API_BASE}/event/upload-image`, { method: 'POST', headers: headers(token), body: fd }).then(
      parse<UploadedImage>,
    );
  },

  create(token: string, fields: Record<string, unknown>) {
    return fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: headers(token, true),
      body: form(fields),
    }).then(parse<EventDetail>);
  },

  update(token: string, id: number, fields: Record<string, unknown>) {
    return fetch(`${API_BASE}/event/${id}`, {
      method: 'POST',
      headers: headers(token, true),
      body: form(fields),
    }).then(parse<EventDetail>);
  },

  remove(token: string, id: number) {
    return fetch(`${API_BASE}/event/${id}`, { method: 'DELETE', headers: headers(token) }).then(
      parse<{ success: boolean }>,
    );
  },

  // "Ikuti Event" — offered instead of "Daftar Event" when link_registrasi is empty.
  follow(token: string, id: number) {
    return fetch(`${API_BASE}/event/${id}/follow`, { method: 'POST', headers: headers(token) }).then(
      parse<{ success: boolean; is_following: boolean; follower_count: number }>,
    );
  },

  unfollow(token: string, id: number) {
    return fetch(`${API_BASE}/event/${id}/follow`, { method: 'DELETE', headers: headers(token) }).then(
      parse<{ success: boolean; is_following: boolean; follower_count: number }>,
    );
  },

  followers(token: string, id: number) {
    return fetch(`${API_BASE}/event/${id}/followers`, { headers: headers(token) }).then(
      parse<{ data: EventFollower[]; total: number }>,
    );
  },
};

// Google Maps directions deep link (mirrors marketplace/api.ts directionsUrl).
export function directionsUrl(lat: string | number, lng: string | number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

// jenis_event visibility helpers (mirror the server-side conditional rules).
export function showsOnline(jenis: string) {
  return jenis === 'Online' || jenis === 'Hybrid';
}
export function showsOffline(jenis: string) {
  return jenis === 'Offline' || jenis === 'Hybrid';
}

export const JENIS_EVENT = ['Online', 'Offline', 'Hybrid'];
export const ONLINE_PLATFORMS = ['Zoom', 'Google Meet', 'YouTube Live', 'Instagram Live', 'Facebook Live', 'Lainnya'];
