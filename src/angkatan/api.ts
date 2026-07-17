// "Menjadi Pengurus Angkatan" request + approval API layer — thin fetch
// helpers over `mobile/v1/angkatan-requests` (class-ia5-angkatan-requests.php).
// Mirrors community/api.ts: X-IA5-Token header, urlencoded POST bodies.
import { API_BASE } from '../config';

export type Img = { full: string; thumbnail: string } | null;

export type RequestStatus = 'none' | 'pending' | 'approved' | 'rejected';

export type MyRequestStatus = {
  status: RequestStatus;
  reason?: string;
  reject_reason?: string | null;
};

export type PendingRequest = {
  id: number;
  user_id: number;
  user_name: string;
  user_avatar: Img;
  angkatan: string;
  reason: string;
  created_at: string;
};

export type Paged<T> = {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
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

export const angkatanApi = {
  myStatus(token: string) {
    return fetch(`${API_BASE}/angkatan-requests/mine`, { headers: headers(token) }).then(
      parse<MyRequestStatus>,
    );
  },

  submit(token: string, reason: string) {
    return fetch(`${API_BASE}/angkatan-requests`, {
      method: 'POST',
      headers: headers(token, true),
      body: form({ reason }),
    }).then(parse<{ success: boolean; status: RequestStatus }>);
  },

  list(token: string, page = 1) {
    return fetch(`${API_BASE}/angkatan-requests?page=${page}`, { headers: headers(token) }).then(
      parse<Paged<PendingRequest>>,
    );
  },

  approve(token: string, id: number) {
    return fetch(`${API_BASE}/angkatan-requests/${id}/approve`, {
      method: 'POST',
      headers: headers(token),
    }).then(parse<{ success: boolean; status: RequestStatus }>);
  },

  reject(token: string, id: number, reason: string) {
    return fetch(`${API_BASE}/angkatan-requests/${id}/reject`, {
      method: 'POST',
      headers: headers(token, true),
      body: form({ reason }),
    }).then(parse<{ success: boolean; status: RequestStatus }>);
  },
};
