// Community API layer — types + thin fetch helpers over the `mobile/v1`
// endpoints in class-ia5-community.php. Mirrors marketplace/api.ts: every call
// carries the JWT in the X-IA5-Token header (see config.ts for the Live Link
// Basic-auth wrapper).
import { API_BASE } from '../config';

export type Img = { full: string; thumbnail: string } | null;

// Membership status of the viewer relative to a community.
export type MyStatus = 'none' | 'pending' | 'approved';

// Directory card shape (GET /communities).
export type CommunitySummary = {
  id: number;
  name: string;
  category: string;
  city: string;
  logo: Img;
  cover: Img;
  member_count: number;
  owner_id: number;
  is_featured?: boolean;
};

// Full community (GET /community/{id}).
export type CommunityDetail = {
  id: number;
  name: string;
  description: string;
  category: string;
  city: string;
  logo: Img;
  cover: Img;
  owner_id: number;
  owner_name: string;
  created_at: string;
  view_count: number;
  member_count: number;
  my_status: MyStatus;
  is_manager: boolean;
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
    opts: { category?: string; search?: string; mine?: boolean; featured?: boolean; page?: number } = {},
  ) {
    const q = new URLSearchParams({ per_page: '20', page: String(opts.page ?? 1) });
    if (opts.category) q.append('category', opts.category);
    if (opts.search) q.append('search', opts.search);
    if (opts.mine) q.append('mine', '1');
    if (opts.featured) q.append('featured', '1');
    return fetch(`${API_BASE}/communities?${q.toString()}`, { headers: headers(token) }).then(
      parse<Paged<CommunitySummary>>,
    );
  },

  detail(token: string, id: number) {
    return fetch(`${API_BASE}/community/${id}`, { headers: headers(token) }).then(parse<CommunityDetail>);
  },

  // Fire-and-forget view increment. Ignore failures.
  trackView(token: string, id: number) {
    fetch(`${API_BASE}/community/${id}/view`, { method: 'POST', headers: headers(token) }).catch(() => {});
  },

  members(token: string, id: number, status?: 'pending' | 'approved' | 'all') {
    const q = status ? `?status=${status}` : '';
    return fetch(`${API_BASE}/community/${id}/members${q}`, { headers: headers(token) }).then(parse<MemberList>);
  },

  join(token: string, id: number) {
    return fetch(`${API_BASE}/community/${id}/join`, { method: 'POST', headers: headers(token) }).then(
      parse<{ success: boolean; my_status: MyStatus }>,
    );
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
    }).then(parse<CommunityDetail>);
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
  // community (community_id) or creating one (name + optional category/description).
  appointKomunitas(
    token: string,
    fields: { target_id: number; community_id?: number; name?: string; category?: string; description?: string },
  ) {
    return fetch(`${API_BASE}/appoint-pengurus-komunitas`, {
      method: 'POST',
      headers: headers(token, true),
      body: form(fields),
    }).then(parse<{ success: boolean; community: { id: number; name: string }; roles: string[] }>);
  },
};
