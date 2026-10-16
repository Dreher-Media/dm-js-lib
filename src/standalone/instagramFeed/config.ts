import type {
  FeedColumns,
  FeedLabels,
  FeedLayout,
  FeedOptions,
  FeedOverlay,
  FeedPlaceholder,
} from './types';

export const DEFAULT_ENDPOINT = 'https://instagram-connector.services.dreher-media.de';

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 25;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MEDIA_ID = /^\d{5,30}$/;

const LABELS: Record<'de' | 'en', FeedLabels> = {
  de: {
    region: 'Instagram-Beiträge',
    openPost: 'Beitrag auf Instagram ansehen (öffnet in neuem Tab)',
    video: 'Video',
    album: 'Mehrere Bilder',
    follow: 'Auf Instagram folgen',
    prev: 'Zurück',
    next: 'Weiter',
  },
  en: {
    region: 'Instagram posts',
    openPost: 'View post on Instagram (opens in a new tab)',
    video: 'Video',
    album: 'Multiple images',
    follow: 'Follow on Instagram',
    prev: 'Previous',
    next: 'Next',
  },
};

const positiveInt = (raw: string | undefined, fallback: number, max = 50): number => {
  const n = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : fallback;
};

const oneOf = <T extends string>(raw: string | undefined, allowed: readonly T[], fallback: T): T =>
  allowed.includes(raw as T) ? (raw as T) : fallback;

/** `https://host` or `http://localhost`, nothing else: a bare origin, no path. */
export function parseEndpoint(raw: string | undefined): string | undefined {
  if (!raw) return DEFAULT_ENDPOINT;
  try {
    const url = new URL(raw);
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

/** Comma list of Instagram media ids; anything that is not an id is dropped. */
const idList = (raw: string | undefined): string[] =>
  (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => MEDIA_ID.test(s))
    .slice(0, 50);

const languageOf = (el: HTMLElement): 'de' | 'en' => {
  const raw = el.dataset.igLang ?? el.closest('[lang]')?.getAttribute('lang') ?? '';
  return raw.toLowerCase().startsWith('en') ? 'en' : 'de';
};

/** `undefined` when the element cannot be rendered (no valid slug or endpoint). */
export function readOptions(el: HTMLElement): FeedOptions | undefined {
  const d = el.dataset;
  const slug = (d.igSlug ?? '').trim();
  const endpoint = parseEndpoint(d.igEndpoint?.trim());
  if (!SLUG.test(slug) || slug.length > 63 || !endpoint) return undefined;

  const columns: FeedColumns = {
    base: positiveInt(d.igColumnsBase, 3, 12),
    md: positiveInt(d.igColumnsMd, 4, 12),
    lg: positiveInt(d.igColumnsLg, 6, 12),
  };
  const fallback = LABELS[languageOf(el)];
  const label = (key: keyof FeedLabels, attr: string | undefined): string =>
    attr?.trim() || fallback[key];

  return {
    slug,
    endpoint,
    limit: positiveInt(d.igLimit, DEFAULT_LIMIT, MAX_LIMIT),
    hiddenIds: idList(d.igHidden),
    pinnedIds: idList(d.igPinned),
    layout: oneOf<FeedLayout>(d.igLayout, ['grid', 'carousel'], 'grid'),
    columns,
    rows: positiveInt(d.igRows, 1, 10),
    ratio: /^\d+(\.\d+)?\s*\/\s*\d+(\.\d+)?$/.test(d.igRatio ?? '')
      ? (d.igRatio as string)
      : '3 / 4',
    overlay: oneOf<FeedOverlay>(d.igOverlay, ['hover', 'none'], 'hover'),
    placeholder: oneOf<FeedPlaceholder>(d.igPlaceholder, ['tiles', 'hide'], 'tiles'),
    showProfileLink: d.igProfileLink !== 'false',
    profileUrl: d.igProfileUrl?.trim() || undefined,
    labels: {
      region: label('region', d.igLabelRegion),
      openPost: label('openPost', d.igLabelOpenPost),
      video: label('video', d.igLabelVideo),
      album: label('album', d.igLabelAlbum),
      follow: label('follow', d.igLabelFollow),
      prev: label('prev', d.igLabelPrev),
      next: label('next', d.igLabelNext),
    },
  };
}
