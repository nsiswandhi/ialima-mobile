// Ratings & reviews API layer — thin fetch helpers over `mobile/v1/ratings`
// (class-ia5-ratings.php). Shared across Marketplace/Community/Artikel detail
// screens and cards. Mirrors community/api.ts: X-IA5-Token header, urlencoded
// POST bodies.
import { API_BASE } from '../config';

export type Img = { full: string; thumbnail: string } | null;

export type ObjectType = 'marketplace' | 'community' | 'artikel';

export type Review = {
  id: number;
  user_id: number;
  user_name: string;
  user_avatar: Img;
  rating: number;
  review: string | null;
  created_at: string;
};

export type RatingsResponse = {
  data: Review[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  average: number | null;
  count: number;
  my_rating: number | null;
  my_review: string | null;
};

export type ApiError = Error & { code?: string };

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
    p.append(k, String(v));
  }
  return p.toString();
}

export const reviewsApi = {
  list(token: string, opts: { objectType: ObjectType; objectId: number; page?: number }) {
    const q = new URLSearchParams({
      object_type: opts.objectType,
      object_id: String(opts.objectId),
      page: String(opts.page ?? 1),
    });
    return fetch(`${API_BASE}/ratings?${q.toString()}`, { headers: headers(token) }).then(
      parse<RatingsResponse>,
    );
  },

  submit(
    token: string,
    opts: { objectType: ObjectType; objectId: number; rating: number; review?: string },
  ) {
    return fetch(`${API_BASE}/ratings`, {
      method: 'POST',
      headers: headers(token, true),
      body: form({
        object_type: opts.objectType,
        object_id: opts.objectId,
        rating: opts.rating,
        review: opts.review ?? '',
      }),
    }).then(parse<{ success: boolean; average: number | null; count: number; my_rating: number; my_review: string }>);
  },
};
