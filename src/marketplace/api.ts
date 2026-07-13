// Marketplace API layer — types + thin fetch helpers over the `mobile/v1`
// endpoints in class-ia5-marketplace.php. Every call carries the JWT in the
// X-IA5-Token header (see config.ts for the Live Link Basic-auth wrapper).
import { API_BASE } from '../config';

export type BrandType = 'product' | 'service' | 'place';

export type Img = { full: string; thumbnail: string } | null;

// A single priced line item (product / service / menu row / room / treatment).
export type Item = {
  id: number;
  name: string;
  description: string;
  price: number | null;
  price_display: string; // "Rp 8.000" or "" when price is null
  price_note: string; // e.g. "/porsi"
  image: Img;
  is_available: boolean;
  sort: number;
};

// Per-day operating hours: each day maps to zero or more open/close ranges.
// An empty array means closed that day.
export type Hours = Record<
  'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun',
  { open: string; close: string }[]
>;

export type GalleryImage = { id: number; full: string; thumbnail: string };

// A social / ordering link row (Instagram, GoFood, website, email, …).
export type BrandLink = { link: string; link_address: string };

export type Place = {
  lat: number;
  lng: number;
  address: string;
  operating_hours: Hours;
  offerings: string[];
  gallery?: GalleryImage[]; // absent on older backends until place_gallery ships
};

// Directory card shape (GET /marketplace).
export type BrandSummary = {
  id: number;
  name: string;
  type: BrandType | '';
  category: string;
  city: string;
  logo: Img;
  has_location: boolean;
  owner_id: number;
  is_featured?: boolean;
};

// Full brand (GET /marketplace/{id}).
export type BrandDetail = {
  id: number;
  type: BrandType | '';
  name: string;
  description: string;
  category: string;
  city: string;
  whatsapp_number: string;
  logo: Img;
  cover: Img;
  owner_id: number;
  owner_name: string;
  created_at: string;
  view_count: number;
  links?: BrandLink[];
  items: Item[];
  place?: Place;
};

export type Paged<T> = {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

// Quota error body returned as 403 { code:'quota_exceeded', message, data:{ tier, limit } }.
export type ApiError = Error & { code?: string; tier?: string; limit?: number };

// Response of POST /marketplace/upload-image — an attachment id the create/update
// calls then reference via logo_id / cover_id / image_id.
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
    err.tier = body?.data?.tier;
    err.limit = body?.data?.limit;
    throw err;
  }
  return body as T;
}

// Encode a record as a urlencoded form body using PHP bracket notation so the WP
// REST endpoint receives real nested arrays (e.g. operating_hours rows, offerings)
// via get_param — NOT JSON strings, which the backend does not decode. Booleans
// serialize as '1'/'0' because PHP treats the string 'false' as truthy.
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

export const mkApi = {
  list(
    token: string,
    opts: { type?: BrandType; category?: string; owner?: number; search?: string; page?: number; featured?: boolean } = {},
  ) {
    const q = new URLSearchParams({ per_page: '20', page: String(opts.page ?? 1) });
    if (opts.type) q.append('type', opts.type);
    if (opts.category) q.append('category', opts.category);
    if (opts.owner) q.append('owner', String(opts.owner));
    if (opts.search) q.append('search', opts.search);
    if (opts.featured) q.append('featured', '1');
    return fetch(`${API_BASE}/marketplace?${q.toString()}`, { headers: headers(token) }).then(
      parse<Paged<BrandSummary>>,
    );
  },

  detail(token: string, id: number) {
    return fetch(`${API_BASE}/marketplace/${id}`, { headers: headers(token) }).then(parse<BrandDetail>);
  },

  // Fire-and-forget view increment (profile-view pattern). Ignore failures.
  trackView(token: string, id: number) {
    fetch(`${API_BASE}/marketplace/${id}/view`, { method: 'POST', headers: headers(token) }).catch(
      () => {},
    );
  },

  // Upload a logo / cover / item photo (multipart). Returns the attachment id to
  // pass back as logo_id / cover_id / image_id. Do NOT set Content-Type — React
  // Native fills in the multipart boundary itself.
  uploadImage(token: string, uri: string) {
    const name = uri.split('/').pop() || 'upload.jpg';
    const ext = (name.split('.').pop() || 'jpg').toLowerCase();
    const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    const fd = new FormData();
    fd.append('image', { uri, name, type } as any);
    return fetch(`${API_BASE}/marketplace/upload-image`, {
      method: 'POST',
      headers: headers(token),
      body: fd,
    }).then(parse<UploadedImage>);
  },

  create(token: string, fields: Record<string, unknown>) {
    return fetch(`${API_BASE}/marketplace`, {
      method: 'POST',
      headers: headers(token, true),
      body: form(fields),
    }).then(parse<BrandDetail>);
  },

  update(token: string, id: number, fields: Record<string, unknown>) {
    return fetch(`${API_BASE}/marketplace/${id}`, {
      method: 'POST',
      headers: headers(token, true),
      body: form(fields),
    }).then(parse<BrandDetail>);
  },

  remove(token: string, id: number) {
    return fetch(`${API_BASE}/marketplace/${id}`, { method: 'DELETE', headers: headers(token) }).then(
      parse<{ success: boolean }>,
    );
  },

  createItem(token: string, brandId: number, fields: Record<string, unknown>) {
    return fetch(`${API_BASE}/marketplace/${brandId}/items`, {
      method: 'POST',
      headers: headers(token, true),
      body: form(fields),
    }).then(parse<Item>);
  },

  updateItem(token: string, brandId: number, itemId: number, fields: Record<string, unknown>) {
    return fetch(`${API_BASE}/marketplace/${brandId}/item/${itemId}`, {
      method: 'POST',
      headers: headers(token, true),
      body: form(fields),
    }).then(parse<Item>);
  },

  removeItem(token: string, brandId: number, itemId: number) {
    return fetch(`${API_BASE}/marketplace/${brandId}/item/${itemId}`, {
      method: 'DELETE',
      headers: headers(token),
    }).then(parse<{ success: boolean }>);
  },
};

// ---- CTA link builders (client-side, no server endpoint) ----

// wa.me deep link with a type-appropriate prefilled message.
export function whatsappUrl(brand: BrandDetail, itemName?: string) {
  const num = brand.whatsapp_number.replace(/[^\d]/g, '');
  let text: string;
  if (brand.type === 'product') {
    text = itemName
      ? `Halo, saya tertarik membeli *${itemName}* dari ${brand.name}.`
      : `Halo, saya tertarik dengan ${brand.name}.`;
  } else {
    // service & place → contact/enquiry wording
    text = itemName
      ? `Halo, saya ingin menanyakan *${itemName}* dari ${brand.name}.`
      : `Halo, saya ingin menanyakan ${brand.name}.`;
  }
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

// Google Maps directions for a place brand.
export function directionsUrl(place: Place) {
  return `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;
}

export const TYPE_LABELS: Record<BrandType, string> = {
  product: 'Produk',
  service: 'Jasa',
  place: 'Tempat',
};

// Brand-link platforms → an Ionicons name + brand colour, or a bundled PNG logo
// (`image`) for the Indonesian delivery/marketplace platforms Ionicons lacks.
// When `image` is set the UI renders that logo; otherwise the Ionicons glyph.
// Keys must match the JetEngine select values.
export const LINK_PLATFORMS: { key: string; label: string; icon: string; color: string; image?: any }[] = [
  { key: 'instagram', label: 'Instagram', icon: 'logo-instagram', color: '#E4405F' },
  { key: 'facebook', label: 'Facebook', icon: 'logo-facebook', color: '#1877F2' },
  { key: 'tiktok', label: 'TikTok', icon: 'logo-tiktok', color: '#111111' },
  { key: 'youtube', label: 'YouTube', icon: 'logo-youtube', color: '#FF0000' },
  { key: 'gofood', label: 'GoFood', icon: 'fast-food', color: '#E23744', image: require('../../assets/marketplace-links/gofood.png') },
  { key: 'grabfood', label: 'GrabFood', icon: 'fast-food', color: '#00B14F', image: require('../../assets/marketplace-links/grabfood.png') },
  { key: 'shopee', label: 'Shopee', icon: 'bag-handle', color: '#EE4D2D', image: require('../../assets/marketplace-links/shopee.png') },
  { key: 'tokopedia', label: 'Tokopedia', icon: 'storefront', color: '#42B549', image: require('../../assets/marketplace-links/tokopedia.png') },
  { key: 'website', label: 'Website', icon: 'globe-outline', color: '#0A7EA4' },
  { key: 'email', label: 'Email', icon: 'mail-outline', color: '#6A7A73' },
];

export function linkPlatform(key: string) {
  return LINK_PLATFORMS.find((p) => p.key === (key || '').toLowerCase());
}

// Resolve a link row to an openable URL: mailto: for email, https:// prefix for
// bare domains, otherwise the address as-is.
export function linkOpenUrl(l: BrandLink) {
  const a = (l.link_address || '').trim();
  if (l.link === 'email') return a.startsWith('mailto:') ? a : `mailto:${a}`;
  return /^https?:\/\//i.test(a) ? a : `https://${a}`;
}
