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

/** One item of an album. */
export interface FeedChild {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  imageUrl: string;
  videoUrl?: string;
}

/**
 * One post as the connector's delivery endpoint sends it, after validation. Every `?` key is
 * absent (not `null`, not `0`) when the connector has nothing, and the popup copes: no likes → no
 * number, an album without `children` → the cover alone, a clip without `videoUrl` → the cover
 * linking to Instagram.
 */
export interface FeedPost {
  id: string;
  type: MediaType;
  permalink: string;
  timestamp: string;
  caption: string;
  alt: string;
  imageUrl: string;
  videoUrl?: string;
  likeCount?: number;
  commentsCount?: number;
  children?: FeedChild[];
}

export interface FeedAccount {
  username: string;
  profileUrl: string;
  avatarUrl?: string;
  mediaCount?: number;
}

export interface Feed {
  status: FeedStatus;
  posts: FeedPost[];
  account?: FeedAccount;
  /** There are posts on Instagram beyond the delivered ones. */
  more?: boolean;
}

/** Interface copy of the grid, the popup and the clip player. */
export interface FeedLabels {
  region: string;
  openPost: string;
  video: string;
  album: string;
  follow: string;
  prev: string;
  next: string;
  dialog: string;
  openPopup: string;
  close: string;
  prevPost: string;
  nextPost: string;
  moreOnInstagram: string;
  endCount: string;
  endCountOne: string;
  endMore: string;
  endAll: string;
  endLinkAll: string;
  endProfile: string;
  followShort: string;
  followProfile: string;
  prevSlide: string;
  nextSlide: string;
  slide: string;
  likes: string;
  comments: string;
  openOnInstagram: string;
  commentsAll: string;
  commentsOne: string;
  share: string;
  copied: string;
  more: string;
  less: string;
  play: string;
  pause: string;
  seek: string;
  seekText: string;
  mute: string;
  unmute: string;
  videoFailed: string;
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
  /** Stop the normal ways of copying the media (right click, drag, long press). A courtesy, not a lock. */
  protectMedia: boolean;
  /** A video tile plays its clip, muted, while the mouse rests on it. */
  hoverPreview: boolean;
  /** A click on a tile opens the post in a popup. */
  popup: boolean;
  /** How many posts the popup's list holds, from the newest. */
  popupLimit: number;
  /** Locale of the popup's date and numbers. */
  locale: string;
  /** Time zone the post's day is read in. */
  timeZone: string;
  labels: FeedLabels;
}
