// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Every test gets a fresh module graph: the API cache, the player key counter
// and the "active player" are module state.
async function setup(html: string) {
  vi.resetModules();
  document.head.innerHTML = '';
  document.body.innerHTML = html;
  const mod = await import('./index');
  mod.initVideoPlayers();
  return mod;
}

const youtubeHtml = (id = 'abc123', extra = '') =>
  `<div class="youtube" data-type="youtube" data-video-id="${id}" data-time="5" ${extra}><img alt="" src="/thumb.jpg"></div>`;
const vimeoHtml = (id = '123456', extra = '') =>
  `<div class="youtube" data-type="vimeo" data-video-id="${id}" ${extra}><img alt="" src="/thumb.jpg"></div>`;
const dailymotionHtml = (id = 'x7abc', extra = '') =>
  `<div class="youtube" data-type="dailymotion" data-video-id="${id}" ${extra}><img alt="" src="/thumb.jpg"></div>`;

const scripts = (): HTMLScriptElement[] =>
  Array.from(document.querySelectorAll<HTMLScriptElement>('script[src]'));
const links = (): HTMLLinkElement[] =>
  Array.from(document.querySelectorAll<HTMLLinkElement>('link[href]'));
const thirdPartyRequests = (): string[] => [
  ...scripts().map((s) => s.src),
  ...links().map((l) => l.href),
];
const click = (el: Element): void => {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};
const flush = async (): Promise<void> => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};
const fire = (script: HTMLScriptElement | HTMLLinkElement, type: 'load' | 'error'): void => {
  const handler = type === 'load' ? script.onload : script.onerror;
  handler?.call(script, new Event(type));
};

function resetGlobals(): void {
  const w = window as unknown as Record<string, unknown>;
  ['YT', 'Vimeo', 'dailymotion', 'Plyr', 'onYouTubeIframeAPIReady'].forEach((key) => {
    delete w[key];
  });
  window.videoSwipers = [];
}

beforeEach(() => {
  resetGlobals();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('no third-party request before the first click', () => {
  it('adds no script, stylesheet or iframe for any platform on init', async () => {
    await setup(`
      ${youtubeHtml()}
      ${vimeoHtml()}
      ${dailymotionHtml()}
      <video class="_init-plyr" controls><source src="/v.mp4" type="video/mp4"></video>
    `);
    expect(thirdPartyRequests()).toEqual([]);
    expect(document.querySelectorAll('iframe')).toHaveLength(0);
    expect(window.dmReinitVideoPlayers).toBeTypeOf('function');
  });

  it('still adds nothing when the thumbnail upgrade runs', async () => {
    await setup(youtubeHtml());
    document.dispatchEvent(new Event('DOMContentLoaded'));
    expect(thirdPartyRequests()).toEqual([]);
  });
});

describe('YouTube', () => {
  it('creates the iframe inside the click with autoplay, then loads the API once', async () => {
    await setup(youtubeHtml('dQw4w9WgXcQ') + youtubeHtml('other11chars'));
    const [first] = Array.from(document.querySelectorAll('.youtube'));

    click(first);
    // Synchronous: the iframe exists before any script has loaded.
    const iframe = first.querySelector('iframe')!;
    expect(iframe).toBeTruthy();
    const src = new URL(iframe.src);
    expect(src.origin + src.pathname).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
    expect(src.searchParams.get('autoplay')).toBe('1');
    expect(src.searchParams.get('start')).toBe('5');
    expect(src.searchParams.get('enablejsapi')).toBe('1');
    expect(iframe.getAttribute('allow')).toContain('autoplay');
    expect(first.querySelector('img')).toBeNull();

    expect(scripts().map((s) => s.src)).toEqual(['https://www.youtube.com/iframe_api']);

    // A second click on the same video and a click on another one: still one script.
    click(first);
    click(document.querySelectorAll('.youtube')[1]);
    expect(scripts()).toHaveLength(1);
    expect(first.querySelectorAll('iframe')).toHaveLength(1);
  });

  it('attaches YT.Player to the existing iframe once the API is ready, exactly once', async () => {
    await setup(youtubeHtml());
    const el = document.querySelector('.youtube')!;
    const Player = vi.fn();
    click(el);
    click(el);

    (window as unknown as { YT: unknown }).YT = {
      Player,
      PlayerState: { PLAYING: 1, PAUSED: 2, ENDED: 0 },
    };
    window.onYouTubeIframeAPIReady?.();
    await flush();

    expect(Player).toHaveBeenCalledTimes(1);
    expect(Player.mock.calls[0][0]).toBe(el.querySelector('iframe'));
  });

  it('keeps the video playing and stays usable when the API fails to load', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await setup(youtubeHtml());
    const el = document.querySelector('.youtube')!;
    click(el);
    fire(scripts()[0], 'error');
    await flush();

    expect(el.querySelector('iframe')).toBeTruthy();
    expect((el as HTMLElement).dataset.dmPlayerState).toBe('active');
    expect(warn).toHaveBeenCalled();
    // The dead tag is gone so a later load can request the file again.
    expect(scripts()).toHaveLength(0);
  });

  it('pauses a player whose API arrives after another video was started', async () => {
    await setup(youtubeHtml('first00000') + vimeoHtml('555'));
    const [yt, vimeo] = Array.from(document.querySelectorAll('.youtube'));
    const pauseVideo = vi.fn();
    let onReady: ((e: { target: unknown }) => void) | undefined;
    const Player = vi.fn(function (_el: unknown, config: { events: { onReady: typeof onReady } }) {
      onReady = config.events.onReady;
    });
    (window as unknown as { YT: unknown }).YT = {
      Player,
      PlayerState: { PLAYING: 1, PAUSED: 2, ENDED: 0 },
    };

    click(yt);
    click(vimeo); // starts while the YouTube API is still loading
    window.onYouTubeIframeAPIReady?.();
    await flush();
    onReady?.({ target: { pauseVideo } });

    expect(pauseVideo).toHaveBeenCalledTimes(1);
  });
});

describe('YouTube playVideo on ready', () => {
  async function ready(state: number) {
    await setup(youtubeHtml());
    const el = document.querySelector('.youtube')!;
    const playVideo = vi.fn();
    const pauseVideo = vi.fn();
    let onReady: ((e: { target: unknown }) => void) | undefined;
    const Player = vi.fn(function (_el: unknown, config: { events: { onReady: typeof onReady } }) {
      onReady = config.events.onReady;
    });
    (window as unknown as { YT: unknown }).YT = {
      Player,
      PlayerState: { PLAYING: 1, PAUSED: 2, ENDED: 0 },
    };
    click(el);
    window.onYouTubeIframeAPIReady?.();
    await flush();
    onReady?.({ target: { playVideo, pauseVideo, getPlayerState: () => state } });
    return { playVideo, pauseVideo };
  }

  it('calls playVideo() when the player has not started (autoplay refused)', async () => {
    const { playVideo, pauseVideo } = await ready(-1);
    expect(playVideo).toHaveBeenCalledTimes(1);
    expect(pauseVideo).not.toHaveBeenCalled();
  });

  it('leaves a player alone that is already playing or was paused on purpose', async () => {
    expect((await ready(1)).playVideo).not.toHaveBeenCalled();
    expect((await ready(2)).playVideo).not.toHaveBeenCalled();
  });
});

describe('Vimeo', () => {
  it('creates the iframe in the click and binds Vimeo.Player to it after load', async () => {
    await setup(vimeoHtml('987654'));
    const el = document.querySelector('.youtube')!;
    click(el);
    click(el);

    const iframe = el.querySelector('iframe')!;
    expect(iframe.src).toBe('https://player.vimeo.com/video/987654?autoplay=1');
    expect(scripts().map((s) => s.src)).toEqual(['https://player.vimeo.com/api/player.js']);

    const on = vi.fn();
    const Player = vi.fn(function () {
      return { on, pause: vi.fn() };
    });
    (window as unknown as { Vimeo: unknown }).Vimeo = { Player };
    fire(scripts()[0], 'load');
    await flush();

    expect(Player).toHaveBeenCalledTimes(1);
    expect(Player).toHaveBeenCalledWith(iframe);
    expect(on).toHaveBeenCalledWith('play', expect.any(Function));
  });

  it('maps unlisted ids and start time', async () => {
    const { vimeoEmbedUrl } = await import('./playerManagement');
    expect(vimeoEmbedUrl('123/abcdef', 30)).toBe(
      'https://player.vimeo.com/video/123?h=abcdef&autoplay=1#t=30s',
    );
  });
});

describe('Dailymotion', () => {
  it('uses a plain autoplay embed and loads no script when the page has no player library', async () => {
    await setup(dailymotionHtml('x7abc'));
    const el = document.querySelector('.youtube') as HTMLElement;

    click(el);
    click(el);

    const iframes = el.querySelectorAll('iframe');
    expect(iframes).toHaveLength(1);
    expect(iframes[0].src).toContain('https://www.dailymotion.com/embed/video/x7abc');
    expect(iframes[0].src).toContain('autoplay=1');
    expect(scripts()).toHaveLength(0);
  });

  it('uses dailymotion.createPlayer when the page provides it, exactly once', async () => {
    await setup(dailymotionHtml());
    const el = document.querySelector('.youtube') as HTMLElement;
    const on = vi.fn();
    const createPlayer = vi.fn(() => Promise.resolve({ on, play: vi.fn(), pause: vi.fn() }));
    (window as unknown as { dailymotion: unknown }).dailymotion = { createPlayer };

    click(el);
    click(el);
    await flush();

    expect(createPlayer).toHaveBeenCalledTimes(1);
    expect(on).toHaveBeenCalledWith('play', expect.any(Function));
    expect(scripts()).toHaveLength(0);
  });

  it('falls back to the plain embed when createPlayer rejects', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await setup(dailymotionHtml('x7abc'));
    const el = document.querySelector('.youtube') as HTMLElement;
    const createPlayer = vi.fn(() => Promise.reject(new Error('nope')));
    (window as unknown as { dailymotion: unknown }).dailymotion = { createPlayer };

    click(el);
    await flush();

    expect(el.querySelector('iframe')!.src).toContain('dailymotion.com/embed/video/x7abc');
  });
});

describe('API cache', () => {
  it('shares one load between videos of different elements and reuses it afterwards', async () => {
    await setup(vimeoHtml('1') + vimeoHtml('2'));
    const [a, b] = Array.from(document.querySelectorAll('.youtube'));
    click(a);
    click(b);
    expect(scripts()).toHaveLength(1);

    (window as unknown as { Vimeo: unknown }).Vimeo = {
      Player: vi.fn(function () {
        return { on: vi.fn(), pause: vi.fn() };
      }),
    };
    fire(scripts()[0], 'load');
    await flush();

    // Third video later: API already there, no new script.
    document.body.insertAdjacentHTML('beforeend', vimeoHtml('3'));
    window.dmReinitVideoPlayers!(document.body);
    click(document.querySelectorAll('.youtube')[2]);
    await flush();
    expect(scripts()).toHaveLength(1);
    expect(window.Vimeo!.Player).toHaveBeenCalledTimes(3);
  });

  it('retries on the next click after a failed load', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await setup(vimeoHtml('1') + vimeoHtml('2'));
    const [a, b] = Array.from(document.querySelectorAll('.youtube'));

    click(a);
    fire(scripts()[0], 'error');
    await flush();
    expect(scripts()).toHaveLength(0);

    click(b);
    expect(scripts().map((s) => s.src)).toEqual(['https://player.vimeo.com/api/player.js']);
  });
});

describe('dmReinitVideoPlayers', () => {
  it('binds late-added videos lazily and is idempotent', async () => {
    await setup('<div id="late"></div>');
    const late = document.getElementById('late')!;
    late.innerHTML = vimeoHtml('42');

    window.dmReinitVideoPlayers!(late);
    window.dmReinitVideoPlayers!(late);
    expect(thirdPartyRequests()).toEqual([]);

    click(late.querySelector('.youtube')!);
    expect(late.querySelectorAll('iframe')).toHaveLength(1);
    expect(scripts()).toHaveLength(1);
  });
});

describe('Plyr', () => {
  const videoHtml = (extra = '') =>
    `<video class="_init-plyr" controls ${extra}><source src="/v.mp4" type="video/mp4"></video>`;

  it('loads Plyr (script and stylesheet) on the first click, once', async () => {
    await setup(videoHtml() + videoHtml());
    const [first, second] = Array.from(document.querySelectorAll('video'));

    click(first);
    click(first);
    click(second);

    expect(scripts().map((s) => s.src)).toEqual(['https://cdn.plyr.io/3.7.8/plyr.polyfilled.js']);
    expect(links().map((l) => l.href)).toEqual(['https://cdn.plyr.io/3.7.8/plyr.css']);

    const on = vi.fn();
    const setupFn = vi.fn((targets: Element[]) =>
      targets.map(() => ({ on, play: vi.fn(), pause: vi.fn() })),
    );
    (window as unknown as { Plyr: unknown }).Plyr = { setup: setupFn };
    fire(links()[0], 'load');
    fire(scripts()[0], 'load');
    await flush();

    // Both videos were clicked while loading; each is wrapped exactly once.
    expect(setupFn).toHaveBeenCalledTimes(2);
    expect(setupFn.mock.calls.map((call) => call[0])).toEqual([[first], [second]]);
    click(first);
    click(second);
    await flush();
    expect(setupFn).toHaveBeenCalledTimes(2);
    expect(scripts()).toHaveLength(1);
  });

  it('does not load Plyr for a play event without user activation (autoplay)', async () => {
    await setup(videoHtml('autoplay muted'));
    document.querySelector('video')!.dispatchEvent(new Event('play'));
    expect(thirdPartyRequests()).toEqual([]);
  });

  it('keeps the native player and allows a retry when Plyr fails to load', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await setup(videoHtml());
    const video = document.querySelector('video')!;

    click(video);
    fire(scripts()[0], 'error');
    await flush();
    expect(video.dataset.dmPlyrBound).toBeUndefined();

    click(video);
    expect(scripts().map((s) => s.src)).toEqual(['https://cdn.plyr.io/3.7.8/plyr.polyfilled.js']);
  });
});

describe('data-dm-preload (opt-out)', () => {
  it('loads the API at init for opted-in elements only', async () => {
    await setup(vimeoHtml('1', 'data-dm-preload') + youtubeHtml());
    expect(scripts().map((s) => s.src)).toEqual(['https://player.vimeo.com/api/player.js']);
  });

  it('treats data-dm-preload="false" as off', async () => {
    await setup(vimeoHtml('1', 'data-dm-preload="false"'));
    expect(thirdPartyRequests()).toEqual([]);
  });

  it('wraps opted-in Plyr elements without a click', async () => {
    await setup('<video class="_init-plyr" data-dm-preload controls></video>');
    expect(scripts().map((s) => s.src)).toEqual(['https://cdn.plyr.io/3.7.8/plyr.polyfilled.js']);
  });
});

describe('types without a script', () => {
  it('ARD Mediathek embeds on click without any script', async () => {
    await setup(
      '<div class="youtube" data-type="ardmediathek" data-video-id="abc"><img alt="" src="/t.jpg"></div>',
    );
    click(document.querySelector('.youtube')!);
    expect(document.querySelector('iframe')!.src).toBe('https://www.ardmediathek.de/embed/abc');
    expect(scripts()).toHaveLength(0);
  });
});
