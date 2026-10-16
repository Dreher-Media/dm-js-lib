/**
 * Instagram Feed - Standalone Entry Point
 * Renders a customer's Instagram posts from the Dreher.Media instagram-connector
 * into any element marked `data-ig-feed`. Auto-initializes when the DOM is ready.
 */

import { initInstagramFeed } from './instagramFeed/index';

export { initInstagramFeed, instagramFeedAPI } from './instagramFeed/index';

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initInstagramFeed(), { once: true });
  } else {
    initInstagramFeed();
  }
}
