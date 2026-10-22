/**
 * Instagram Feed - standalone module
 *
 * Fills every `[data-ig-feed]` element with a customer's recent Instagram posts, as a tile
 * grid or a one-row carousel. The posts come from the Dreher.Media instagram-connector
 * (`/api/delivery/<slug>/instagram`), pictures included: the visitor's browser talks to the
 * connector and never to Meta, so no consent gate is needed. See README.md.
 */

import { readOptions } from './config';
import { feedUrl, loadFeed } from './feed';
import { renderFeed } from './render';
import { injectStyles } from './styles';
import type { FeedOptions } from './types';

const READY_ATTR = 'igReady';

function mount(root: HTMLElement): Promise<void> {
  const opts = readOptions(root);
  if (!opts) {
    console.warn('[dm-ig-feed] data-ig-slug is missing or invalid, nothing rendered', root);
    return Promise.resolve();
  }
  injectStyles();
  renderFeed(root, { status: 'unavailable', posts: [] }, opts, true);
  return load(root, opts);
}

async function load(root: HTMLElement, opts: FeedOptions): Promise<void> {
  const url = feedUrl(opts.endpoint, opts.slug, opts);
  const feed = await loadFeed(url, opts.endpoint);
  renderFeed(root, feed, opts);
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
