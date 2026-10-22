/**
 * Instagram Feed - standalone module
 *
 * Fills every `[data-ig-feed]` element with a customer's recent Instagram posts, as a tile grid or
 * a one-row carousel; a click on a tile opens the post in a popup built like Instagram's mobile
 * feed, a video tile previews its clip on hover. The posts come from the Dreher.Media
 * instagram-connector (`/api/delivery/<slug>/instagram`), pictures and clips included: the
 * visitor's browser talks to the connector and never to Meta, so no consent gate is needed.
 * It is the Webflow counterpart of `InstagramFeed.astro` in `astro-client-template`. See README.md.
 */

import { readOptions } from './config';
import { feedUrl, loadFeed } from './feed';
import { openPopup, resetPopup } from './popup';
import { initHoverPreview } from './preview';
import {
  CONTEXT_MEDIA,
  CONTROLS,
  DRAG_MEDIA,
  blocksContextMenu,
  isKeyboardContext,
} from './lib/protect';
import { renderFeed } from './render';
import { injectStyles } from './styles';
import type { Feed, FeedOptions } from './types';

const READY_ATTR = 'igReady';
const FINE_POINTER = '(hover: hover) and (pointer: fine)';

let protectionOn = false;

/**
 * Media protection: the normal ways of copying a picture or a clip are closed: no context menu on
 * the media, no dragging them out of the page. The CSS and the attributes do most of it; this is
 * the belt to those braces. It acts on the media only: text, links, buttons and the keyboard's own
 * menu key keep their menus. One listener for the page, however many feeds. A courtesy, not a lock.
 */
function protectMedia(): void {
  if (protectionOn) return;
  protectionOn = true;
  document.addEventListener(
    'contextmenu',
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      const blocked = blocksContextMenu({
        inMedia: target.closest(CONTEXT_MEDIA.join(',')) !== null,
        onControl: target.closest(CONTROLS) !== null,
        // the menu key and Shift+F10 raise it at the focused element
        fromKeyboard: isKeyboardContext(event as MouseEvent & { mozInputSource?: number }),
      });
      if (blocked) event.preventDefault();
    },
    true,
  );
  document.addEventListener(
    'dragstart',
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(DRAG_MEDIA.join(',')) != null) event.preventDefault();
    },
    true,
  );
}

/**
 * The popup. A tile is a link to Instagram until this runs; from here on a plain click opens the
 * popup instead. A click with a modifier key, or a middle click, is the visitor asking for the
 * link, and gets it. One delegated listener per feed, however often it is rendered.
 */
function wirePopup(root: HTMLElement): void {
  root.addEventListener('click', (event) => {
    const tile = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[data-ig-open]');
    if (!tile || !root.contains(tile)) return;
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    let opened = false;
    try {
      // `detail` is 0 for a click the keyboard made (Enter on the link)
      opened = openPopup(root, tile.dataset.igOpen ?? '', tile, event.detail === 0);
    } catch {
      opened = false;
    }
    // this page has no popup for the post: the link still works
    if (!opened) window.open(tile.href, '_blank', 'noopener,noreferrer');
  });
}

/** Everything that needs the finished DOM: the tiles' names, the hover preview. */
function afterRender(root: HTMLElement): void {
  // From now on the tile opens a dialog, not a new tab: say so.
  root.querySelectorAll<HTMLAnchorElement>('a[data-ig-open]').forEach((tile) => {
    tile.setAttribute('aria-haspopup', 'dialog');
    const label = tile.dataset.igPopupLabel;
    if (label) tile.setAttribute('aria-label', label);
  });
  // The preview is only for a page that has a tile with a clip file AND a pointer that can hover.
  if (root.hasAttribute('data-ig-hover-preview') && window.matchMedia(FINE_POINTER).matches) {
    initHoverPreview();
  }
}

function paint(root: HTMLElement, feed: Feed, opts: FeedOptions, loading: boolean): void {
  resetPopup(root);
  renderFeed(root, feed, opts, loading);
  if (opts.protectMedia) protectMedia();
  afterRender(root);
}

function mount(root: HTMLElement): Promise<void> {
  const opts = readOptions(root);
  if (!opts) {
    console.warn('[dm-ig-feed] data-ig-slug is missing or invalid, nothing rendered', root);
    return Promise.resolve();
  }
  injectStyles();
  wirePopup(root);
  paint(root, { status: 'unavailable', posts: [] }, opts, true);
  return load(root, opts);
}

async function load(root: HTMLElement, opts: FeedOptions): Promise<void> {
  const url = feedUrl(opts.endpoint, opts.slug, opts);
  const feed = await loadFeed(url, opts.endpoint, opts.slug);
  paint(root, feed, opts, false);
  root.dispatchEvent(
    new CustomEvent('ig-feed:loaded', { bubbles: true, detail: { status: feed.status } }),
  );
}

/** Initializes every feed under `scope` that is not already set up. Safe to call repeatedly. */
export function initInstagramFeed(scope: ParentNode = document): Promise<void> {
  const pending: Promise<void>[] = [];
  scope.querySelectorAll<HTMLElement>('[data-ig-feed]').forEach((root) => {
    if (root.dataset[READY_ATTR]) return;
    root.dataset[READY_ATTR] = 'true';
    pending.push(mount(root));
  });
  return Promise.all(pending).then(() => undefined);
}

/** Loads one feed again, e.g. after its `data-ig-*` attributes changed. */
function refresh(root: HTMLElement): Promise<void> {
  const opts = readOptions(root);
  if (!opts) return Promise.resolve();
  return load(root, opts);
}

export const instagramFeedAPI = { init: initInstagramFeed, refresh };
