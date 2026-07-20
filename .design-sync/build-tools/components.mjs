// Curated component scope for the Lima Circle design-sync run (base SKILL.md
// componentSrcMap equivalent, hand-written since this is an off-script
// pipeline, not the packaged package-build.mjs converter).
export const COMPONENTS = [
  {
    name: 'AlumniCard',
    group: 'Cards',
    srcPath: 'src/AlumniCard.tsx',
    summary: 'Alumni directory card — avatar, name, angkatan badge, job title. Used in the Dashboard "Alumni Populer" carousel and the Alumni directory grid.',
    dts: `export type AlumniSummary = {
  id: number;
  name: string;
  avatar: { thumbnail: string } | null;
  angkatan?: string;
  job_title?: string;
};

export interface AlumniCardProps {
  /** The alumni member to display. */
  member: AlumniSummary;
  /** Called when the card is tapped. */
  onPress: () => void;
  /** Optional style override — the parent controls card width (grid cell vs carousel item). */
  style?: any;
}`,
  },
  {
    name: 'BrandCard',
    group: 'Cards',
    srcPath: 'src/marketplace/BrandCard.tsx',
    summary: 'Marketplace brand card — square logo, name, star rating, type badge, city, product count. Used in the Marketplace grid and the Dashboard "Brand Unggulan" carousel.',
    dts: `export type BrandType = 'product' | 'service' | 'place';

export type BrandSummary = {
  id: number;
  name: string;
  type: BrandType | '';
  category: string;
  city: string;
  logo: { full: string; thumbnail: string } | null;
  has_location: boolean;
  owner_id: number;
  is_featured?: boolean;
  product_count?: number;
  rating_average?: number | null;
  rating_count?: number;
};

export interface BrandCardProps {
  /** The brand to display. */
  brand: BrandSummary;
  /** Called when the card is tapped. */
  onPress: () => void;
  /** Optional style override — the parent controls card width. */
  style?: any;
}`,
  },
  {
    name: 'CommunityCard',
    group: 'Cards',
    srcPath: 'src/community/CommunityCard.tsx',
    summary: 'Community directory card — logo, name, star rating, "Sejak <year>", type badge, status dot + label. Used in the Community list and the Dashboard carousel.',
    dts: `export type CommunitySummary = {
  id: number;
  name: string;
  community_type: string;
  logo: { full: string; thumbnail: string } | null;
  berdiri_sejak: string;
  status_komunitas: string;
  introduction: string;
  member_count: number;
  view_count: number;
  owner_id: number;
  approval_status: 'pending' | 'approved';
  rating_average: number | null;
  rating_count: number;
};

export interface CommunityCardProps {
  /** The community to display. */
  community: CommunitySummary;
  /** Called when the card is tapped. */
  onPress: () => void;
  /** Optional style override — the parent controls card width. */
  style?: any;
}`,
  },
  {
    name: 'EventListCard',
    group: 'Cards',
    srcPath: 'src/events/EventListCard.tsx',
    summary: 'Full-width event row — date column, colored left stripe by event type (Online/Offline/Hybrid), title, badges, time/organizer/follower meta, chevron. Used on the Events tab list and the Dashboard.',
    dts: `export type EventSummary = {
  id: number;
  name: string;
  event_category: string;
  logo: { full: string; thumbnail: string } | null;
  organizer: string;
  organizer_label: string;
  event_angkatan: string;
  jenis_event: 'Online' | 'Offline' | 'Hybrid' | string;
  /** Unix timestamp (seconds, UTC) — displayed in WIB (GMT+7). */
  start_date: number;
  start_date_display: string;
  end_date: number;
  end_date_display: string;
  is_featured: boolean;
  view_count: number;
  owner_id: number;
  approval_status: 'pending' | 'approved';
  follower_count?: number;
};

export interface EventListCardProps {
  /** The event to display. */
  event: EventSummary;
  /** Called when the row is tapped. */
  onPress: () => void;
  /** Optional style override. */
  style?: any;
}`,
  },
  {
    name: 'StarRating',
    group: 'Feedback',
    srcPath: 'src/reviews/StarRating.tsx',
    summary: 'Read-only 5-star rating display with an optional "(N)" review count. Two sizes. Used inline on cards (sm) and detail-screen summary lines (md).',
    dts: `export interface StarRatingProps {
  /** Average rating 0–5. Renders 0 filled stars and no numeric label when null/undefined and count is also unset. */
  value?: number | null;
  /** Review count shown as "(N)" next to the numeric rating. */
  count?: number | null;
  /** @default 'sm' */
  size?: 'sm' | 'md';
}`,
  },
  {
    name: 'NoticeBanner',
    group: 'Feedback',
    srcPath: 'src/NoticeBanner.tsx',
    summary: 'Dismissable success banner shown after a form submit — tap anywhere to dismiss. Self-contained margins; drops in directly under a Header.',
    dts: `export interface NoticeBannerProps {
  /** The message text. */
  message: string;
  /** Called when the banner is tapped (its only dismiss affordance). */
  onDismiss: () => void;
}`,
  },
  {
    name: 'FilterPopover',
    group: 'Overlay',
    srcPath: 'src/FilterPopover.tsx',
    summary: 'Small anchored dropdown-style panel (not a full-width modal) — a backdrop plus a right-aligned floating panel. Shared by the Alumni directory filter and the Artikel category filter.',
    dts: `export interface FilterPopoverProps {
  /** Whether the popover is shown. */
  visible: boolean;
  /** Called when the backdrop is tapped. */
  onClose: () => void;
  /** Distance from the top of the screen, so callers can anchor it just below their own filter icon/row. @default 100 */
  topOffset?: number;
  /** Popover content — typically a list of filter options. */
  children: any;
}`,
  },
  {
    name: 'Header',
    group: 'Navigation',
    srcPath: 'src/Header.tsx',
    summary: 'Shared top bar for every screen after login — brand-green bar with the overlapping logo, page title, optional back chevron, and (when signed in) a burger menu. When `profile` + `onNavigate` are supplied, the burger opens the full navigation drawer (profile card, nav links, app links, log out); otherwise it falls back to a simple "Log out" panel.',
    dts: `export type DrawerProfile = {
  name: string;
  avatar?: { full?: string; thumbnail?: string } | null;
  angkatan?: string;
  city?: string;
  roles?: string[];
};

export type NavTarget =
  | 'dashboard' | 'profile' | 'my-marketplace' | 'my-komunitas' | 'my-event' | 'my-artikel'
  | 'chat' | 'notifications'
  | 'about' | 'review' | 'privacy' | 'terms' | 'delete-account';

export interface HeaderProps {
  /** Page title shown in the bar. */
  title: string;
  /** Shows a back chevron when provided. */
  onBack?: () => void;
  /** Shows the burger menu when provided. */
  onLogout?: () => void;
  /** When set together with onNavigate, the full navigation drawer renders (profile card + nav links). */
  profile?: DrawerProfile;
  onNavigate?: (target: NavTarget) => void;
  /** Shows a red badge on the notification bell when > 0. Only relevant when onNavigate is set. */
  unreadCount?: number;
}`,
  },
];
