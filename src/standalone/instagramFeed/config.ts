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
export const MAX_LIMIT = 25;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MEDIA_ID = /^\d{8,25}$/;

const LABELS: Record<'de' | 'en', FeedLabels> = {
  de: {
    region: 'Instagram-Beiträge',
    openPost: 'Beitrag auf Instagram ansehen (öffnet in neuem Tab)',
    video: 'Video',
    album: 'Mehrere Bilder',
    follow: 'Auf Instagram folgen',
    prev: 'Vorherige Beiträge',
    next: 'Weitere Beiträge',
    dialog: 'Instagram-Beitrag',
    openPopup: 'Beitrag ansehen',
    close: 'Schließen',
    prevPost: 'Vorheriger Beitrag',
    nextPost: 'Nächster Beitrag',
    moreOnInstagram: 'Weitere Beiträge auf Instagram ansehen',
    endCount: 'Noch {n} weitere Beiträge auf Instagram',
    endCountOne: 'Noch ein weiterer Beitrag auf Instagram',
    endMore: 'Es gibt weitere Beiträge auf Instagram',
    endAll: 'Das waren alle Beiträge',
    endLinkAll: 'Alle Beiträge auf Instagram ansehen',
    endProfile: 'Zum Profil auf Instagram',
    followShort: 'Folgen',
    followProfile: 'Auf Instagram folgen (öffnet in neuem Tab)',
    prevSlide: 'Vorheriges Bild',
    nextSlide: 'Nächstes Bild',
    slide: 'Bild {n} von {total}',
    likes: 'Likes: {n}',
    comments: 'Kommentare: {n}',
    openOnInstagram: 'Auf Instagram ansehen',
    commentsAll: 'Alle {n} Kommentare ansehen',
    commentsOne: 'Kommentar ansehen',
    share: 'Link zum Beitrag kopieren oder teilen',
    copied: 'Link kopiert',
    more: 'mehr',
    less: 'weniger',
    play: 'Video abspielen',
    pause: 'Video pausieren',
    seek: 'Position im Video',
    seekText: '{current} von {total}',
    mute: 'Ton ausschalten',
    unmute: 'Ton einschalten',
    videoFailed: 'Das Video lässt sich hier nicht abspielen – auf Instagram ansehen',
  },
  en: {
    region: 'Instagram posts',
    openPost: 'View post on Instagram (opens in a new tab)',
    video: 'Video',
    album: 'Image gallery',
    follow: 'Follow on Instagram',
    prev: 'Previous posts',
    next: 'More posts',
    dialog: 'Instagram post',
    openPopup: 'View post',
    close: 'Close',
    prevPost: 'Previous post',
    nextPost: 'Next post',
    moreOnInstagram: 'View more posts on Instagram',
    endCount: '{n} more posts on Instagram',
    endCountOne: '1 more post on Instagram',
    endMore: 'There are more posts on Instagram',
    endAll: 'That was every post',
    endLinkAll: 'View all posts on Instagram',
    endProfile: 'View the profile on Instagram',
    followShort: 'Follow',
    followProfile: 'Follow on Instagram (opens in a new tab)',
    prevSlide: 'Previous image',
    nextSlide: 'Next image',
    slide: 'Image {n} of {total}',
    likes: 'Likes: {n}',
    comments: 'Comments: {n}',
    openOnInstagram: 'View on Instagram',
    commentsAll: 'View all {n} comments',
    commentsOne: 'View comment',
    share: 'Copy or share link to the post',
    copied: 'Link copied',
    more: 'more',
    less: 'less',
    play: 'Play video',
    pause: 'Pause video',
    seek: 'Position in the video',
    seekText: '{current} of {total}',
    mute: 'Mute',
    unmute: 'Unmute',
    videoFailed: 'This video cannot be played here – watch it on Instagram',
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

/** The reader's locale tag (`de`, `en-GB`): the attribute, else the nearest `lang`, else German. */
const localeOf = (el: HTMLElement): string =>
  (
    el.dataset.igLocale ??
    el.dataset.igLang ??
    el.closest('[lang]')?.getAttribute('lang') ??
    ''
  ).trim() || 'de';

const languageOf = (el: HTMLElement): 'de' | 'en' =>
  localeOf(el).toLowerCase().startsWith('en') ? 'en' : 'de';

const flag = (raw: string | undefined, fallback: boolean): boolean =>
  raw === undefined ? fallback : raw !== 'false';

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
  const kebab = (key: string): string => key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
  const labels = { ...fallback };
  for (const key of Object.keys(fallback) as (keyof FeedLabels)[]) {
    const own = el.getAttribute(`data-ig-label-${kebab(key)}`)?.trim();
    if (own) labels[key] = own;
  }

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
    protectMedia: flag(d.igProtectMedia, true),
    hoverPreview: flag(d.igHoverPreview, true),
    popup: flag(d.igPopup, true),
    popupLimit: positiveInt(d.igPopupLimit, MAX_LIMIT, MAX_LIMIT),
    locale: localeOf(el),
    timeZone: d.igTimeZone?.trim() || 'Europe/Berlin',
    labels,
  };
}
