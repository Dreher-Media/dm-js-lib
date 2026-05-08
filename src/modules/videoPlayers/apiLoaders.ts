/**
 * Video Players Module - API Loaders
 * Functions for loading external video player APIs
 */

import { loadScript, loadStylesheet } from '../../utils/loadResource';

/**
 * Checks if at least one player of the specified type exists on the page
 */
export function hasPlayersOfType(
  type: 'youtube' | 'vimeo' | 'dailymotion' | 'ardmediathek' | 'other',
): boolean {
  const elements = document.querySelectorAll('.youtube');
  return Array.from(elements).some((el) => (el as HTMLElement).dataset.type === type);
}

/**
 * Loads YouTube iframe API
 * Note: The onYouTubeIframeAPIReady callback must be set up before calling this
 */
export function loadYouTubeAPI(): Promise<void> {
  // Check if already loaded
  if (window.YT && typeof window.YT.Player === 'function') {
    return Promise.resolve();
  }

  return loadScript('https://www.youtube.com/iframe_api').catch((error) => {
    console.error('Failed to load YouTube API:', error);
  });
}

/**
 * Loads Vimeo Player API
 */
export function loadVimeoAPI(): Promise<void> {
  // Check if already loaded
  if (window.Vimeo && typeof window.Vimeo.Player === 'function') {
    return Promise.resolve();
  }

  return loadScript('https://player.vimeo.com/api/player.js').catch((error) => {
    console.error('Failed to load Vimeo API:', error);
  });
}

/**
 * Loads Dailymotion Player API
 */
export function loadDailymotionAPI(): Promise<void> {
  // Check if already loaded
  if (window.dailymotion && typeof window.dailymotion.createPlayer === 'function') {
    return Promise.resolve();
  }

  return loadScript('https://api.dmcdn.net/all.js').catch((error) => {
    console.error('Failed to load Dailymotion API:', error);
  });
}

/**
 * Checks if Plyr players exist on the page
 */
export function hasPlyrPlayers(): boolean {
  return document.querySelectorAll('._init-plyr').length > 0;
}

/**
 * Loads Plyr library and stylesheet from CDN
 */
export function loadPlyrAPI(): Promise<void> {
  // Check if already loaded
  if (window.Plyr && typeof window.Plyr.setup === 'function') {
    return Promise.resolve();
  }

  // Load both CSS and JS in parallel
  return Promise.all([
    loadStylesheet('https://cdn.plyr.io/3.7.8/plyr.css'),
    loadScript('https://cdn.plyr.io/3.7.8/plyr.polyfilled.js'),
  ])
    .then(() => {
      // Both resources loaded successfully
    })
    .catch((error) => {
      console.error('Failed to load Plyr resources:', error);
      throw error;
    });
}
