import { MAX_LIMIT } from './config';
import type { Feed, FeedChild, FeedPost, FeedStatus, MediaType } from './types';

const TIMEOUT_MS = 8000;
const STATUSES: readonly FeedStatus[] = ['ok', 'stale', 'unconfigured', 'unavailable'];
const MEDIA_TYPES: readonly MediaType[] = ['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM'];
const CAPTION_MAX = 500;
const ALT_MAX = 120;
/** An album holds at most ten items on Instagram; the page never renders more. */
const CHILDREN_MAX = 10;
const MEDIA_ID = /^\d{8,25}$/;

/** One request per URL while it is in flight, so several feeds on a page cost one call. */
const inFlight = new Map<string, Promise<Feed>>();

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

/** A count the page may print: a whole number, zero or more. Anything else is "not given". */
const asCount = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;

/** `https://www.instagram.com/…` (or the bare host): the only place a link may lead. */
function isInstagramUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return (
      url.protocol === 'https:' &&
      (url.hostname === 'www.instagram.com' || url.hostname === 'instagram.com')
    );
  } catch {
    return false;
  }
}

/**
 * A URL out of the connector's feed (a picture, a clip, the avatar), or `undefined`. It must live
 * under THIS project's delivery path on the connector, so a wrong answer can never make the page
 * load media from anywhere else. `prefix` is `<origin>/api/delivery/<slug>/instagram/`.
 */
function connectorMedia(value: unknown, prefix: string): string | undefined {
  const url = asString(value);
  if (!url.startsWith(prefix)) return undefined;
  try {
    new URL(url);
    return url;
  } catch {
    return undefined;
  }
}

/** First meaningful line of a caption, as alt text. Hashtag-only lines are noise. */
function altFromCaption(caption: string): string {
  const line = caption
    .split(/\r?\n/)
    .map((l) =>
      l
        .replace(/(^|\s)#[^\s#]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .find((l) => l.length > 0);
  if (!line) return '';
  return line.length > ALT_MAX ? `${line.slice(0, ALT_MAX - 1).trimEnd()}…` : line;
}

/** One child of an album, or `undefined`. A clip without a usable file stays, as its still. */
function parseChild(raw: unknown, prefix: string): FeedChild | undefined {
  const item = asRecord(raw);
  if (!item) return undefined;
  const id = asString(item.id);
  const type = item.type === 'IMAGE' || item.type === 'VIDEO' ? item.type : undefined;
  const imageUrl = connectorMedia(item.imageUrl, `${prefix}image/`);
  if (!MEDIA_ID.test(id) || !type || !imageUrl) return undefined;
  const videoUrl = type === 'VIDEO' ? connectorMedia(item.videoUrl, prefix) : undefined;
  return { id, type, imageUrl, ...(videoUrl ? { videoUrl } : {}) };
}

/**
 * One post, or `undefined` when it cannot be shown. The optional keys (`videoUrl`, `likeCount`,
 * `commentsCount`, `children`) are dropped when what was sent does not pass: a bad clip URL costs
 * the clip (the popup shows the cover and links out), not the post.
 */
function parsePost(raw: unknown, prefix: string): FeedPost | undefined {
  const item = asRecord(raw);
  if (!item) return undefined;
  const id = asString(item.id);
  const type = MEDIA_TYPES.find((t) => t === item.type);
  const permalink = asString(item.permalink);
  const imageUrl = asString(item.imageUrl);
  if (!MEDIA_ID.test(id) || !type || !isInstagramUrl(permalink)) return undefined;
  if (!imageUrl.startsWith(`${prefix}image/${id}?s=`) || !connectorMedia(imageUrl, prefix)) {
    return undefined;
  }
  const timestamp = asString(item.timestamp);
  const caption = asString(item.caption).trim().slice(0, CAPTION_MAX);
  const videoUrl = type === 'VIDEO' ? connectorMedia(item.videoUrl, prefix) : undefined;
  const likeCount = asCount(item.likeCount);
  const commentsCount = asCount(item.commentsCount);
  const children =
    type === 'CAROUSEL_ALBUM' && Array.isArray(item.children)
      ? item.children
          .slice(0, CHILDREN_MAX)
          .map((c) => parseChild(c, prefix))
          .filter((c): c is FeedChild => c !== undefined)
      : [];
  return {
    id,
    type,
    permalink,
    timestamp: Number.isNaN(Date.parse(timestamp)) ? '' : timestamp,
    caption,
    alt: asString(item.alt).trim() || altFromCaption(caption),
    imageUrl,
    ...(videoUrl ? { videoUrl } : {}),
    ...(likeCount !== undefined ? { likeCount } : {}),
    ...(commentsCount !== undefined ? { commentsCount } : {}),
    ...(children.length > 0 ? { children } : {}),
  };
}

export function feedUrl(
  endpoint: string,
  slug: string,
  opts: { limit: number; hiddenIds: string[]; pinnedIds: string[] },
): string {
  const params = new URLSearchParams({ limit: String(opts.limit) });
  if (opts.hiddenIds.length) params.set('hidden', opts.hiddenIds.join(','));
  if (opts.pinnedIds.length) params.set('pinned', opts.pinnedIds.join(','));
  return `${endpoint}/api/delivery/${encodeURIComponent(slug)}/instagram?${params.toString()}`;
}

/**
 * Trusts nothing in the response: a post survives only with a valid id, an https Instagram
 * permalink and a picture that is one of THIS project's connector image URLs. The clip, the
 * album's children and the avatar must live under the project's delivery path too, counts must
 * be whole non-negative numbers, an album has at most ten children, and the profile link must
 * stay on instagram.com. `stale` (the connector's last good copy during a Meta outage) is shown
 * as `ok`: an old feed beats a placeholder.
 */
export function parseFeed(json: unknown, endpoint: string, slug: string): Feed {
  const body = asRecord(json);
  const status = STATUSES.find((s) => s === body?.status);
  if (!body || !status) return { status: 'unavailable', posts: [] };
  if (status === 'unconfigured' || status === 'unavailable') return { status, posts: [] };

  const prefix = `${endpoint}/api/delivery/${encodeURIComponent(slug)}/instagram/`;
  const posts = (Array.isArray(body.posts) ? body.posts : [])
    .slice(0, MAX_LIMIT)
    .map((p) => parsePost(p, prefix))
    .filter((p): p is FeedPost => p !== undefined);

  const account = asRecord(body.account);
  const username = asString(account?.username);
  const profileUrl = asString(account?.profileUrl);
  const avatarUrl = connectorMedia(account?.avatarUrl, prefix);
  const mediaCount = asCount(account?.mediaCount);
  return {
    status: 'ok',
    posts,
    ...(typeof body.more === 'boolean' ? { more: body.more } : {}),
    ...(account && username && isInstagramUrl(profileUrl)
      ? {
          account: {
            username,
            profileUrl,
            ...(avatarUrl ? { avatarUrl } : {}),
            ...(mediaCount !== undefined ? { mediaCount } : {}),
          },
        }
      : {}),
  };
}

/** Never rejects: a feed we could not read is `unavailable`, and the caller shows its placeholder. */
export function loadFeed(url: string, endpoint: string, slug: string): Promise<Feed> {
  const pending = inFlight.get(url);
  if (pending) return pending;

  const request = (async (): Promise<Feed> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        headers: { accept: 'application/json' },
      });
      if (!res.ok) return { status: 'unavailable', posts: [] };
      return parseFeed(await res.json(), endpoint, slug);
    } catch {
      return { status: 'unavailable', posts: [] };
    } finally {
      clearTimeout(timer);
    }
  })();

  inFlight.set(url, request);
  void request.then(() => inFlight.delete(url));
  return request;
}
