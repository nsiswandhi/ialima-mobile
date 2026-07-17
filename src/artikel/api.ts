// Artikel API layer — mirrors src/events/api.ts. Own headers/parse/form
// copies per the codebase's per-feature-duplication convention.
import { API_BASE } from '../config';
import { Block } from '../Blocks';

export type Img = { full: string; thumbnail: string } | null;
export type ArtikelStatus = 'draft' | 'pending' | 'publish';
export type ArtikelCategory = { slug: string; label: string; id: number; count: number };

export type ArtikelSummary = {
  id: number;
  title: string;
  excerpt: string;
  category: string;
  category_label: string;
  featured_image: Img;
  author_id: number;
  author_name: string;
  published_date: number;
  published_date_display: string;
  view_count: number;
  status: ArtikelStatus;
  owner_id: number;
  rating_average?: number | null;
  rating_count?: number;
};

export type ArtikelAuthor = {
  id: number;
  name: string;
  avatar: Img;
  angkatan: string;
  roles: string[];
  job_title: string;
};

export type ArtikelDetail = ArtikelSummary & {
  content: Block[];
  reject_reason: string;
  is_owner: boolean;
  is_ia_lima_review: boolean;
  author: ArtikelAuthor | null;
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

function form(fields: Record<string, unknown>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) continue;
    p.append(k, typeof v === 'boolean' ? (v ? '1' : '0') : String(v));
  }
  return p.toString();
}

export const artikelApi = {
  list(
    token: string,
    opts: {
      category?: string;
      search?: string;
      sort?: 'popular';
      role?: 'mine';
      status?: 'pending';
      page?: number;
      per_page?: number;
      author_id?: number;
    } = {},
  ) {
    const q = new URLSearchParams({
      per_page: String(opts.per_page ?? 20),
      page: String(opts.page ?? 1),
    });
    if (opts.category) q.append('category', opts.category);
    if (opts.search) q.append('search', opts.search);
    if (opts.sort) q.append('sort', opts.sort);
    if (opts.role) q.append('role', opts.role);
    if (opts.status) q.append('status', opts.status);
    if (opts.author_id) q.append('author_id', String(opts.author_id));
    return fetch(`${API_BASE}/articles?${q.toString()}`, { headers: headers(token) }).then(
      parse<Paged<ArtikelSummary>>,
    );
  },

  listCategories(token: string) {
    return fetch(`${API_BASE}/article-categories`, { headers: headers(token) }).then(
      parse<{ data: ArtikelCategory[] }>,
    );
  },

  detail(token: string, id: number) {
    return fetch(`${API_BASE}/article/${id}`, { headers: headers(token) }).then(parse<ArtikelDetail>);
  },

  trackView(token: string, id: number) {
    fetch(`${API_BASE}/article/${id}/view`, { method: 'POST', headers: headers(token) }).catch(() => {});
  },

  create(token: string, fields: Record<string, unknown>) {
    return fetch(`${API_BASE}/articles`, {
      method: 'POST',
      headers: headers(token, true),
      body: form(fields),
    }).then(parse<ArtikelDetail>);
  },

  update(token: string, id: number, fields: Record<string, unknown>) {
    return fetch(`${API_BASE}/article/${id}`, {
      method: 'POST',
      headers: headers(token, true),
      body: form(fields),
    }).then(parse<ArtikelDetail>);
  },

  remove(token: string, id: number) {
    return fetch(`${API_BASE}/article/${id}`, { method: 'DELETE', headers: headers(token) }).then(
      parse<{ success: boolean }>,
    );
  },

  submit(token: string, id: number) {
    return fetch(`${API_BASE}/article/${id}/submit`, { method: 'POST', headers: headers(token) }).then(
      parse<ArtikelDetail>,
    );
  },

  approve(token: string, id: number) {
    return fetch(`${API_BASE}/article/${id}/approve`, { method: 'POST', headers: headers(token) }).then(
      parse<{ success: boolean; status: ArtikelStatus }>,
    );
  },

  reject(token: string, id: number, reason: string) {
    return fetch(`${API_BASE}/article/${id}/reject`, {
      method: 'POST',
      headers: headers(token, true),
      body: form({ reason }),
    }).then(parse<{ success: boolean; status: ArtikelStatus }>);
  },

  uploadImage(token: string, uri: string) {
    const name = uri.split('/').pop() || 'upload.jpg';
    const ext = (name.split('.').pop() || 'jpg').toLowerCase();
    const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    const fd = new FormData();
    fd.append('image', { uri, name, type } as any);
    return fetch(`${API_BASE}/article/upload-image`, { method: 'POST', headers: headers(token), body: fd }).then(
      parse<UploadedImage>,
    );
  },
};
