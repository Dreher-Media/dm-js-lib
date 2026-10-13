// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Every `new Image()` the module makes is a request a browser would send. The
// stub records the address instead and answers "too small", so the module walks
// through the whole size list.
const requested: string[] = [];

beforeEach(() => {
  requested.length = 0;
  vi.resetModules();
  vi.stubGlobal(
    'Image',
    class {
      naturalWidth = 0;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(value: string) {
        requested.push(value);
        queueMicrotask(() => this.onerror?.());
      }
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

async function run(html: string): Promise<void> {
  document.body.innerHTML = html;
  const { initYouTubeThumbnails } = await import('./thumbnails');
  initYouTubeThumbnails();
  document.dispatchEvent(new Event('DOMContentLoaded'));
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

const thumb = (src: string) => `<div class="youtube"><img alt="" src="${src}"></div>`;

describe('initYouTubeThumbnails', () => {
  it('looks for a better size for an image that is served by YouTube', async () => {
    await run(thumb('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'));
    expect(requested.length).toBeGreaterThan(0);
    expect(requested.every((src) => src.startsWith('https://img.youtube.com/'))).toBe(true);
  });

  it('does the same for i.ytimg.com', async () => {
    await run(thumb('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'));
    expect(requested.length).toBeGreaterThan(0);
  });

  it('leaves a thumbnail alone that the build copied to the site itself', async () => {
    await run(thumb('/libs/img.youtube.com/vi/dQw4w9WgXcQ/hqdefault-263dedc0.jpg'));
    expect(requested).toEqual([]);
  });

  it('leaves any other image alone', async () => {
    await run(thumb('/thumb.jpg') + thumb('https://cdn.dreher-media.de/a/maxresdefault.jpg'));
    expect(requested).toEqual([]);
  });
});
