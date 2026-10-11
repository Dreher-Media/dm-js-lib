/**
 * Video Players Module - Player Management
 * Functions for initializing and managing video players
 *
 * Privacy: nothing in here talks to a third party before the visitor clicks a
 * video. The platform APIs (YouTube, Vimeo, Dailymotion, Plyr) are loaded by
 * the click handlers, once, and cached afterwards. See README "Privacy".
 */

import { loadApiForType, loadPlyrAPI, loadVimeoAPI, loadYouTubeAPI } from './apiLoaders';
import type { PlayerInstance } from './types';

// Initialize global videoSwipers array on window object
if (typeof window !== 'undefined' && typeof window.videoSwipers === 'undefined') {
  window.videoSwipers = [];
}

// Monotonic counter so the same video can appear multiple times on a page
// without colliding on data-id-based keys or duplicate DOM ids.
let playerKeyCounter = 0;

// Key of the player that was started last (null: a Plyr player, or a slide
// change, took over). A player whose API finishes loading after another video
// has started must not keep playing, so it checks this when it becomes ready.
let activePlayerId: string | null = null;

// Create a reference to window.videoSwipers for direct access
// This allows the code to use videoSwipers directly while it's actually stored on window
const getVideoSwipers = (): Swiper[] | undefined => {
  return typeof window !== 'undefined' ? window.videoSwipers : undefined;
};

type PlayerType = PlayerInstance['type'];

/** Lifecycle of a `.youtube` element, mirrored in `data-dm-player-state`. */
type PlayerState = 'idle' | 'active';

// YT.PlayerState values that mean "the visitor has already decided": playing,
// or paused/ended on purpose. Anything else (unstarted, buffering, cued) is
// still on its way to playing.
const YT_STATES_SETTLED = [1, 2, 0];

const YOUTUBE_ALLOW =
  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
const VIMEO_ALLOW =
  'autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share';
const DAILYMOTION_ALLOW = 'autoplay; fullscreen; picture-in-picture';

/**
 * `data-dm-preload` on a `.youtube` or `._init-plyr` element opts out of
 * load-on-click: the API is requested as soon as the page is ready (the
 * previous behavior). The visitor's IP then reaches the provider without a
 * click, so the site must gate this on consent itself.
 */
export function isPreloadRequested(el: HTMLElement): boolean {
  const value = el.getAttribute('data-dm-preload');
  return value !== null && value !== 'false';
}

function setPlayerState(el: HTMLElement, state: PlayerState): void {
  el.dataset.dmPlayerState = state;
}

function stopSwiperAutoplay(): void {
  const swipers = getVideoSwipers();
  if (swipers) {
    swipers.forEach((swiper) => {
      swiper.autoplay.stop();
    });
  }
}

function startSwiperAutoplay(): void {
  const swipers = getVideoSwipers();
  if (swipers) {
    swipers.forEach((swiper) => {
      swiper.autoplay.start();
    });
  }
}

/**
 * Handles a Plyr player starting: pause everything else, stop Swiper autoplay
 */
function onPlyrPlay(
  plyrPlayer: Plyr,
  plyrPlayers: Plyr[],
  players: Record<string, PlayerInstance>,
): void {
  pauseAllPlayers(null, plyrPlayers, players, plyrPlayer);
  stopSwiperAutoplay();
}

/**
 * True when the browser says a user gesture is behind the current event.
 * Used to tell a visitor pressing play from a muted `autoplay` video that
 * starts on its own (which must not pull in Plyr from the CDN).
 */
function isUserActive(): boolean {
  const activation = (navigator as Navigator & { userActivation?: { isActive: boolean } })
    .userActivation;
  return !!activation && activation.isActive;
}

/**
 * Loads Plyr and wraps one element. The element keeps working natively until
 * then; if it was playing when Plyr is ready, playback is resumed (moving the
 * element into Plyr's wrapper pauses it).
 */
function activatePlyr(
  el: HTMLElement,
  plyrPlayers: Plyr[],
  players: Record<string, PlayerInstance>,
): Promise<void> {
  if (el.dataset.dmPlyrBound === 'true' || el.dataset.dmPlyrLoading === 'true') {
    return Promise.resolve();
  }
  el.dataset.dmPlyrLoading = 'true';

  return loadPlyrAPI().then(
    () => {
      delete el.dataset.dmPlyrLoading;
      if (el.dataset.dmPlyrBound === 'true' || !window.Plyr) return;

      const media = el instanceof HTMLMediaElement ? el : null;
      const wasPlaying = !!media && !media.paused;

      el.dataset.dmPlyrBound = 'true';
      const setupPlayers = window.Plyr.setup([el]);
      if (!setupPlayers) return;

      const newPlayers = Array.isArray(setupPlayers) ? setupPlayers : [setupPlayers];
      plyrPlayers.push(...newPlayers);

      newPlayers.forEach((plyrPlayer) => {
        plyrPlayer.on('play', () => onPlyrPlay(plyrPlayer, plyrPlayers, players));
        plyrPlayer.on('pause', () => startSwiperAutoplay());

        if (wasPlaying) {
          onPlyrPlay(plyrPlayer, plyrPlayers, players);
          const result = plyrPlayer.play();
          if (result && typeof (result as Promise<void>).catch === 'function') {
            // Autoplay policies may refuse; the visitor can press play again.
            (result as Promise<void>).catch(() => {});
          }
        }
      });
    },
    (error) => {
      delete el.dataset.dmPlyrLoading;
      throw error;
    },
  );
}

/**
 * Sets up Plyr players lazily: the Plyr script and stylesheet are only fetched
 * when a visitor first interacts with a `._init-plyr` element (click, Enter/Space,
 * or a user-initiated play). Until then the element behaves as plain HTML.
 */
export function initializePlyrPlayers(
  plyrPlayers: Plyr[],
  players: Record<string, PlayerInstance>,
  root: ParentNode = document,
): void {
  const elements = Array.from(root.querySelectorAll<HTMLElement>('._init-plyr')).filter(
    (el) => el.dataset.dmPlyrBound !== 'true' && el.dataset.dmPlyrLazy !== 'true',
  );

  elements.forEach((el) => {
    el.dataset.dmPlyrLazy = 'true';

    const events = ['click', 'keydown', 'play'] as const;
    const disarm = (): void => {
      events.forEach((name) => el.removeEventListener(name, onInteraction));
    };
    const arm = (): void => {
      events.forEach((name) => el.addEventListener(name, onInteraction));
    };
    function onInteraction(event: Event): void {
      if (event.type === 'keydown') {
        const key = (event as KeyboardEvent).key;
        if (key !== 'Enter' && key !== ' ') return;
      }
      if (event.type === 'play' && !isUserActive()) return;

      disarm();
      activatePlyr(el, plyrPlayers, players).catch((error) => {
        console.error('Failed to load Plyr, falling back to the native player:', error);
        // Next interaction tries again.
        arm();
      });
    }

    if (isPreloadRequested(el)) {
      activatePlyr(el, plyrPlayers, players).catch((error) => {
        console.error('Failed to preload Plyr:', error);
        arm();
      });
    } else {
      arm();
    }
  });
}

type PausablePlayer = { [method: string]: unknown };

function callIfFunction(player: unknown, method: string): void {
  try {
    const fn = (player as PausablePlayer)[method];
    if (typeof fn === 'function') {
      (fn as () => void).call(player);
    }
  } catch (error) {
    console.warn(`Video player ${method}() failed:`, error);
  }
}

/**
 * Pauses all video players
 * @param id - Optional player id to exclude (for YouTube/Vimeo/Dailymotion)
 * @param plyrPlayers - Array of Plyr instances
 * @param players - Map of other player instances
 * @param excludePlyrPlayer - Optional Plyr instance to exclude (the one that is currently playing)
 */
export function pauseAllPlayers(
  id: string | null = null,
  plyrPlayers: Plyr[],
  players: Record<string, PlayerInstance>,
  excludePlyrPlayer: Plyr | null = null,
): void {
  activePlayerId = id;

  // Pause all Plyr players except the one that just started playing
  plyrPlayers.forEach((plyrPlayer) => {
    if (excludePlyrPlayer && plyrPlayer === excludePlyrPlayer) return;
    plyrPlayer.pause();
  });

  // Pause all other video players
  for (const [key, value] of Object.entries(players)) {
    if (id === key) continue;

    if (value.type === 'youtube') {
      callIfFunction(value.player, 'pauseVideo');
    } else if (value.type === 'vimeo' || value.type === 'dailymotion') {
      callIfFunction(value.player, 'pause');
    }
  }
}

/**
 * Handles play event for a player
 */
export function onPlay(
  id: string,
  plyrPlayers: Plyr[],
  players: Record<string, PlayerInstance>,
): void {
  pauseAllPlayers(id, plyrPlayers, players);
  stopSwiperAutoplay();
}

/**
 * Handles pause event for a player
 */
export function onPause(id: string): void {
  startSwiperAutoplay();
}

/**
 * Creates a dedicated mount element for external video APIs.
 * Keeping `.youtube` as a stable wrapper prevents API libraries from replacing
 * the styled container node itself.
 */
function createPlayerMountElement(container: HTMLElement, id: string): HTMLDivElement {
  container.innerHTML = '';
  const mountElement = document.createElement('div');
  mountElement.id = id;
  mountElement.style.width = '100%';
  mountElement.style.height = '100%';
  container.appendChild(mountElement);
  return mountElement;
}

/**
 * Replaces the container's content with an embed iframe.
 * Called synchronously from the click handler, so the iframe is created inside
 * the user gesture (what mobile browsers need to honor `autoplay=1`).
 */
function createEmbedIframe(
  container: HTMLElement,
  id: string,
  src: string,
  allow: string,
): HTMLIFrameElement {
  container.innerHTML = '';
  const iframe = document.createElement('iframe');
  iframe.id = id;
  iframe.src = src;
  iframe.setAttribute('allow', allow);
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('frameborder', '0');
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.aspectRatio = '16/9';
  iframe.style.border = '0';
  container.appendChild(iframe);
  return iframe;
}

export function youTubeEmbedUrl(videoId: string, time: number): string {
  const params = new URLSearchParams({
    autoplay: '1',
    start: String(time),
    rel: '0',
    enablejsapi: '1',
  });
  if (window.location.origin && window.location.origin !== 'null') {
    params.set('origin', window.location.origin);
  }
  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
}

export function vimeoEmbedUrl(videoId: string, time: number): string {
  // Unlisted videos are addressed as "<id>/<hash>"; the embed wants ?h=<hash>.
  const unlisted = /^(\d+)\/(\w+)$/.exec(videoId);
  const base = unlisted
    ? `https://player.vimeo.com/video/${unlisted[1]}?h=${unlisted[2]}&autoplay=1`
    : `https://player.vimeo.com/video/${encodeURIComponent(videoId)}?autoplay=1`;
  return time > 0 ? `${base}#t=${time}s` : base;
}

export function dailymotionEmbedUrl(videoId: string, time: number): string {
  const params = new URLSearchParams({ autoplay: '1', start: String(time) });
  return `https://www.dailymotion.com/embed/video/${encodeURIComponent(videoId)}?${params.toString()}`;
}

function startYouTube(
  element: HTMLElement,
  id: string,
  videoId: string,
  time: number,
  plyrPlayers: Plyr[],
  players: Record<string, PlayerInstance>,
): void {
  // The iframe goes in right now, inside the click, with autoplay=1. The API
  // is only needed to coordinate pausing, so it attaches to this iframe once
  // it has loaded; if it never loads the video still plays.
  const iframe = createEmbedIframe(element, id, youTubeEmbedUrl(videoId, time), YOUTUBE_ALLOW);
  iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  setPlayerState(element, 'active');

  loadYouTubeAPI()
    .then(() => {
      new window.YT!.Player(iframe, {
        events: {
          onReady: (event) => {
            players[id] = { type: 'youtube', player: event.target };
            // Another video was started while the API was loading.
            if (activePlayerId !== id) {
              callIfFunction(event.target, 'pauseVideo');
              return;
            }
            // autoplay=1 in the URL is not enough everywhere: WebKit starts
            // buffering and then drops back to "unstarted". The previous
            // implementation called playVideo() from here, so keep doing that
            // unless the player is already past that point. WebKit only honors
            // it shortly after the click, so on the very first video (API not
            // cached yet) it can arrive too late and the visitor taps play once.
            const target = event.target as unknown as { getPlayerState?: () => number };
            const state =
              typeof target.getPlayerState === 'function' ? target.getPlayerState() : -1;
            if (!YT_STATES_SETTLED.includes(state)) {
              callIfFunction(event.target, 'playVideo');
            }
          },
          onStateChange: (event: { data: number }) => {
            if (event.data === window.YT!.PlayerState.PLAYING) {
              onPlay(id, plyrPlayers, players);
            } else if (
              event.data === window.YT!.PlayerState.PAUSED ||
              event.data === window.YT!.PlayerState.ENDED
            ) {
              onPause(id);
            }
          },
        },
      });
    })
    .catch((error) => {
      console.warn('YouTube API unavailable; video plays without pause coordination:', error);
    });
}

function startVimeo(
  element: HTMLElement,
  id: string,
  videoId: string,
  time: number,
  plyrPlayers: Plyr[],
  players: Record<string, PlayerInstance>,
): void {
  const iframe = createEmbedIframe(element, id, vimeoEmbedUrl(videoId, time), VIMEO_ALLOW);
  setPlayerState(element, 'active');

  loadVimeoAPI()
    .then(() => {
      const player = new window.Vimeo!.Player(iframe);
      player.on('play', () => onPlay(id, plyrPlayers, players));
      player.on('pause', () => onPause(id));
      players[id] = { type: 'vimeo', player };
      // Another video was started while the API was loading.
      if (activePlayerId !== id) callIfFunction(player, 'pause');
    })
    .catch((error) => {
      console.warn('Vimeo API unavailable; video plays without pause coordination:', error);
    });
}

function startDailymotion(
  element: HTMLElement,
  id: string,
  videoId: string,
  time: number,
  plyrPlayers: Plyr[],
  players: Record<string, PlayerInstance>,
): void {
  setPlayerState(element, 'active');

  const createPlayer = window.dailymotion && window.dailymotion.createPlayer;
  const plainEmbed = (): void => {
    createEmbedIframe(element, id, dailymotionEmbedUrl(videoId, time), DAILYMOTION_ALLOW);
  };

  // Only the page itself can provide `dailymotion.createPlayer` (Dailymotion's
  // player library); this module does not load one. Without it, use the plain
  // embed: it needs no script and, being created inside the click, can autoplay.
  if (typeof createPlayer !== 'function') {
    plainEmbed();
    return;
  }

  const mountElement = createPlayerMountElement(element, id);
  window
    .dailymotion!.createPlayer(mountElement.id, {
      video: videoId,
      params: {
        autoplay: 1,
        start: time,
        mute: false,
      },
    })
    .then((playerInstance) => {
      // Attach event listeners
      playerInstance.on('play', () => onPlay(id, plyrPlayers, players));
      playerInstance.on('pause', () => onPause(id));
      playerInstance.on('ended', () => onPause(id));

      // Store the player instance
      players[id] = { type: 'dailymotion', player: playerInstance };
      // Another video was started while the player was being created.
      if (activePlayerId !== id) callIfFunction(playerInstance, 'pause');
    })
    .catch((error) => {
      console.error('Error initializing Dailymotion player, using plain embed:', error);
      plainEmbed();
    });
}

/**
 * Initializes video players (YouTube, Vimeo, Dailymotion, ARD Mediathek, other)
 *
 * Binds a click handler per element. No third-party request is made here (unless
 * the element has `data-dm-preload`); the handler loads what it needs.
 */
export function initializePlayers(
  youtubeElements: NodeListOf<Element>,
  players: Record<string, PlayerInstance>,
  plyrPlayers: Plyr[],
): void {
  youtubeElements.forEach((el) => {
    if ((el as HTMLElement).dataset.dmPlayerBound === 'true') return;
    (el as HTMLElement).dataset.dmPlayerBound = 'true';

    // Assign a unique runtime key per element so duplicate `data-id`s
    // (e.g. the same video rendered twice on a page) don't collide.
    const id = `player_${++playerKeyCounter}`;
    (el as HTMLElement).dataset.dmPlayerKey = id;
    setPlayerState(el as HTMLElement, 'idle');

    if (isPreloadRequested(el as HTMLElement)) {
      loadApiForType((el as HTMLElement).dataset.type).catch((error) => {
        console.warn('Failed to preload video API (will retry on click):', error);
      });
    }

    el.addEventListener('click', () => {
      const element = el as HTMLElement;
      const type = element.dataset.type as PlayerType;

      // A second click while an API is still loading, or on an element that
      // already has its player, must not load or create anything again. "other"
      // opens a new tab on every click, so it is exempt.
      const state = element.dataset.dmPlayerState as PlayerState | undefined;
      if (type !== 'other' && state === 'active') return;

      const customEmbed = element.querySelector('[data-custom-embed]');
      if (customEmbed) {
        element.innerHTML = customEmbed.innerHTML;
      }

      const videoId = element.dataset.videoId;
      const parsedTime = parseInt(element.dataset.time || '0', 10);
      const time = Number.isFinite(parsedTime) && parsedTime >= 0 ? parsedTime : 0;

      if (!videoId || !type) return;

      onPlay(id, plyrPlayers, players);

      // Other (open URL in new tab, no embed)
      if (type === 'other') {
        window.open(videoId, '_blank', 'noopener,noreferrer');
        return;
      }

      // ARD Mediathek (iframe embed, no JS API)
      if (type === 'ardmediathek') {
        const embedSrc = `https://www.ardmediathek.de/embed/${encodeURIComponent(videoId)}`;
        const iframe = document.createElement('iframe');
        iframe.src = embedSrc;
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('allow', 'fullscreen');
        iframe.setAttribute('frameborder', '0');
        iframe.style.width = '100%';
        iframe.style.aspectRatio = '16/9';
        element.innerHTML = '';
        element.appendChild(iframe);
        setPlayerState(element, 'active');
        return;
      }

      if (type === 'youtube') {
        startYouTube(element, id, videoId, time, plyrPlayers, players);
      } else if (type === 'vimeo') {
        startVimeo(element, id, videoId, time, plyrPlayers, players);
      } else if (type === 'dailymotion') {
        startDailymotion(element, id, videoId, time, plyrPlayers, players);
      }
    });
  });
}
