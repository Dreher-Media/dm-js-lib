// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseEndpoint, readOptions } from './config';
import { feedUrl, parseFeed } from './feed';
import { initInstagramFeed } from './index';

const ENDPOINT = 'https://instagram-connector.services.dreher-media.de';
const DELIVERY = `${ENDPOINT}/api/delivery/demo/instagram`;

const idOf = (i: number): string => `17900000000${String(i).padStart(6, '0')}`;

const post = (i: number, over: Record<string, unknown> = {}) => ({
  id: idOf(i),
  type: 'IMAGE',
  permalink: `https://www.instagram.com/p/POST${i}/`,
  timestamp: '2026-10-01T10:00:00Z',
  caption: `Caption ${i}`,
  alt: `Alt ${i}`,
  imageUrl: `${DELIVERY}/image/${idOf(i)}?s=abc`,
  ...over,
});

const feedJson = (count = 8, over: Record<string, unknown> = {}) => ({
  status: 'ok',
  posts: Array.from({ length: count }, (_, i) => post(i)),
  account: {
    id: '1',
    username: 'demo',
    profileUrl: 'https://www.instagram.com/demo/',
    avatarUrl: `${DELIVERY}/avatar?s=abc`,
    mediaCount: 40,
  },
  ...over,
});

function mockFetch(body: unknown, init: { ok?: boolean } = {}) {
  const fn = vi.fn(async () => ({ ok: init.ok ?? true, json: async () => body }));
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
  document.body.style.overflow = '';
  // what jsdom does not have and the popup needs
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }));
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Element.prototype.scrollTo = () => undefined;
  Element.prototype.scrollIntoView = () => undefined;
  HTMLMediaElement.prototype.play = () => Promise.resolve();
  HTMLMediaElement.prototype.pause = () => undefined;
  HTMLMediaElement.prototype.load = () => undefined;
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

  it('falls back to the template defaults', () => {
    expect(readOptions(mountRoot())).toMatchObject({
      endpoint: ENDPOINT,
      limit: 12,
      layout: 'grid',
      columns: { base: 3, md: 4, lg: 6 },
      rows: 1,
      ratio: '3 / 4',
      overlay: 'hover',
      placeholder: 'tiles',
      showProfileLink: true,
      protectMedia: true,
      hoverPreview: true,
      popup: true,
      popupLimit: 25,
      timeZone: 'Europe/Berlin',
    });
  });

  it('clamps and sanitizes attributes', () => {
    const o = readOptions(
      mountRoot({
        'data-ig-limit': '999',
        'data-ig-layout': 'masonry',
        'data-ig-ratio': 'url(x)',
        'data-ig-hidden': '179000000000000001, nope, 179000000000000002',
        'data-ig-popup': 'false',
        'data-ig-protect-media': 'false',
        'data-ig-hover-preview': 'false',
      }),
    )!;
    expect(o.limit).toBe(25);
    expect(o.layout).toBe('grid');
    expect(o.ratio).toBe('3 / 4');
    expect(o.hiddenIds).toEqual(['179000000000000001', '179000000000000002']);
    expect(o.popup).toBe(false);
    expect(o.protectMedia).toBe(false);
    expect(o.hoverPreview).toBe(false);
  });

  it('picks the language and locale from the page and lets attributes override labels', () => {
    document.documentElement.lang = 'en-GB';
    const en = readOptions(mountRoot({ 'data-ig-label-open-post': 'Open it' }))!;
    expect(en.labels.region).toBe('Instagram posts');
    expect(en.labels.close).toBe('Close');
    expect(en.labels.openPost).toBe('Open it');
    expect(en.locale).toBe('en-GB');
    document.documentElement.lang = 'de';
    expect(readOptions(mountRoot())!.labels.close).toBe('Schließen');
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
    expect(
      feedUrl(ENDPOINT, 'demo', { limit: 9, hiddenIds: ['179000000000000001'], pinnedIds: [] }),
    ).toBe(`${DELIVERY}?limit=9&hidden=179000000000000001`);
  });
});

describe('parseFeed', () => {
  const parse = (json: unknown) => parseFeed(json, ENDPOINT, 'demo');

  it('drops posts with foreign pictures, wrong ids or non-Instagram permalinks', () => {
    const feed = parse({
      status: 'ok',
      posts: [
        post(1),
        post(2, { imageUrl: 'https://evil.example/x.jpg' }),
        post(3, { permalink: 'https://evil.example/p/1/' }),
        post(4, { permalink: 'javascript:alert(1)' }),
        post(5, { imageUrl: `${DELIVERY}/image/${idOf(99)}?s=abc` }),
        post(6, { imageUrl: `${ENDPOINT}/api/delivery/other/instagram/image/${idOf(6)}?s=abc` }),
        post(7, { id: '12' }),
      ],
    });
    expect(feed.posts.map((p) => p.id)).toEqual([idOf(1)]);
  });

  it('keeps clips, children, counts and the avatar only where they pass', () => {
    const feed = parse({
      status: 'ok',
      posts: [
        post(1, {
          type: 'VIDEO',
          videoUrl: `${DELIVERY}/video/${idOf(1)}?s=abc`,
          likeCount: 12,
          commentsCount: -3,
        }),
        post(2, { type: 'VIDEO', videoUrl: 'https://evil.example/v.mp4', likeCount: 1.5 }),
        post(3, {
          type: 'CAROUSEL_ALBUM',
          children: [
            { id: idOf(30), type: 'IMAGE', imageUrl: `${DELIVERY}/image/${idOf(30)}?s=a` },
            { id: idOf(31), type: 'IMAGE', imageUrl: 'https://evil.example/c.jpg' },
            {
              id: idOf(32),
              type: 'VIDEO',
              imageUrl: `${DELIVERY}/image/${idOf(32)}?s=a`,
              videoUrl: `${DELIVERY}/video/${idOf(32)}?s=a`,
            },
          ],
        }),
      ],
      account: {
        username: 'demo',
        profileUrl: 'https://www.instagram.com/demo/',
        avatarUrl: 'https://evil.example/a.jpg',
        mediaCount: 2.5,
      },
      more: true,
    });
    const [clip, badClip, album] = feed.posts;
    expect(clip!.videoUrl).toContain('/video/');
    expect(clip!.likeCount).toBe(12);
    expect('commentsCount' in clip!).toBe(false);
    expect('videoUrl' in badClip!).toBe(false);
    expect('likeCount' in badClip!).toBe(false);
    expect(album!.children!.map((c) => c.id)).toEqual([idOf(30), idOf(32)]);
    expect(feed.account).toEqual({
      username: 'demo',
      profileUrl: 'https://www.instagram.com/demo/',
    });
    expect(feed.more).toBe(true);
  });

  it('caps an album at ten children', () => {
    const children = Array.from({ length: 14 }, (_, i) => ({
      id: idOf(100 + i),
      type: 'IMAGE',
      imageUrl: `${DELIVERY}/image/${idOf(100 + i)}?s=a`,
    }));
    const feed = parse({ status: 'ok', posts: [post(1, { type: 'CAROUSEL_ALBUM', children })] });
    expect(feed.posts[0]!.children).toHaveLength(10);
  });

  it('takes the alt text from the caption when the API sent none', () => {
    const feed = parse({
      status: 'ok',
      posts: [post(1, { alt: '', caption: '#a #b\nA real line #c' })],
    });
    expect(feed.posts[0]!.alt).toBe('A real line');
  });

  it('shows a stale feed as ok, and an unreadable body as unavailable', () => {
    expect(parse(feedJson(2, { status: 'stale' })).status).toBe('ok');
    expect(parse(null)).toEqual({ status: 'unavailable', posts: [] });
    expect(parse({ status: 'weird' }).status).toBe('unavailable');
    expect(parse({ status: 'unconfigured', posts: [post(1)] })).toEqual({
      status: 'unconfigured',
      posts: [],
    });
  });

  it('keeps pictures of a local http endpoint, and only of that endpoint', () => {
    const local = 'http://localhost:4173';
    const own = `${local}/api/delivery/demo/instagram/image/${idOf(1)}?s=abc`;
    const feed = parseFeed(
      {
        status: 'ok',
        posts: [post(1, { imageUrl: own }), post(2, { imageUrl: 'http://localhost:9999/x' })],
      },
      local,
      'demo',
    );
    expect(feed.posts.map((p) => p.id)).toEqual([idOf(1)]);
  });

  it('only keeps an Instagram profile link', () => {
    expect(parse(feedJson(1)).account?.profileUrl).toBe('https://www.instagram.com/demo/');
    expect(
      parse(feedJson(1, { account: { username: 'x', profileUrl: 'https://evil.example/' } }))
        .account,
    ).toBeUndefined();
  });
});

describe('the grid', () => {
  it('renders one tile per post, linked out safely', async () => {
    const fetchFn = mockFetch(feedJson(8));
    const root = mountRoot({ 'data-ig-rows': '2' });
    await initInstagramFeed();

    const calls = fetchFn.mock.calls as unknown as [string, RequestInit][];
    expect(calls).toHaveLength(1);
    expect(calls[0]![0]).toBe(`${DELIVERY}?limit=12`);
    expect(calls[0]![1]).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer' });

    const tiles = root.querySelectorAll<HTMLAnchorElement>('a.ig-feed__tile');
    expect(tiles).toHaveLength(8);
    expect(tiles[0]!.target).toBe('_blank');
    expect(tiles[0]!.rel).toBe('noopener noreferrer');
    expect(tiles[0]!.draggable).toBe(false);
    expect(root.dataset.status).toBe('ok');
    expect(root.getAttribute('aria-busy')).toBe('false');
    expect(root.hasAttribute('data-ig-protect')).toBe(true);
    expect(root.querySelector('.ig-feed__follow')!.getAttribute('href')).toBe(
      'https://www.instagram.com/demo/',
    );
  });

  it('turns a tile into a popup trigger once the feed has loaded', async () => {
    mockFetch(feedJson(3));
    const root = mountRoot();
    await initInstagramFeed();
    const tile = root.querySelector<HTMLAnchorElement>('a.ig-feed__tile')!;
    expect(tile.dataset.igOpen).toBe(idOf(0));
    expect(tile.getAttribute('aria-haspopup')).toBe('dialog');
    expect(tile.getAttribute('aria-label')).toContain('Beitrag ansehen');
    expect(tile.getAttribute('aria-label')).not.toContain('Tab');
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

  it('prints the caption over the tile as text, never as markup', async () => {
    mockFetch({ status: 'ok', posts: [post(1, { caption: '<img src=x onerror=alert(1)>' })] });
    const root = mountRoot();
    await initInstagramFeed();
    const caption = root.querySelector('.ig-feed__caption')!;
    expect(caption.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(caption.children).toHaveLength(0);
  });

  it('marks videos and albums, and leaves the overlay out when asked', async () => {
    mockFetch({
      status: 'ok',
      posts: [post(1, { type: 'VIDEO' }), post(2, { type: 'CAROUSEL_ALBUM' })],
    });
    const root = mountRoot({ 'data-ig-overlay': 'none' });
    await initInstagramFeed();
    expect(root.querySelectorAll('.ig-feed__badge')).toHaveLength(2);
    expect(root.querySelector('.ig-feed__overlay')).toBeNull();
    expect(root.querySelector('a.ig-feed__tile')!.getAttribute('aria-label')).toContain('Video');
  });

  it('adds carousel arrows only for the carousel layout', async () => {
    mockFetch(feedJson(8));
    const carousel = mountRoot({ 'data-ig-layout': 'carousel' });
    const grid = mountRoot();
    await initInstagramFeed();
    expect(carousel.querySelectorAll('.ig-feed__nav')).toHaveLength(2);
    expect(grid.querySelectorAll('.ig-feed__nav')).toHaveLength(0);
  });

  it('turns the popup, the preview and the protection off on request', async () => {
    mockFetch(
      feedJson(2, {
        posts: [post(1, { type: 'VIDEO', videoUrl: `${DELIVERY}/video/${idOf(1)}?s=abc` })],
      }),
    );
    const root = mountRoot({
      'data-ig-popup': 'false',
      'data-ig-hover-preview': 'false',
      'data-ig-protect-media': 'false',
    });
    await initInstagramFeed();
    const tile = root.querySelector<HTMLAnchorElement>('a.ig-feed__tile')!;
    expect(tile.hasAttribute('data-ig-open')).toBe(false);
    expect(tile.hasAttribute('data-ig-preview')).toBe(false);
    expect(root.querySelector('template')).toBeNull();
    expect(root.hasAttribute('data-ig-protect')).toBe(false);
    expect(tile.draggable).toBe(true);
  });
});

describe('placeholders and failures', () => {
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
    mockFetch({
      status: 'ok',
      posts: [],
      account: { username: 'd', profileUrl: 'https://www.instagram.com/d/' },
    });
    const root = mountRoot({ 'data-ig-profile-link': 'false' });
    await initInstagramFeed();
    expect(root.querySelector('.ig-feed__tile')).toBeNull();
    expect(root.hidden).toBe(true);
  });

  it('falls back to the placeholder when the request fails, or answers with an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))),
    );
    const a = mountRoot();
    await initInstagramFeed();
    expect(a.dataset.status).toBe('unavailable');
    expect(a.querySelectorAll('.ig-feed__tile--placeholder').length).toBeGreaterThan(0);

    mockFetch({}, { ok: false });
    const b = mountRoot();
    await initInstagramFeed();
    expect(b.dataset.status).toBe('unavailable');
  });

  it('does nothing, without a request, for an element without a valid slug', async () => {
    const fetchFn = mockFetch(feedJson());
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mountRoot({ 'data-ig-slug': '' });
    await initInstagramFeed();
    expect(fetchFn).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });

  it('sets a feed up once, however often init runs, and shares one request', async () => {
    const fetchFn = mockFetch(feedJson(4));
    mountRoot();
    mountRoot();
    await initInstagramFeed();
    await initInstagramFeed();
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll('style[data-dm-ig-feed-style]')).toHaveLength(1);
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

describe('the popup templates', () => {
  const rich = () =>
    feedJson(3, {
      posts: [
        post(0, {
          type: 'VIDEO',
          caption: 'Line one #berlin with @friend\nLine two',
          likeCount: 1284,
          commentsCount: 24,
          videoUrl: `${DELIVERY}/video/${idOf(0)}?s=abc`,
        }),
        post(1, {
          type: 'CAROUSEL_ALBUM',
          children: [
            { id: idOf(10), type: 'IMAGE', imageUrl: `${DELIVERY}/image/${idOf(10)}?s=a` },
            {
              id: idOf(11),
              type: 'VIDEO',
              imageUrl: `${DELIVERY}/image/${idOf(11)}?s=a`,
              videoUrl: `${DELIVERY}/video/${idOf(11)}?s=a`,
            },
            { id: idOf(12), type: 'IMAGE', imageUrl: `${DELIVERY}/image/${idOf(12)}?s=a` },
          ],
        }),
        post(2, { type: 'VIDEO', caption: '' }),
      ],
    });

  it('renders one template per post, the dialog shell and the header, and nothing is loaded yet', async () => {
    mockFetch(rich());
    const root = mountRoot();
    await initInstagramFeed();
    expect(root.querySelectorAll('template[data-ig-post]')).toHaveLength(3);
    const dialog = root.querySelector<HTMLTemplateElement>('template[data-ig-dialog]')!;
    expect(dialog.content.querySelector('.ig-pop[data-modal][role="dialog"]')).not.toBeNull();
    expect(dialog.content.querySelector('template[data-ig-head]')).not.toBeNull();
    expect(dialog.content.querySelector('[data-ig-step]')).not.toBeNull();
    // inert: the pictures live inside templates, outside the document
    expect(root.querySelectorAll('.ig-pop__img')).toHaveLength(0);
  });

  it('puts the end line, counts, caption links, date, share and the album into the post templates', async () => {
    mockFetch(rich());
    const root = mountRoot();
    await initInstagramFeed();
    const [clip, album, bare] = Array.from(
      root.querySelectorAll<HTMLTemplateElement>('template[data-ig-post]'),
    ).map((t) => t.content);

    const end = root
      .querySelector<HTMLTemplateElement>('template[data-ig-dialog]')!
      .content.querySelector('.ig-pop__end')!;
    expect(end.getAttribute('data-end')).toBe('count');
    expect(end.querySelector('.ig-pop__end-text')!.textContent).toBe(
      'Noch 37 weitere Beiträge auf Instagram',
    );

    expect(clip!.querySelectorAll('.ig-pop__num [aria-hidden="true"]')[0]!.textContent).toBe(
      '1.284',
    );
    expect(clip!.querySelector('.ig-pop__comments')!.textContent).toBe(
      'Alle 24 Kommentare ansehen',
    );
    expect(
      Array.from(clip!.querySelectorAll('.ig-pop__link')).map((a) => a.getAttribute('href')),
    ).toEqual([
      'https://www.instagram.com/explore/tags/berlin/',
      'https://www.instagram.com/friend/',
    ]);
    expect(clip!.querySelector('.ig-pop__text')!.textContent).toContain(
      'Line one #berlin with @friend\nLine two',
    );
    expect(clip!.querySelector('time[data-ig-date]')!.getAttribute('datetime')).toBe(
      '2026-10-01T10:00:00Z',
    );
    expect(clip!.querySelector('[data-ig-share]')).not.toBeNull();

    // a clip with a file: the player, no native controls
    const video = clip!.querySelector<HTMLVideoElement>('video')!;
    expect(video.getAttribute('src')).toContain('/video/');
    expect(video.hasAttribute('controls')).toBe(false);
    expect(video.muted).toBe(true);
    expect(video.getAttribute('preload')).toBe('none');
    expect(clip!.querySelector('[data-ig-scrub][role="slider"]')).not.toBeNull();

    // an album: three slides, counter, dots, arrows, the later slides inert
    expect(album!.querySelectorAll('[data-ig-slide]')).toHaveLength(3);
    expect(album!.querySelector('[data-ig-counter]')!.textContent).toBe('1/3');
    expect(album!.querySelectorAll('[data-ig-dots] > span')).toHaveLength(3);
    expect(album!.querySelector('[data-ig-slide-prev]')!.hasAttribute('hidden')).toBe(true);
    const slides = Array.from(album!.querySelectorAll<HTMLElement>('[data-ig-slide]'));
    expect(slides.map((s) => s.inert)).toEqual([false, true, true]);

    // a clip Meta gave no file for: the cover with a disc that reveals the notice
    expect(bare!.querySelector('[data-ig-reveal]')).not.toBeNull();
    expect(bare!.querySelector('[data-ig-fallback] a')!.getAttribute('href')).toContain(
      'instagram.com/p/POST2',
    );
    expect(bare!.querySelector('.ig-pop__caption')).toBeNull();
  });

  it('makes a tile preview its clip on hover only when the clip has a file', async () => {
    mockFetch(rich());
    const root = mountRoot();
    await initInstagramFeed();
    const tiles = Array.from(root.querySelectorAll<HTMLAnchorElement>('a.ig-feed__tile'));
    expect(tiles[0]!.dataset.igPreview).toContain('/video/');
    expect(tiles[1]!.hasAttribute('data-ig-preview')).toBe(false);
    expect(tiles[2]!.hasAttribute('data-ig-preview')).toBe(false);
    expect(root.hasAttribute('data-ig-hover-preview')).toBe(true);
  });
});

describe('the popup', () => {
  async function open(attrs: Record<string, string> = {}) {
    mockFetch(feedJson(4));
    const root = mountRoot(attrs);
    await initInstagramFeed();
    const tile = root.querySelectorAll<HTMLAnchorElement>('a.ig-feed__tile')[1]!;
    tile.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, detail: 1 }),
    );
    return { root, tile };
  }

  it('opens a dialog on <body> with a card per post, and closes on Escape', async () => {
    const { tile } = await open();
    const dialog = document.querySelector<HTMLElement>('body > .ig-pop')!;
    expect(dialog).not.toBeNull();
    expect(dialog.dataset.open).toBe('true');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.hasAttribute('inert')).toBe(false);
    expect(document.body.style.overflow).toBe('hidden');
    expect(dialog.querySelectorAll('article.ig-pop__post')).toHaveLength(4);
    expect(
      dialog.querySelectorAll('article.ig-pop__post[data-mounted="true"]').length,
    ).toBeGreaterThan(0);
    expect(dialog.querySelector('.ig-pop__user')!.textContent).toBe('demo');
    expect(dialog.querySelector('.ig-pop__avatar')!.getAttribute('src')).toContain('/avatar?s=');

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(dialog.dataset.open).toBe('false');
    expect(dialog.hasAttribute('inert')).toBe(true);
    expect(document.body.style.overflow).toBe('');
    expect(tile.dataset.igOpen).toBeDefined();
  });

  it('closes with the × of a post', async () => {
    await open();
    const dialog = document.querySelector<HTMLElement>('body > .ig-pop')!;
    dialog.querySelector<HTMLElement>('[data-ig-close]')!.click();
    expect(dialog.dataset.open).toBe('false');
  });

  it('keeps the profile link, the end line and the page behind out of reach when closed', async () => {
    await open();
    const dialog = document.querySelector<HTMLElement>('body > .ig-pop')!;
    expect(dialog.querySelector('.ig-pop__end-link')!.getAttribute('href')).toBe(
      'https://www.instagram.com/demo/',
    );
    expect(dialog.querySelector('.ig-pop__end-link')!.getAttribute('rel')).toBe(
      'noopener noreferrer',
    );
  });

  it('leaves a click with a modifier key to the browser', async () => {
    mockFetch(feedJson(2));
    const root = mountRoot();
    await initInstagramFeed();
    const tile = root.querySelector<HTMLAnchorElement>('a.ig-feed__tile')!;
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      button: 0,
      ctrlKey: true,
    });
    tile.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(document.querySelector('body > .ig-pop')).toBeNull();
  });

  it('does not open for a tile beyond popupLimit', async () => {
    mockFetch(feedJson(4));
    const root = mountRoot({ 'data-ig-popup-limit': '2' });
    await initInstagramFeed();
    const tiles = root.querySelectorAll<HTMLAnchorElement>('a.ig-feed__tile');
    expect(tiles[1]!.hasAttribute('data-ig-open')).toBe(true);
    expect(tiles[2]!.hasAttribute('data-ig-open')).toBe(false);
    expect(root.querySelectorAll('template[data-ig-post]')).toHaveLength(2);
  });

  it('builds a new popup when the feed is rendered again', async () => {
    const { root } = await open();
    expect(document.querySelectorAll('body > .ig-pop')).toHaveLength(1);
    const { instagramFeedAPI } = await import('./index');
    await instagramFeedAPI.refresh(root);
    expect(document.querySelectorAll('body > .ig-pop')).toHaveLength(0);
    root
      .querySelectorAll<HTMLAnchorElement>('a.ig-feed__tile')[0]!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    expect(document.querySelectorAll('body > .ig-pop')).toHaveLength(1);
  });
});

describe('media protection', () => {
  it('cancels the context menu and the drag on the media, not on a link', async () => {
    mockFetch(feedJson(3));
    const root = mountRoot();
    await initInstagramFeed();
    const tile = root.querySelector<HTMLElement>('a.ig-feed__tile')!;
    const menu = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 });
    tile.dispatchEvent(menu);
    expect(menu.defaultPrevented).toBe(true);

    const follow = root.querySelector<HTMLElement>('.ig-feed__follow')!;
    const other = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 });
    follow.dispatchEvent(other);
    expect(other.defaultPrevented).toBe(false);

    const drag = new Event('dragstart', { bubbles: true, cancelable: true });
    tile.querySelector('img')!.dispatchEvent(drag);
    expect(drag.defaultPrevented).toBe(true);
  });
});
