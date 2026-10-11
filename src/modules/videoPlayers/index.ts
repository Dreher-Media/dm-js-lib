/**
 * Video Players Module
 * Handles integration with Plyr, YouTube, Vimeo, Dailymotion, ARD Mediathek, and other (open in new tab)
 * Manages autoplay and pause functionality across multiple players
 *
 * No third-party script or stylesheet is requested while the page loads. Each
 * platform API is fetched by the click on the first video that needs it (see
 * playerManagement.ts), unless an element opts out with `data-dm-preload`.
 */

import { initializePlyrPlayers, initializePlayers, pauseAllPlayers } from './playerManagement';
import { initYouTubeThumbnails } from './thumbnails';
import type { PlayerInstance } from './types';

let players: Record<string, PlayerInstance> = {};
let plyrPlayers: Plyr[] = [];

export function initVideoPlayers(): void {
  // Initialize YouTube thumbnail upgrades
  initYouTubeThumbnails();

  const setup = (): void => {
    // Bind click handlers; the platform APIs are loaded from those handlers
    initializePlayers(document.querySelectorAll('.youtube'), players, plyrPlayers);
    initializePlyrPlayers(plyrPlayers, players);

    // Set up Swiper integration
    const swipers = typeof window !== 'undefined' ? window.videoSwipers : undefined;
    if (swipers) {
      swipers.forEach((swiper) => {
        swiper.on('slideChange', () => {
          pauseAllPlayers(null, plyrPlayers, players);
        });
      });
    }

    window.dmReinitVideoPlayers = (container: HTMLElement) => {
      const elements = container.querySelectorAll<Element>('.youtube');
      initializePlayers(elements, players, plyrPlayers);
      initializePlyrPlayers(plyrPlayers, players, container);
    };
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
}
