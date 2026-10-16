import type { Feed, FeedPost, FeedStatus, MediaType } from './types';

const TIMEOUT_MS = 8000;
const STATUSES: readonly FeedStatus[] = ['ok', 'stale', 'unconfigured', 'unavailable'];
const MEDIA_TYPES: readonly MediaType[] = ['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM'];

/** One request per URL while it is in flight, so several feeds on a page cost one call. */
const inFlight = new Map<string, Promise<Feed>>();

const parseUrl = (raw: unknown, protocols: readonly string[] = ['https:']): URL | undefined => {
  if (typeof raw !== 'string') return undefined;
  try {
    const url = new URL(raw);
    return protocols.includes(url.protocol) ? url : undefined;
  } catch {
    return undefined;
  }
};

const isInstagramHost = (url: URL): boolean =>
  url.hostname === 'instagram.com' || url.hostname.endsWith('.instagram.com');

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
 * Trusts nothing in the response: a post needs an https Instagram permalink and a
 * picture served by the connector itself (never a third-party host), or it is dropped.
 */
export function parseFeed(json: unknown, endpoint: string): Feed {
  const empty: Feed = { status: 'unavailable', posts: [] };
  if (typeof json !== 'object' || json === null) return empty;
  const raw = json as Record<string, unknown>;
  const status = STATUSES.includes(raw.status as FeedStatus) ? (raw.status as FeedStatus) : null;
  if (!status) return empty;

  const posts: FeedPost[] = [];
  for (const item of Array.isArray(raw.posts) ? raw.posts : []) {
    if (typeof item !== 'object' || item === null) continue;
    const p = item as Record<string, unknown>;
    const permalink = parseUrl(p.permalink);
    // The endpoint was validated (https, or http on localhost); the picture must share its origin.
    const image = parseUrl(p.imageUrl, ['https:', 'http:']);
    if (!permalink || !isInstagramHost(permalink)) continue;
    if (!image || image.origin !== endpoint) continue;
    if (typeof p.id !== 'string' || !p.id) continue;
    posts.push({
      id: p.id,
      type: MEDIA_TYPES.includes(p.type as MediaType) ? (p.type as MediaType) : 'IMAGE',
      permalink: permalink.href,
      caption: typeof p.caption === 'string' ? p.caption : '',
      alt: typeof p.alt === 'string' ? p.alt : '',
      imageUrl: image.href,
    });
  }

  const profile = parseUrl((raw.account as Record<string, unknown> | undefined)?.profileUrl);
  return {
    status,
    posts,
    ...(profile && isInstagramHost(profile) ? { account: { profileUrl: profile.href } } : {}),
  };
}

/** Never rejects: a feed we could not read is `unavailable`, and the caller shows its placeholder. */
export function loadFeed(url: string, endpoint: string): Promise<Feed> {
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
      return parseFeed(await res.json(), endpoint);
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
