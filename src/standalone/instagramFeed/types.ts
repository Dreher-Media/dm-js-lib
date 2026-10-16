export type FeedLayout = 'grid' | 'carousel';
export type FeedOverlay = 'hover' | 'none';
export type FeedPlaceholder = 'tiles' | 'hide';
export type MediaType = 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
export type FeedStatus = 'ok' | 'stale' | 'unconfigured' | 'unavailable';

/** Tiles per row: `base` below 768 px, `md` from 768 px, `lg` from 1024 px. */
export interface FeedColumns {
  base: number;
  md: number;
  lg: number;
}

/** One post as the connector's delivery endpoint sends it, after validation. */
export interface FeedPost {
  id: string;
  type: MediaType;
  permalink: string;
  caption: string;
  alt: string;
  imageUrl: string;
}

export interface FeedAccount {
  profileUrl: string;
}

export interface Feed {
  status: FeedStatus;
  posts: FeedPost[];
  account?: FeedAccount;
}

export interface FeedLabels {
  region: string;
  openPost: string;
  video: string;
  album: string;
  follow: string;
  prev: string;
  next: string;
}

export interface FeedOptions {
  /** Squidex app name of the project; the connector's key for the account. */
  slug: string;
  /** Origin of the connector, no trailing slash. */
  endpoint: string;
  limit: number;
  hiddenIds: string[];
  pinnedIds: string[];
  layout: FeedLayout;
  columns: FeedColumns;
  rows: number;
  ratio: string;
  overlay: FeedOverlay;
  placeholder: FeedPlaceholder;
  showProfileLink: boolean;
  profileUrl: string | undefined;
  labels: FeedLabels;
}
