/**
 * Video Players Module - API Loaders
 * Functions for loading external video player APIs.
 *
 * Dailymotion has no loader on purpose: https://api.dmcdn.net/all.js only defines
 * the legacy `DM` SDK, not the `dailymotion.createPlayer` this module calls, so
 * loading it never made that code path work. See startDailymotion().
 *
 * Nothing here runs on page load: the loaders are called from the click
 * handlers in playerManagement.ts (or at DOM ready for elements that opt in
 * with `data-dm-preload`). Each API is requested at most once; concurrent
 * callers share the same promise, and a failed load is forgotten so the next
 * click can try again.
 */

import { discardResource, loadScript, loadStylesheet } from '../../utils/loadResource';

/** How long a click waits for an API before the load counts as failed. */
export const API_LOAD_TIMEOUT_MS = 15000;

const WAIT_INTERVAL_MS = 50;

const YOUTUBE_SRC = 'https://www.youtube.com/iframe_api';
const VIMEO_SRC = 'https://player.vimeo.com/api/player.js';
const PLYR_CSS_SRC = 'https://cdn.plyr.io/3.7.8/plyr.css';
const PLYR_JS_SRC = 'https://cdn.plyr.io/3.7.8/plyr.polyfilled.js';

/**
 * A page that serves Plyr itself includes dist/standalone/plyr.min.js (Plyr, its
 * stylesheet and its icon sprite in one file). The path may be rewritten by a
 * self-hosting step, so match on the file name only.
 */
const PROVIDED_PLYR_SELECTOR = 'script[src*="standalone/plyr"]';

/** How long to wait for a page-provided Plyr script before falling back to the CDN. */
const PROVIDED_PLYR_WAIT_MS = 5000;

type ApiName = 'youtube' | 'vimeo' | 'plyr';

const apiLoads = new Map<ApiName, Promise<void>>();

/**
 * Resolves once `isReady()` is true, rejects after `timeoutMs`.
 * Several of these scripts define their global a moment after their `load` event.
 */
function waitFor(isReady: () => boolean, timeoutMs: number, what: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isReady()) {
      resolve();
      return;
    }
    const startedAt = Date.now();
    const timer = setInterval(() => {
      if (isReady()) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - startedAt >= timeoutMs) {
        clearInterval(timer);
        reject(new Error(`${what} did not become available`));
      }
    }, WAIT_INTERVAL_MS);
  });
}

/**
 * Runs `load` once per API. Rejects (and forgets the attempt) on error or timeout.
 * On timeout `discard` removes the tags of a request that never answered, so the
 * next attempt really requests the file again.
 */
function loadOnce(name: ApiName, load: () => Promise<void>, discard: () => void): Promise<void> {
  const existing = apiLoads.get(name);
  if (existing) return existing;

  const attempt = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      discard();
      reject(new Error(`Timed out loading the ${name} API`));
    }, API_LOAD_TIMEOUT_MS);
    load().then(
      () => {
        clearTimeout(timer);
        resolve();
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });

  apiLoads.set(name, attempt);
  attempt.catch(() => {
    if (apiLoads.get(name) === attempt) apiLoads.delete(name);
  });
  return attempt;
}

const isYouTubeReady = (): boolean => !!window.YT && typeof window.YT.Player === 'function';
const isVimeoReady = (): boolean => !!window.Vimeo && typeof window.Vimeo.Player === 'function';
const isPlyrReady = (): boolean => !!window.Plyr && typeof window.Plyr.setup === 'function';

/**
 * Loads the YouTube iframe API (www.youtube.com/iframe_api).
 */
export function loadYouTubeAPI(): Promise<void> {
  if (isYouTubeReady()) return Promise.resolve();

  return loadOnce(
    'youtube',
    () => {
      return new Promise<void>((resolve, reject) => {
        // iframe_api pulls in a second script and announces itself through this
        // callback; keep whatever handler the page may already have set.
        const previous = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          if (typeof previous === 'function') previous();
          resolve();
        };

        loadScript(YOUTUBE_SRC)
          .then(() => waitFor(isYouTubeReady, API_LOAD_TIMEOUT_MS, 'YT.Player'))
          .then(resolve, reject);
      });
    },
    () => discardResource(YOUTUBE_SRC),
  );
}

/**
 * Loads the Vimeo Player API.
 */
export function loadVimeoAPI(): Promise<void> {
  if (isVimeoReady()) return Promise.resolve();

  return loadOnce(
    'vimeo',
    () =>
      loadScript(VIMEO_SRC).then(() => waitFor(isVimeoReady, API_LOAD_TIMEOUT_MS, 'Vimeo.Player')),
    () => discardResource(VIMEO_SRC),
  );
}

function loadPlyrFromCdn(): Promise<void> {
  return Promise.all([loadStylesheet(PLYR_CSS_SRC), loadScript(PLYR_JS_SRC)]).then(() =>
    waitFor(isPlyrReady, API_LOAD_TIMEOUT_MS, 'Plyr.setup'),
  );
}

/**
 * Waits for the Plyr script the page itself includes. Rejects when that script fails
 * to load or does not define Plyr in time, so the caller can fall back to the CDN.
 */
function waitForProvidedPlyr(script: HTMLScriptElement): Promise<void> {
  return new Promise((resolve, reject) => {
    script.addEventListener('error', () => reject(new Error('Provided Plyr script failed')), {
      once: true,
    });
    waitFor(isPlyrReady, PROVIDED_PLYR_WAIT_MS, 'Provided Plyr').then(resolve, reject);
  });
}

/**
 * Makes Plyr available.
 *
 * Order: a `window.Plyr` that is already there is used as is. If the page includes
 * the bundled standalone/plyr script, its arrival is awaited and no request goes to
 * cdn.plyr.io. Only without either, or when the provided script is broken, Plyr
 * (script and stylesheet) is loaded from the CDN.
 */
export function loadPlyrAPI(): Promise<void> {
  if (isPlyrReady()) return Promise.resolve();

  return loadOnce(
    'plyr',
    () => {
      const provided = document.querySelector<HTMLScriptElement>(PROVIDED_PLYR_SELECTOR);
      if (!provided) return loadPlyrFromCdn();
      return waitForProvidedPlyr(provided).catch(() => loadPlyrFromCdn());
    },
    () => {
      discardResource(PLYR_CSS_SRC, 'stylesheet');
      discardResource(PLYR_JS_SRC);
    },
  );
}

/**
 * Loads the API a video of the given type needs. Types without an API to load
 * (Dailymotion, ARD Mediathek, other) resolve immediately.
 */
export function loadApiForType(type: string | undefined): Promise<void> {
  switch (type) {
    case 'youtube':
      return loadYouTubeAPI();
    case 'vimeo':
      return loadVimeoAPI();
    default:
      return Promise.resolve();
  }
}
