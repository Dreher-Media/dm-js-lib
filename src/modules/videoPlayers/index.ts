/**
 * Video Players Module
 * Handles integration with Plyr, YouTube, Vimeo, Dailymotion, ARD Mediathek, and other (open in new tab)
 * Manages autoplay and pause functionality across multiple players
 *
 * No third-party script or stylesheet is requested while the page loads. Each
 * platform API is fetched by the click on the first video that needs it (see
 * playerManagement.ts), unless an element opts out with `data-dm-preload`.
 */

import { hookVideoSwipers, initializePlayers, initializePlyrPlayers } from './playerManagement';
import { initYouTubeThumbnails } from './thumbnails';
import type { PlayerInstance } from './types';

let players: Record<string, PlayerInstance> = {};
let plyrPlayers: Plyr[] = [];

const PLAYER_SELECTOR = '.youtube, ._init-plyr';

/**
 * Binds `.youtube` and `._init-plyr` elements at or below `root`.
 * Safe to call repeatedly: bound elements are skipped.
 */
function bindWithin(root: HTMLElement | Document): void {
  const youtubeElements: Element[] = Array.from(root.querySelectorAll('.youtube'));
  if (root instanceof HTMLElement && root.matches('.youtube')) youtubeElements.unshift(root);
  initializePlayers(youtubeElements, players, plyrPlayers);

  if (root instanceof HTMLElement && root.matches('._init-plyr')) {
    // initializePlyrPlayers looks below its root, so hand it the parent
    initializePlyrPlayers(plyrPlayers, players, root.parentElement ?? root);
  } else {
    initializePlyrPlayers(plyrPlayers, players, root);
  }
}

/**
 * Binds players that are inserted after the page was ready (CMS nests,
 * Finsweet, client scripts), which used to need a manual dmReinitVideoPlayers().
 */
function observeLateElements(): void {
  if (typeof MutationObserver === 'undefined' || !document.body) return;

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.matches(PLAYER_SELECTOR) || node.querySelector(PLAYER_SELECTOR)) {
          bindWithin(node);
        }
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

export function initVideoPlayers(): void {
  // Initialize YouTube thumbnail upgrades
  initYouTubeThumbnails();

  // Pages push their Swipers into window.videoSwipers at their own pace; hook
  // the ones present now, again at DOMContentLoaded and window load, and at
  // every video start (see onPlay).
  const hookSwipers = (): void => hookVideoSwipers(plyrPlayers, players);

  const setup = (): void => {
    // Bind click handlers; the platform APIs are loaded from those handlers
    bindWithin(document);
    hookSwipers();
    observeLateElements();

    window.dmReinitVideoPlayers = (container: HTMLElement) => {
      bindWithin(container);
    };
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    // Loaded with defer/async or injected late: DOMContentLoaded may still be
    // ahead of us (readyState "interactive"), so hook Swipers again then.
    setup();
    document.addEventListener('DOMContentLoaded', hookSwipers);
  }
  window.addEventListener('load', hookSwipers);
}
