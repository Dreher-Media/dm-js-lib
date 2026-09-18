// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { activateTab } from './core';
import { initTabs } from './index';
import { findTabContents } from './utils';

// Two groups sharing the content value "video": the main "media" group and the
// "press" sub-tabs nested inside the press panel (mirrors a real client page).
const nestedGroups = (options: { mainActive?: string; pressAttrs?: string } = {}) => `
  <div data-tab-group="media" data-tab-link="video" class="${options.mainActive === 'video' ? 'active' : ''}"></div>
  <div data-tab-group="media" data-tab-link="press" class="${options.mainActive === 'press' ? 'active' : ''}"></div>
  <div id="media-video" data-tab-group="media" data-tab-content="video"></div>
  <div id="media-press" data-tab-group="media" data-tab-content="press">
    <div data-tab-group="press" ${options.pressAttrs ?? ''}>
      <div data-tab-group="press" data-tab-link="print"></div>
      <div data-tab-group="press" data-tab-link="video"></div>
    </div>
    <div id="press-print" data-tab-group="press" data-tab-content="print"></div>
    <div id="press-video" data-tab-group="press" data-tab-content="video"></div>
  </div>
`;

const byId = (id: string) => document.getElementById(id) as HTMLElement;
const link = (group: string, value: string) =>
  document.querySelector(`[data-tab-link="${value}"][data-tab-group="${group}"]`) as HTMLElement;
const isShown = (id: string) =>
  byId(id).style.display === 'block' && byId(id).classList.contains('active');
const isHidden = (id: string) =>
  byId(id).style.display === 'none' && !byId(id).classList.contains('active');

// initTabs defers to DOMContentLoaded; capture that handler and run it directly so
// handlers from earlier tests don't pile up on the shared document.
function runInitTabs(): void {
  const spy = vi.spyOn(document, 'addEventListener');
  initTabs();
  const call = spy.mock.calls.find(([type]) => type === 'DOMContentLoaded');
  spy.mockRestore();
  (call?.[1] as () => void)();
}

afterEach(() => {
  document.body.innerHTML = '';
  window.history.replaceState({}, '', '/');
});

describe('findTabContents', () => {
  it('prefers panels in the given group', () => {
    document.body.innerHTML = nestedGroups();
    expect(findTabContents('video', 'press')).toEqual([byId('press-video')]);
    expect(findTabContents('video', 'media')).toEqual([byId('media-video')]);
  });

  it('falls back to every panel with the value when none carries the group', () => {
    document.body.innerHTML = `
      <div id="a" data-tab-content="video"></div>
      <div id="b" data-tab-content="video"></div>
    `;
    expect(findTabContents('video', 'press')).toEqual([byId('a'), byId('b')]);
    expect(findTabContents('video')).toEqual([byId('a'), byId('b')]);
  });
});

describe('two tab groups sharing a content value', () => {
  it('activating one group leaves the other group’s same-named panel alone', () => {
    document.body.innerHTML = nestedGroups();
    activateTab(link('media', 'video'));
    expect(isShown('media-video')).toBe(true);

    activateTab(link('press', 'print'));
    expect(isShown('press-print')).toBe(true);
    expect(isHidden('press-video')).toBe(true);
    expect(isShown('media-video')).toBe(true);

    activateTab(link('press', 'video'));
    expect(isShown('press-video')).toBe(true);
    expect(isHidden('press-print')).toBe(true);
    expect(isShown('media-video')).toBe(true);
    expect(link('media', 'video').classList.contains('active')).toBe(true);
  });

  it('activating the main tab does not show the sub-tab panel of the same name', () => {
    document.body.innerHTML = nestedGroups();
    activateTab(link('press', 'print'));
    activateTab(link('media', 'video'));
    expect(isShown('media-video')).toBe(true);
    expect(isHidden('media-press')).toBe(true);
    expect(isShown('press-print')).toBe(true);
    expect(byId('press-video').style.display).not.toBe('block');
  });

  it('initialising the sub-group via data-tab-first-active keeps the main panel visible', () => {
    document.body.innerHTML = nestedGroups({
      mainActive: 'video',
      pressAttrs: 'data-tab-first-active',
    });
    runInitTabs();
    expect(isShown('media-video')).toBe(true);
    expect(isHidden('media-press')).toBe(true);
    expect(isShown('press-print')).toBe(true);
    expect(isHidden('press-video')).toBe(true);
  });

  it('initial .active links in both groups each resolve their own panel', () => {
    document.body.innerHTML = nestedGroups({ mainActive: 'video' });
    link('press', 'print').classList.add('active');
    runInitTabs();
    expect(isShown('media-video')).toBe(true);
    expect(isShown('press-print')).toBe(true);
    expect(isHidden('press-video')).toBe(true);

    link('press', 'video').click();
    expect(isShown('press-video')).toBe(true);
    expect(isShown('media-video')).toBe(true);
  });

  it('an initial .active main tab does not show the sub-tab panel of the same name', () => {
    document.body.innerHTML = nestedGroups({ mainActive: 'video' });
    runInitTabs();
    expect(isShown('media-video')).toBe(true);
    expect(byId('press-video').style.display).toBe('');
    expect(byId('press-video').classList.contains('active')).toBe(false);
  });

  it('?tab=&tabGroup= activates only the named group’s panel', () => {
    document.body.innerHTML = nestedGroups();
    byId('media-video').style.display = 'block';
    window.history.replaceState({}, '', '/?tab=video&tabGroup=press');
    runInitTabs();
    expect(isShown('press-video')).toBe(true);
    expect(isHidden('press-print')).toBe(true);
    expect(byId('media-video').style.display).toBe('block');
    expect(byId('media-video').classList.contains('active')).toBe(false);
    expect(link('press', 'video').classList.contains('active')).toBe(true);
    expect(link('media', 'video').classList.contains('active')).toBe(false);
  });
});

describe('backwards compatibility', () => {
  it('grouped links still resolve panels that lack data-tab-group', () => {
    document.body.innerHTML = `
      <div data-tab-group="products" data-tab-link="one"></div>
      <div data-tab-group="products" data-tab-link="two"></div>
      <div id="one" data-tab-content="one"></div>
      <div id="two" data-tab-content="two"></div>
    `;
    activateTab(link('products', 'two'));
    expect(isShown('two')).toBe(true);
    expect(isHidden('one')).toBe(true);

    activateTab(link('products', 'one'));
    expect(isShown('one')).toBe(true);
    expect(isHidden('two')).toBe(true);
  });

  it('ungrouped tabs keep the parent-based behaviour', () => {
    document.body.innerHTML = `
      <div><a class="tab-link" data-tab-target="one"></a><a class="tab-link" data-tab-target="two"></a></div>
      <div id="one" data-tab-content="one"></div>
      <div id="two" data-tab-content="two"></div>
    `;
    const [first, second] = Array.from(document.querySelectorAll<HTMLElement>('.tab-link'));
    activateTab(second);
    expect(isShown('two')).toBe(true);
    expect(isHidden('one')).toBe(true);
    activateTab(first);
    expect(isShown('one')).toBe(true);
    expect(isHidden('two')).toBe(true);
  });
});
