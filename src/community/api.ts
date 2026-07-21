// Community API layer — types + thin fetch helpers over the `mobile/v1`
// endpoints in class-ia5-community.php. Mirrors marketplace/api.ts: every call
// carries the JWT in the X-IA5-Token header (see config.ts for the Live Link
// Basic-auth wrapper).
import { API_BASE } from '../config';
import { Block } from '../Blocks';
import { trackEvent } from '../analytics';

export type Img = { full: string; thumbnail: string } | null;

// Membership status of the viewer relative to a community.
export type MyStatus = 'none' | 'pending' | 'approved';

// Whether the community itself has been approved by Pengurus IA Lima yet.
export type ApprovalStatus = 'pending' | 'approved';

export type ContactRow = { channel: string; url: string };
export type ActivityRow = { nama_kegiatan: string; hari: string; jam: string; lokasi: string };
export type GalleryImage = { id: number; full: string; thumbnail: string };

// Directory card shape (GET /communities).
export type CommunitySummary = {
  id: number;
  name: string;
  community_type: string;
  logo: Img;
  berdiri_sejak: string;
  status_komunitas: string;
  introduction: string;
  member_count: number;
  view_count: number;
  owner_id: number;
  approval_status: ApprovalStatus;
  rating_average: number | null;
  rating_count: number;
};

// Full community (GET /community/{id}).
export type CommunityDetail = {
  id: number;
  name: string;
  community_type: string;
  logo: Img;
  cover: Img;
  introduction: string;
  tentang_kami: Block[];
  berdiri_sejak: string;
  status_komunitas: string;
  informasi_kontak: ContactRow[];
  status_keanggotaan: string;
  syarat_bergabung: Block[];
  cara_bergabung: Block[];
  kegiatan_rutin: ActivityRow[];
  image_gallery: GalleryImage[];
  owner_id: number;
  owner_name: string;
  created_at: string;
  view_count: number;
  member_count: number;
  my_status: MyStatus;
  is_manager: boolean;
  approval_status: ApprovalStatus;
  rating_average: number | null;
  rating_count: number;
};

// A person row in GET /community/{id}/members.
export type CommunityMember = {
  id: number;
  name: string;
  avatar: Img;
  angkatan: string;
  job_title: string;
  membership: { role: 'member' | 'manager'; status: 'pending' | 'approved' };
};

export type MemberList = {
  data: CommunityMember[];
  total: number;
  is_manager: boolean;
  member_count: number;
};

export type CommunityType = { slug: string; label: string; parent: number };

export type Paged<T> = {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

export type ApiError = Error & { code?: string; my_status?: MyStatus };

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
    err.my_status = body?.data?.my_status;
    throw err;
  }
  return body as T;
}

// Encode a record as a urlencoded form body (PHP bracket notation for nested
// values, booleans as '1'/'0') so the WP REST endpoint reads real params via
// get_param. Mirrors marketplace/api.ts.
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

export const commApi = {
  list(
    token: string,
    opts: {
      community_type?: string; search?: string; role?: 'manager' | 'member'; status?: 'pending'; page?: number;
      member_id?: number;
    } = {},
  ) {
    const q = new URLSearchParams({ per_page: '20', page: String(opts.page ?? 1) });
    if (opts.community_type) q.append('community_type', opts.community_type);
    if (opts.search) q.append('search', opts.search);
    if (opts.role) q.append('role', opts.role);
    if (opts.status) q.append('status', opts.status);
    if (opts.member_id) q.append('member_id', String(opts.member_id));
    return fetch(`${API_BASE}/communities?${q.toString()}`, { headers: headers(token) }).then(
      parse<Paged<CommunitySummary>>,
    );
  },

  // Public: community_type taxonomy terms, for the create form + browse filter.
  listTypes(token: string) {
    return fetch(`${API_BASE}/community-types`, { headers: headers(token) }).then(
      parse<{ data: CommunityType[] }>,
    );
  },

  detail(token: string, id: number) {
    return fetch(`${API_BASE}/community/${id}`, { headers: headers(token) }).then(parse<CommunityDetail>);
  },

  // Fire-and-forget view increment (also the list's default sort key). Ignore failures.
  trackView(token: string, id: number) {
    fetch(`${API_BASE}/community/${id}/view`, { method: 'POST', headers: headers(token) }).catch(() => {});
  },

  // Pengurus IA Lima: publish a pending community.
  approveCommunity(token: string, id: number) {
    return fetch(`${API_BASE}/community/${id}/approve`, { method: 'POST', headers: headers(token) }).then(
      parse<{ success: boolean; approval_status: ApprovalStatus }>,
    );
  },

  members(token: string, id: number, status?: 'pending' | 'approved' | 'all') {
    const q = status ? `?status=${status}` : '';
    return fetch(`${API_BASE}/community/${id}/members${q}`, { headers: headers(token) }).then(parse<MemberList>);
  },

  join(token: string, id: number) {
    return fetch(`${API_BASE}/community/${id}/join`, { method: 'POST', headers: headers(token) }).then(
      parse<{ success: boolean; my_status: MyStatus }>,
    ).then((res) => { trackEvent('community_joined'); return res; });
  },

  leave(token: string, id: number) {
    return fetch(`${API_BASE}/community/${id}/leave`, { method: 'DELETE', headers: headers(token) }).then(
      parse<{ success: boolean; my_status: MyStatus; member_count: number }>,
    );
  },

  approve(token: string, id: number, userId: number) {
    return fetch(`${API_BASE}/community/${id}/members/${userId}/approve`, {
      method: 'POST',
      headers: headers(token),
    }).then(parse<{ success: boolean; member_count: number }>);
  },

  reject(token: string, id: number, userId: number) {
    return fetch(`${API_BASE}/community/${id}/members/${userId}/reject`, {
      method: 'POST',
      headers: headers(token),
    }).then(parse<{ success: boolean }>);
  },

  // Do NOT set Content-Type — React Native fills the multipart boundary.
  uploadImage(token: string, uri: string) {
    const name = uri.split('/').pop() || 'upload.jpg';
    const ext = (name.split('.').pop() || 'jpg').toLowerCase();
    const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    const fd = new FormData();
    fd.append('image', { uri, name, type } as any);
    return fetch(`${API_BASE}/community/upload-image`, { method: 'POST', headers: headers(token), body: fd }).then(
      parse<UploadedImage>,
    );
  },

  create(token: string, fields: Record<string, unknown>) {
    return fetch(`${API_BASE}/communities`, {
      method: 'POST',
      headers: headers(token, true),
      body: form(fields),
    }).then(parse<CommunityDetail>).then((c) => { trackEvent('community_created'); return c; });
  },

  update(token: string, id: number, fields: Record<string, unknown>) {
    return fetch(`${API_BASE}/community/${id}`, {
      method: 'POST',
      headers: headers(token, true),
      body: form(fields),
    }).then(parse<CommunityDetail>);
  },

  remove(token: string, id: number) {
    return fetch(`${API_BASE}/community/${id}`, { method: 'DELETE', headers: headers(token) }).then(
      parse<{ success: boolean }>,
    );
  },

  // Pengurus IA Lima: appoint a member as Pengurus Komunitas, picking an existing
  // community (community_id) or creating one (name + optional community_type).
  appointKomunitas(
    token: string,
    fields: { target_id: number; community_id?: number; name?: string; community_type?: string },
  ) {
    return fetch(`${API_BASE}/appoint-pengurus-komunitas`, {
      method: 'POST',
      headers: headers(token, true),
      body: form(fields),
    }).then(parse<{ success: boolean; community: { id: number; name: string }; roles: string[] }>);
  },
};

// Contact-channel platforms → an Ionicons name + brand colour, matching the
// slugs the backend whitelists (class-ia5-community.php CONTACT_CHANNELS).
export const CONTACT_CHANNELS: { key: string; label: string; icon: string; color: string }[] = [
  { key: 'email', label: 'Email', icon: 'mail-outline', color: '#6A7A73' },
  { key: 'whatsapp_admin', label: 'Admin WhatsApp', icon: 'logo-whatsapp', color: '#25D366' },
  { key: 'website', label: 'Website', icon: 'globe-outline', color: '#0A7EA4' },
  { key: 'instagram', label: 'Instagram', icon: 'logo-instagram', color: '#E4405F' },
  { key: 'facebook', label: 'Facebook', icon: 'logo-facebook', color: '#1877F2' },
  { key: 'whatsapp_group', label: 'Grup WhatsApp', icon: 'logo-whatsapp', color: '#25D366' },
];

export function contactChannel(key: string) {
  return CONTACT_CHANNELS.find((c) => c.key === (key || '').toLowerCase());
}

// Resolve a contact row to an openable URL: mailto: for email, wa.me for a
// bare WhatsApp number, https:// prefix for bare domains, otherwise as-is.
export function contactOpenUrl(row: ContactRow) {
  const raw = (row.url || '').trim();
  if (row.channel === 'email') return raw.startsWith('mailto:') ? raw : `mailto:${raw}`;
  if (row.channel === 'whatsapp_admin' || row.channel === 'whatsapp_group') {
    const digits = raw.replace(/[^\d]/g, '');
    if (digits && !/^https?:\/\//i.test(raw)) return `https://wa.me/${digits}`;
  }
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

// Day-of-week labels for kegiatan_rutin.hari, mirrors BrandDetailScreen's
// operating-hours DAY_LABELS convention.
export const HARI_LABELS: [string, string][] = [
  ['mon', 'Sen'], ['tue', 'Sel'], ['wed', 'Rab'], ['thu', 'Kam'],
  ['fri', 'Jum'], ['sat', 'Sab'], ['sun', 'Min'],
];
export function hariLabel(key: string) {
  return HARI_LABELS.find(([k]) => k === key)?.[1] || key;
}
