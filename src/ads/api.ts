// Ads API layer — thin fetch helpers over class-ia5-ads.php's GET /ads and
// impression/click endpoints. Public endpoints, no auth header needed
// (matches /splash-images and /article/{id}/view).
import { API_BASE } from '../config';

export type AdPlacement =
  | 'hero' | 'home_banner' | 'komunitas_header' | 'marketplace_header' | 'event_header' | 'artikel_header';

export type Ad = {
  id: number;
  title: string;
  advertiser: string;
  image: string | null;
  target_url: string;
  priority: number;
};

export type AdTapTarget =
  | { kind: 'external'; url: string }
  | { kind: 'internal'; type: string; id: number }
  | null;

/**
 * `target_url` is either a real URL (opened via Linking.openURL) or the
 * internal convention `app://<type>/<id>` (routed through the app's own
 * navigation instead — the app has no registered URL scheme, so a fake
 * `app://` link would otherwise fail to open at the OS level).
 */
export function resolveAdTap(targetUrl: string): AdTapTarget {
  if (!targetUrl) return null;
  const m = targetUrl.match(/^app:\/\/([a-z_]+)\/(\d+)$/);
  if (m) {
    return { kind: 'internal', type: m[1], id: Number(m[2]) };
  }
  return { kind: 'external', url: targetUrl };
}

export const adsApi = {
  list(placement: AdPlacement) {
    return fetch(`${API_BASE}/ads?placement=${placement}`)
      .then((res) => res.json())
      .then((body) => body as { data: Ad[]; total: number });
  },

  impression(id: number) {
    fetch(`${API_BASE}/ads/${id}/impression`, { method: 'POST' }).catch(() => {});
  },

  click(id: number) {
    fetch(`${API_BASE}/ads/${id}/click`, { method: 'POST' }).catch(() => {});
  },
};
