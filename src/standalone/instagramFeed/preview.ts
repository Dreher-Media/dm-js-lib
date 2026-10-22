/**
 * Hover preview of a video tile. A port of `astro-client-template`'s `preview.ts`: when the mouse
 * rests on a tile that has a clip file for a moment, the clip plays on top of the tile's picture,
 * muted, until the mouse leaves; then the `<video>` is taken away again, its request with it.
 * Nothing is asked for before the pointer has rested, and nothing in the background: one preview
 * at a time (see `step` in `lib/previewState.ts` for the machine and for why the pace is what it is).
 *
 * The tile stays what it was: a link whose picture is the poster. The video lies exactly over the
 * picture and fades in only once it really shows a frame. A failed clip is left quietly and not
 * asked for again this visit. `index.ts` starts this only on a page that has such a tile and a
 * pointer that can hover.
 */
import {
  previewAllowed,
  startDelay,
  step,
  type PreviewEvent,
  type PreviewState,
} from './lib/previewState';

const FINE_POINTER = '(hover: hover) and (pointer: fine)';

let state: PreviewState = { phase: 'idle' };
let timer: number | undefined;
let lastStart: number | null = null;
let video: HTMLVideoElement | null = null;
let current: HTMLElement | null = null;
/** The tile under the pointer. */
let hovered: HTMLElement | null = null;
/** Clips that did not play in this visit. */
const failed = new Set<string>();

function tileKey(tile: HTMLElement): string {
  return tile.dataset.igOpen ?? tile.getAttribute('href') ?? '';
}

function suspended(): boolean {
  return document.hidden || document.querySelector('[data-ig-popup][data-open="true"]') !== null;
}

function environment() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return {
    finePointer: window.matchMedia(FINE_POINTER).matches,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    saveData: connection?.saveData === true,
    suspended: suspended(),
  };
}

/** Take the preview down: no more playback, no more request, no element. */
function teardown(): void {
  window.clearTimeout(timer);
  timer = undefined;
  if (video) {
    video.pause();
    // an element that is only removed may keep its connection open: empty it, so the request ends
    video.removeAttribute('src');
    video.load();
    video.remove();
  }
  if (current) delete current.dataset.igPreviewing;
  video = null;
  current = null;
}

function startVideo(tile: HTMLElement): void {
  const src = tile.dataset.igPreview;
  if (!src) return;
  const clip = document.createElement('video');
  clip.className = 'ig-feed__preview';
  clip.muted = true;
  clip.loop = true;
  clip.playsInline = true;
  clip.preload = 'none';
  clip.tabIndex = -1;
  clip.setAttribute('aria-hidden', 'true');
  clip.draggable = false;
  if (tile.closest('[data-ig-protect]')) {
    clip.disablePictureInPicture = true;
    clip.disableRemotePlayback = true;
    clip.setAttribute('controlslist', 'nodownload noremoteplayback');
  }
  // it fades in once it really shows a frame
  clip.addEventListener('playing', () => {
    if (video === clip) tile.dataset.igPreviewing = '';
  });
  clip.addEventListener('error', () => {
    if (video === clip) {
      failed.add(src);
      dispatch({ type: 'failed', tile: tileKey(tile) });
    }
  });
  // between the picture and the badge: the badge and the caption overlay (after it) stay on top of the clip
  const badge = tile.querySelector('.ig-feed__badge');
  if (badge) badge.before(clip);
  else tile.append(clip);
  video = clip;
  current = tile;
  clip.src = src;
  lastStart = performance.now();
  // a refusal to play (autoplay policy) is not a dead file: the picture just stays
  clip.play().catch(() => undefined);
}

function dispatch(event: PreviewEvent): void {
  const next = step(state, event);
  state = next.state;
  for (const action of next.actions) {
    if (action.type === 'cancelWait') {
      window.clearTimeout(timer);
      timer = undefined;
    } else if (action.type === 'stop') {
      teardown();
    } else if (action.type === 'wait' && event.type === 'enter' && hovered) {
      const tile = hovered;
      timer = window.setTimeout(
        () => {
          timer = undefined;
          // the world may have changed during the wait (the popup opened, the tab went to the background)
          if (suspended()) {
            dispatch({ type: 'stop' });
            return;
          }
          const move = step(state, { type: 'elapsed', tile: event.tile });
          state = move.state;
          if (move.actions.some((a) => a.type === 'start')) startVideo(tile);
        },
        startDelay(performance.now(), lastStart),
      );
    }
    // 'remember' was done where the failure was seen
  }
}

function tileOf(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>('[data-ig-preview]') : null;
}

function stopAll(): void {
  dispatch({ type: 'stop' });
}

let started = false;

/** Listen for the pointer on the page's tiles. Idempotent. */
export function initHoverPreview(): void {
  if (started) return;
  started = true;
  document.addEventListener(
    'pointerover',
    (event) => {
      if (event.pointerType !== 'mouse') return;
      const tile = tileOf(event.target);
      if (!tile) return;
      // the pointer moving between the tile's own parts is no arrival
      if (event.relatedTarget instanceof Node && tile.contains(event.relatedTarget)) return;
      hovered = tile;
      dispatch({
        type: 'enter',
        tile: tileKey(tile),
        allowed: previewAllowed(environment(), tile.dataset.igPreview, failed),
      });
    },
    true,
  );

  document.addEventListener(
    'pointerout',
    (event) => {
      if (event.pointerType !== 'mouse') return;
      const tile = tileOf(event.target);
      if (!tile) return;
      if (event.relatedTarget instanceof Node && tile.contains(event.relatedTarget)) return;
      if (hovered === tile) hovered = null;
      dispatch({ type: 'leave', tile: tileKey(tile) });
    },
    true,
  );

  // Everything else that moves the tile away from the pointer, or the page from the visitor.
  document.addEventListener('ig:popup-open', stopAll);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAll();
  });
  // a carousel that scrolls or is dragged, a page that scrolls under a resting pointer, a press
  document.addEventListener(
    'scroll',
    () => {
      if (state.phase !== 'idle') stopAll();
    },
    { capture: true, passive: true },
  );
  document.addEventListener(
    'pointerdown',
    () => {
      if (state.phase !== 'idle') stopAll();
    },
    true,
  );
}
