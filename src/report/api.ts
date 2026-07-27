// Report API layer — thin fetch helper over class-ia5-report.php's
// POST /report endpoint. Mirrors chat/api.ts: JWT in the X-IA5-Token header,
// urlencoded POST body, parse<T>() + ApiError.
import { API_BASE } from '../config';
import { trackEvent } from '../analytics';

export type ReportContentType = 'chat_message' | 'community' | 'article' | 'listing' | 'user';
export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'other';

type ApiError = Error & { code?: string };

function headers(token: string) {
  return { 'X-IA5-Token': token, 'Content-Type': 'application/x-www-form-urlencoded' };
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

export const reportApi = {
  submit(token: string, contentType: ReportContentType, contentId: number, reason: ReportReason, note?: string) {
    return fetch(`${API_BASE}/report`, {
      method: 'POST',
      headers: headers(token),
      body: form({ content_type: contentType, content_id: contentId, reason, note }),
    })
      .then(parse<{ success: boolean; id: number }>)
      .then((res) => {
        trackEvent('content_reported', { content_type: contentType, reason });
        return res;
      });
  },
};
