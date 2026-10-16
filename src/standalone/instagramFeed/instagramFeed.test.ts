// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseEndpoint, readOptions } from './config';
import { feedUrl, parseFeed } from './feed';
import { initInstagramFeed } from './index';

const ENDPOINT = 'https://instagram-connector.services.dreher-media.de';

const post = (i: number, over: Record<string, unknown> = {}) => ({
  id: `1700000000000${String(i).padStart(4, '0')}`,
  type: 'IMAGE',
  permalink: `https://www.instagram.com/p/POST${i}/`,
  timestamp: '2026-01-01T00:00:00Z',
  caption: `Caption ${i}`,
  alt: `Alt ${i}`,
  imageUrl: `${ENDPOINT}/api/delivery/demo/instagram/image/${i}?s=abc`,
  ...over,
});

const feedJson = (count = 8, over: Record<string, unknown> = {}) => ({
  status: 'ok',
  posts: Array.from({ length: count }, (_, i) => post(i)),
  account: { id: '1', username: 'demo', profileUrl: 'https://www.instagram.com/demo/' },
  ...over,
});

function mockFetch(body: unknown, init: { ok?: boolean } = {}) {
  const fn = vi.fn(async () => ({
    ok: init.ok ?? true,
    json: async () => body,
  }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

function mountRoot(attrs: Record<string, string> = {}): HTMLElement {
  const root = document.createElement('div');
  root.setAttribute('data-ig-feed', '');
  root.setAttribute('data-ig-slug', 'demo');
  for (const [k, v] of Object.entries(attrs)) root.setAttribute(k, v);
  document.body.appendChild(root);
  return root;
}

beforeEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('readOptions', () => {
  it('requires a valid slug', () => {
    const root = mountRoot({ 'data-ig-slug': 'Not A Slug' });
    expect(readOptions(root)).toBeUndefined();
    root.removeAttribute('data-ig-slug');
    expect(readOptions(root)).toBeUndefined();
  });

  it('falls back to the house defaults', () => {
    const o = readOptions(mountRoot())!;
    expect(o).toMatchObject({
      endpoint: ENDPOINT,
      limit: 12,
      layout: 'grid',
      columns: { base: 3, md: 4, lg: 6 },
      rows: 1,
      ratio: '3 / 4',
      overlay: 'hover',
      placeholder: 'tiles',
      showProfileLink: true,
    });
  });

  it('clamps and sanitizes attributes', () => {
    const o = readOptions(
      mountRoot({
        'data-ig-limit': '999',
        'data-ig-layout': 'masonry',
        'data-ig-ratio': 'url(x)',
        'data-ig-hidden': '17000000000000001, nope, 17000000000000002',
      }),
    )!;
    expect(o.limit).toBe(25);
    expect(o.layout).toBe('grid');
    expect(o.ratio).toBe('3 / 4');
    expect(o.hiddenIds).toEqual(['17000000000000001', '17000000000000002']);
  });

  it('picks the label language from the page and lets attributes override it', () => {
    document.documentElement.lang = 'en';
    const en = readOptions(mountRoot({ 'data-ig-label-follow': 'Folgt uns' }))!;
    expect(en.labels.region).toBe('Instagram posts');
    expect(en.labels.follow).toBe('Folgt uns');
    document.documentElement.lang = 'de';
    expect(readOptions(mountRoot())!.labels.region).toBe('Instagram-Beiträge');
  });
});

describe('parseEndpoint', () => {
  it('accepts https origins and localhost, nothing else', () => {
    expect(parseEndpoint(undefined)).toBe(ENDPOINT);
    expect(parseEndpoint('https://cms.example.com/some/path')).toBe('https://cms.example.com');
    expect(parseEndpoint('http://localhost:8787')).toBe('http://localhost:8787');
    expect(parseEndpoint('http://example.com')).toBeUndefined();
    expect(parseEndpoint('javascript:alert(1)')).toBeUndefined();
    expect(parseEndpoint('not a url')).toBeUndefined();
  });
});

describe('feedUrl', () => {
  it('builds the delivery URL with curation', () => {
    const url = feedUrl(ENDPOINT, 'demo', {
      limit: 9,
      hiddenIds: ['17000000000000001'],
      pinnedIds: [],
    });
    expect(url).toBe(`${ENDPOINT}/api/delivery/demo/instagram?limit=9&hidden=17000000000000001`);
  });
});

describe('parseFeed', () => {
  it('drops posts with foreign picture hosts or non-Instagram permalinks', () => {
    const feed = parseFeed(
      {
        status: 'ok',
        posts: [
          post(1),
          post(2, { imageUrl: 'https://evil.example/x.jpg' }),
          post(3, { permalink: 'https://evil.example/p/1/' }),
          post(4, { permalink: 'javascript:alert(1)' }),
          post(5, { imageUrl: 'http://instagram-connector.services.dreher-media.de/x' }),
        ],
      },
      ENDPOINT,
    );
    expect(feed.posts.map((p) => p.id)).toEqual([post(1).id]);
  });

  it('keeps pictures of a local http endpoint, and only of that endpoint', () => {
    const local = 'http://localhost:4173';
    const feed = parseFeed(
      {
        status: 'ok',
        posts: [
          post(1, { imageUrl: `${local}/api/delivery/demo/instagram/image/1?s=abc` }),
          post(2, { imageUrl: 'http://localhost:9999/x' }),
        ],
      },
      local,
    );
    expect(feed.posts.map((p) => p.id)).toEqual([post(1).id]);
  });

  it('treats an unreadable body as unavailable', () => {
    expect(parseFeed(null, ENDPOINT)).toEqual({ status: 'unavailable', posts: [] });
    expect(parseFeed({ status: 'weird' }, ENDPOINT).status).toBe('unavailable');
  });

  it('only keeps an Instagram profile link', () => {
    const ok = parseFeed(feedJson(1), ENDPOINT);
    expect(ok.account?.profileUrl).toBe('https://www.instagram.com/demo/');
    const bad = parseFeed(
      feedJson(1, { account: { profileUrl: 'https://evil.example/' } }),
      ENDPOINT,
    );
    expect(bad.account).toBeUndefined();
  });
});

describe('initInstagramFeed', () => {
  it('renders one tile per post, linked out safely', async () => {
    const fetchFn = mockFetch(feedJson(8));
    const root = mountRoot({ 'data-ig-rows': '2' });
    await initInstagramFeed();

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const calls = fetchFn.mock.calls as unknown as [string, RequestInit][];
    expect(calls[0]![0]).toBe(`${ENDPOINT}/api/delivery/demo/instagram?limit=12`);
    expect(calls[0]![1]).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer' });

    const tiles = root.querySelectorAll<HTMLAnchorElement>('a.ig-feed__tile');
    expect(tiles).toHaveLength(8);
    expect(tiles[0]!.target).toBe('_blank');
    expect(tiles[0]!.rel).toBe('noopener noreferrer');
    expect(tiles[0]!.getAttribute('aria-label')).toContain('Alt 0');
    expect(root.dataset.status).toBe('ok');
    expect(root.getAttribute('aria-busy')).toBe('false');
    expect(root.querySelector('.ig-feed__follow')!.getAttribute('href')).toBe(
      'https://www.instagram.com/demo/',
    );
  });

  it('hides the tiles beyond rows × columns per breakpoint in the grid', async () => {
    mockFetch(feedJson(8));
    const root = mountRoot({
      'data-ig-columns-base': '2',
      'data-ig-columns-md': '4',
      'data-ig-columns-lg': '6',
    });
    await initInstagramFeed();
    const items = root.querySelectorAll('.ig-feed__item');
    expect(items[2]!.classList.contains('is-off-base')).toBe(true);
    expect(items[2]!.classList.contains('is-off-md')).toBe(false);
    expect(items[6]!.classList.contains('is-off-lg')).toBe(true);
    expect(items[5]!.classList.contains('is-off-lg')).toBe(false);
  });

  it('renders caption text and never as markup', async () => {
    mockFetch({
      status: 'ok',
      posts: [post(1, { caption: '<img src=x onerror=alert(1)>' })],
    });
    const root = mountRoot();
    await initInstagramFeed();
    const caption = root.querySelector('.ig-feed__caption')!;
    expect(caption.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(caption.children).toHaveLength(0);
  });

  it('marks videos and albums and omits the overlay when asked', async () => {
    mockFetch({
      status: 'ok',
      posts: [post(1, { type: 'VIDEO' }), post(2, { type: 'CAROUSEL_ALBUM' })],
    });
    const root = mountRoot({ 'data-ig-overlay': 'none' });
    await initInstagramFeed();
    expect(root.querySelectorAll('.ig-feed__badge')).toHaveLength(2);
    expect(root.querySelector('.ig-feed__overlay')).toBeNull();
    expect(root.querySelector('a')!.getAttribute('aria-label')).toContain('Video');
  });

  it('adds carousel arrows only for the carousel layout', async () => {
    mockFetch(feedJson(8));
    const carousel = mountRoot({ 'data-ig-layout': 'carousel' });
    const grid = mountRoot();
    await initInstagramFeed();
    expect(carousel.querySelectorAll('.ig-feed__nav')).toHaveLength(2);
    expect(grid.querySelectorAll('.ig-feed__nav')).toHaveLength(0);
  });

  it('shows placeholder tiles while loading and when the feed is unconfigured', async () => {
    let resolve!: (v: unknown) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise((r) => (resolve = r))),
    );
    const root = mountRoot();
    const done = initInstagramFeed();
    expect(root.dataset.status).toBe('loading');
    expect(root.getAttribute('aria-busy')).toBe('true');
    expect(root.querySelectorAll('.ig-feed__tile--placeholder')).toHaveLength(6);

    resolve({ ok: true, json: async () => ({ status: 'unconfigured', posts: [] }) });
    await done;
    expect(root.dataset.status).toBe('unconfigured');
    expect(root.querySelectorAll('.ig-feed__tile--placeholder')).toHaveLength(6);
    expect(root.querySelector('.ig-feed__follow')).toBeNull();
  });

  it('hides itself when there is nothing to show and placeholder="hide"', async () => {
    mockFetch({ status: 'unconfigured', posts: [] });
    const root = mountRoot({ 'data-ig-placeholder': 'hide' });
    await initInstagramFeed();
    expect(root.hidden).toBe(true);
  });

  it('renders nothing for an account that answered and has no posts', async () => {
    mockFetch({ status: 'ok', posts: [], account: { profileUrl: 'https://www.instagram.com/d/' } });
    const root = mountRoot({ 'data-ig-profile-link': 'false' });
    await initInstagramFeed();
    expect(root.querySelector('.ig-feed__tile')).toBeNull();
    expect(root.hidden).toBe(true);
  });

  it('falls back to the placeholder when the request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))),
    );
    const root = mountRoot();
    await initInstagramFeed();
    expect(root.dataset.status).toBe('unavailable');
    expect(root.querySelectorAll('.ig-feed__tile--placeholder').length).toBeGreaterThan(0);
  });

  it('falls back to the placeholder on an HTTP error', async () => {
    mockFetch({}, { ok: false });
    const root = mountRoot();
    await initInstagramFeed();
    expect(root.dataset.status).toBe('unavailable');
  });

  it('does nothing, without a request, for an element without a valid slug', async () => {
    const fetchFn = mockFetch(feedJson());
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mountRoot({ 'data-ig-slug': '' });
    await initInstagramFeed();
    expect(fetchFn).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });

  it('sets a feed up once, however often init runs', async () => {
    const fetchFn = mockFetch(feedJson(4));
    mountRoot();
    await initInstagramFeed();
    await initInstagramFeed();
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll('style[data-dm-ig-feed-style]')).toHaveLength(1);
  });

  it('shares one request between feeds with the same parameters', async () => {
    const fetchFn = mockFetch(feedJson(4));
    mountRoot();
    mountRoot();
    await initInstagramFeed();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('announces the result as an event', async () => {
    mockFetch(feedJson(2));
    const root = mountRoot();
    const seen = vi.fn();
    root.addEventListener('ig-feed:loaded', (e) => seen((e as CustomEvent).detail));
    await initInstagramFeed();
    expect(seen).toHaveBeenCalledWith({ status: 'ok' });
  });

  it('adds nothing that points at a third party', async () => {
    mockFetch(feedJson(3));
    mountRoot();
    await initInstagramFeed();
    expect(document.querySelectorAll('script[src], link[href], iframe')).toHaveLength(0);
  });
});
