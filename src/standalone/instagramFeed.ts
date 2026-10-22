/**
 * Instagram Feed - Standalone Entry Point
 * Renders a customer's Instagram posts from the Dreher.Media instagram-connector
 * into any element marked `data-ig-feed`. Auto-initializes when the DOM is ready.
 */

import { initInstagramFeed } from './instagramFeed/index';

export { initInstagramFeed, instagramFeedAPI } from './instagramFeed/index';

if (typeof document !== 'undefined') {
  // Render at once what is already in the page, placeholders included, so the space is reserved as
  // early as possible; whatever comes after the script is picked up when the DOM is complete.
  initInstagramFeed();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initInstagramFeed(), { once: true });
  }
}
