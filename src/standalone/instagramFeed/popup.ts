/**
 * Instagram post popup — the runtime behind a click on a feed tile.
 *
 * A port of `astro-client-template`'s `components/shared/instagram/popup.ts`: the same list of
 * posts, the same album, clip player, caption and lazy-rendering logic, so the Webflow module looks
 * and moves like the Astro one. What differs is where the markup comes from. The Astro shell
 * renders `<template>`s on the server; `render.ts` builds the same `<template>`s in the browser
 * (one dialog shell `template[data-ig-dialog]`, one body per post `template[data-ig-post]`), and
 * this module clones them, it never builds markup itself.
 *
 * Modal mechanics (`Esc`, backdrop click, Tab trap, scroll lock, `inert`) are `./modal.ts`.
 * The engine returns focus to a trigger it was opened by; this opens it imperatively, so focus
 * goes back to the tile here (`modal:close`).
 *
 *   - the popup is a LIST of all the component's posts (`template[data-ig-post]`, in the grid's
 *     order), scrolled to the one that was clicked. Only the current post and `MOUNT_RADIUS` on
 *     each side are built; the rest are empty boxes of the height they have or will have;
 *   - the dialog is moved to `<body>` on first open (a `position: fixed` box inside a transformed
 *     ancestor, which Webflow interactions create, is not fixed to the screen any more) and the
 *     popup's CSS variables are copied from the feed;
 *   - each card's picture box takes the ORIGINAL proportion of the post's first picture;
 *   - albums scroll (scroll-snap) and turn on a short drag like Instagram;
 *   - a clip plays, muted and looping, while its slide is on screen AND its post is the current
 *     one: at most one clip plays; a clip that fails is replaced by the cover and a link out;
 *   - the caption collapses to two lines with "… more" after the last word that fits;
 *   - share: `navigator.share` where there is one, else the permalink goes to the clipboard.
 */
import { closeModal, initModals, openModal } from './modal';

import { clampRatio, dotScales, formatPostDate, settleIndex, snapRatio } from './lib/format';
import {
  anchorShift,
  currentPost,
  estimateHeight,
  keyStep,
  mountWindow,
  stepTarget,
} from './lib/feedView';
import { clipView, isPlaybackFailure } from './lib/playback';

/** Custom properties the popup reads; copied from the feed because the dialog leaves it. */
const POPUP_VARS = [
  '--ig-popup-font',
  '--ig-popup-text',
  '--ig-popup-secondary',
  '--ig-popup-link',
  '--ig-popup-line',
  '--ig-popup-bg',
  '--ig-popup-backdrop',
  '--ig-popup-max-width',
  '--ig-popup-radius',
  '--ig-popup-ratio',
  '--ig-popup-media-max-h',
  '--ig-popup-media-min-h',
  '--ig-popup-media-bg',
  '--ig-popup-chip-bg',
  '--ig-popup-chip-color',
  '--ig-popup-nav-bg',
  '--ig-popup-nav-color',
  '--ig-popup-stat-gap',
  '--ig-inset',
] as const;

/** What the arrow keys on a focused progress slider skip, in seconds. */
const SEEK_STEP = 5;

/** A proportion outside this is a broken measurement, not a picture (1 : 4 … 5 : 1); the height limits do the real work. */
const RATIO_SANE_MIN = 0.25;
const RATIO_SANE_MAX = 5;

/** A clip plays while this much of its slide is on screen. */
const PLAY_SHARE = 0.6;

/** After the last scroll event of a swipe: the album has settled and the new slide is announced. */
const SETTLE_MS = 150;

/** How long "Link copied" stays up. */
const STATUS_MS = 2500;

interface Popup {
  /** The component the posts come from: its tiles are what focus goes back to. */
  source: HTMLElement;
  root: HTMLElement;
  /** The scroller, and the list of cards in it. */
  scroll: HTMLElement;
  list: HTMLElement;
  /** The previous / next post buttons, and the header every card starts with. */
  steps: HTMLButtonElement[];
  head: HTMLTemplateElement | null;
  /** One entry per post of the popup's list, in the grid's order. */
  posts: PostView[];
  /** The post with the most of itself in view; it is the one the buttons and keys work from. */
  current: number;
  /** The tile that opened the popup. */
  opener: HTMLElement | null;
  /** Watches the clips of the mounted posts: playing while on screen, paused when not. */
  observer: IntersectionObserver | null;
  frame: number;
  statusTimer: number | undefined;
}

/** A post of the list. Its card is an empty box of a known height until it is mounted. */
interface PostView {
  index: number;
  id: string;
  template: HTMLTemplateElement;
  tile: HTMLAnchorElement | null;
  el: HTMLElement;
  mounted: boolean;
  /** The first picture's proportion (`0.8` until it is known) and whether it is. */
  ratio: number;
  ratioKnown: boolean;
  /** The height the card has (measured at its last unmount) or is estimated to have. */
  height: number;
  /** The post's Instagram link — what share copies. */
  permalink: string;
  album: Album | null;
}

interface Album {
  post: PostView;
  track: HTMLElement;
  slides: HTMLElement[];
  /** The slide the album rests on (or is nearest to). */
  index: number;
  /** The slide a finger left, for `settleIndex`. */
  start: number;
  prev: HTMLButtonElement | null;
  next: HTMLButtonElement | null;
  counter: HTMLElement | null;
  status: HTMLElement | null;
  dots: HTMLElement[];
  label: string;
  /** The slide last announced to a screen reader. */
  announced: number;
  frame: number;
  timer: number | undefined;
}

const popups = new WeakMap<HTMLElement, Popup>();

/** The popup that is open — there is only ever one. */
let active: Popup | null = null;

/**
 * The visitor's choice, kept for every clip of this page view. A clip starts muted, as in
 * Instagram's feed; once the visitor turns the sound on, every later clip — in this popup and
 * in the ones opened afterwards — plays with it, because the page has been unlocked.
 */
let mutedPref = true;

/** Clip URLs that failed in this page view: reopening a post does not stage the same dead player again. */
const failedClips = new Set<string>();

/** `Array.prototype.at`, for the ES2020 typings this package builds against. */
function at<T>(items: readonly T[], index: number): T | undefined {
  return items[index < 0 ? items.length + index : index];
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusables(popup: Popup): HTMLElement[] {
  return Array.from(popup.root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null,
  );
}

function fill(label: string, values: Record<string, string | number>): string {
  return label.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match));
}

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** A clip does not start by itself for a visitor who asked for less motion, or for less data. */
function mayAutoplay(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return !reducedMotion() && connection?.saveData !== true;
}

/** The popup of one feed, built from the shell's template on first use. */
function popupOf(source: HTMLElement): Popup | undefined {
  const known = popups.get(source);
  if (known) return known;

  const template = source.querySelector<HTMLTemplateElement>('template[data-ig-dialog]');
  const clone = template?.content.cloneNode(true) as DocumentFragment | undefined;
  const root = clone?.querySelector<HTMLElement>('[data-ig-popup]');
  const scroll = root?.querySelector<HTMLElement>('[data-ig-scroll]');
  const list = root?.querySelector<HTMLElement>('[data-ig-list]');
  if (!clone || !root || !scroll || !list) return undefined;

  // One empty card per post. Its height is an estimate until the card has been built once.
  const templates = Array.from(
    source.querySelectorAll<HTMLTemplateElement>('template[data-ig-post]'),
  );
  const posts: PostView[] = templates.map((postTemplate, index) => {
    const el = document.createElement('article');
    el.className = 'ig-pop__post';
    el.tabIndex = -1;
    el.setAttribute('role', 'article');
    el.setAttribute('aria-posinset', String(index + 1));
    el.setAttribute('aria-setsize', String(templates.length));
    el.setAttribute('aria-busy', 'true');
    const alt = postTemplate.dataset.igAlt;
    if (alt) el.setAttribute('aria-label', alt);
    el.dataset.mounted = 'false';
    el.dataset.igIndex = String(index);
    const id = postTemplate.dataset.igPost ?? '';
    return {
      index,
      id,
      template: postTemplate,
      tile:
        Array.from(source.querySelectorAll<HTMLAnchorElement>('a[data-ig-open]')).find(
          (tile) => tile.dataset.igOpen === id,
        ) ?? null,
      el,
      mounted: false,
      ratio: 0.8,
      ratioKnown: false,
      height: 0,
      permalink: postTemplate.dataset.igPermalink ?? '',
      album: null,
    };
  });
  list.append(...posts.map((post) => post.el));

  const popup: Popup = {
    source,
    root,
    scroll,
    list,
    steps: Array.from(root.querySelectorAll<HTMLButtonElement>('[data-ig-step]')),
    head: root.querySelector<HTMLTemplateElement>('template[data-ig-head]'),
    posts,
    current: 0,
    opener: null,
    observer: null,
    frame: 0,
    statusTimer: undefined,
  };
  document.body.append(clone);
  initModals();
  popups.set(source, popup);

  root.addEventListener('modal:close', () => {
    popup.observer?.disconnect();
    popup.observer = null;
    pauseAll(popup);
    window.clearTimeout(popup.statusTimer);
    if (active === popup) active = null;
    // The engine opened nothing from a trigger, so it has nowhere to return focus to.
    focusTile(popup);
    popup.opener = null;
  });
  // `error` does not bubble, so listen on the way down. Only a real playback
  // failure counts: pausing, seeking and buffering raise no `error` at all.
  root.addEventListener(
    'error',
    (event) => {
      const video = event.target;
      if (video instanceof HTMLVideoElement && isPlaybackFailure(video.error?.code)) {
        showFallback(video);
      }
    },
    true,
  );
  // The clip's state lives on the element and its events do not bubble: follow them on the way down.
  for (const type of [
    'play',
    'pause',
    'timeupdate',
    'durationchange',
    'loadedmetadata',
    'volumechange',
  ]) {
    root.addEventListener(
      type,
      (event) => {
        const video = event.target;
        if (!(video instanceof HTMLVideoElement)) return;
        syncPlayer(video);
        if (type === 'play') startProgress();
      },
      true,
    );
  }
  root.addEventListener('keydown', (event) => {
    onKeydown(event, popup);
  });
  root.addEventListener('click', (event) => {
    onClick(event, popup);
  });
  scroll.addEventListener(
    'scroll',
    () => {
      if (popup.frame) return;
      popup.frame = requestAnimationFrame(() => {
        popup.frame = 0;
        updateCurrent(popup);
      });
    },
    { passive: true },
  );
  wireScrub(popup);
  return popup;
}

/**
 * Focus an element of a dialog that has only just opened. A dialog built a moment ago
 * is still `visibility: hidden` for a few frames (its first style change plays the
 * closed state's delayed visibility transition), and a hidden element cannot take
 * the focus — so the first call can fall on deaf ears. Try again on the next frames,
 * for about half a second.
 */
function focusWhenReady(element: HTMLElement | null | undefined, frames = 30): void {
  if (!element) return;
  element.focus({ preventScroll: true });
  if (document.activeElement !== element && frames > 0) {
    requestAnimationFrame(() => {
      focusWhenReady(element, frames - 1);
    });
  }
}

/** The post whose card holds `element` (or the one in view, for an element outside every card). */
function postOf(popup: Popup, element: Element | null): PostView | undefined {
  const card = element?.closest<HTMLElement>('.ig-pop__post');
  return at(popup.posts, Number(card?.dataset.igIndex ?? popup.current));
}

/**
 * The card's picture box takes the proportion of the post's first picture. The card is built
 * around it and everything below moves with it; when this card lies above the one in view, the
 * scroller is moved by the same amount so that the one in view does not move.
 */
function setRatio(popup: Popup, post: PostView, width: number, height: number): void {
  if (!(width > 0) || !(height > 0)) return;
  const ratio = snapRatio(clampRatio(width, height, RATIO_SANE_MIN, RATIO_SANE_MAX, 0.8));
  post.ratio = ratio;
  post.ratioKnown = true;
  withAnchor(popup, () => {
    post.el.style.setProperty('--ig-pop-ar', String(ratio));
  });
}

/** Wait for a picture (a URL, or an `<img>` that may already be done) and hand over its natural size. */
function whenSized(source: string | HTMLImageElement, done: (w: number, h: number) => void): void {
  const img = typeof source === 'string' ? new Image() : source;
  const report = (): void => {
    done(img.naturalWidth, img.naturalHeight);
  };
  if (typeof source === 'string') img.src = source;
  if (img.complete && img.naturalWidth > 0) report();
  else img.addEventListener('load', report, { once: true });
}

/** Mirror the feed's popup variables onto the dialog (the feed is no longer its ancestor). */
function copyVariables(feed: HTMLElement, popup: Popup): void {
  const computed = getComputedStyle(feed);
  for (const name of POPUP_VARS) {
    const value = computed.getPropertyValue(name).trim();
    if (value) popup.root.style.setProperty(name, value);
    else popup.root.style.removeProperty(name);
  }
}

function pauseAll(popup: Popup): void {
  popup.list.querySelectorAll('video').forEach((video) => {
    video.pause();
    delete video.dataset.igUserPaused;
    delete video.dataset.igResume;
  });
}

// ── a clip that does not play ───────────────────────────────────────────

/**
 * Put a clip's slide into the view `clipView()` names for it. A clip has up to three
 * parts: its player (a clip with a file), the disc that reveals the notice (a clip
 * without one), and the notice itself — cover, message, link. Same box in every view,
 * so nothing jumps.
 */
function applyClipView(slide: HTMLElement): void {
  const player = slide.querySelector<HTMLElement>('[data-ig-player]');
  const reveal = slide.querySelector<HTMLElement>('[data-ig-reveal]');
  const notice = slide.querySelector<HTMLElement>('[data-ig-fallback]');
  if (!notice) return;
  const view = clipView({
    hasFile: Boolean(player),
    failed: slide.dataset.igFailed !== undefined,
    revealed: slide.dataset.igRevealed !== undefined,
  });
  if (player) player.hidden = view !== 'player';
  if (reveal) reveal.hidden = view !== 'cover';
  notice.hidden = view !== 'notice';
  if (view === 'notice') {
    const cover = notice.querySelector<HTMLImageElement>('img[data-src]');
    if (cover?.dataset.src) cover.src = cover.dataset.src;
    delete cover?.dataset.src;
  }
}

/**
 * Swap a failed `<video>` for the cover and a link to the post — with a visible reason.
 * Same box, so nothing jumps; the dead player leaves the tab order. If the player held
 * the focus (the visitor had just pressed play), the link takes it, so the focus stays
 * in the dialog and the message is read out as the link's name.
 */
function showFallback(video: HTMLVideoElement): void {
  if (video.hidden) return;
  const player = video.closest<HTMLElement>('[data-ig-player]');
  const slide = player?.closest<HTMLElement>('[data-ig-slide]');
  if (!player || !slide) return;
  // The visitor was on the clip's own controls (its surface, slider or mute button).
  const hadFocus = player.contains(document.activeElement);
  const src = video.getAttribute('src');
  if (src) failedClips.add(src);

  video.pause();
  video.hidden = true;
  // Stop asking for it: no src, nothing left to retry or buffer.
  video.removeAttribute('src');
  video.load();

  slide.dataset.igFailed = '';
  applyClipView(slide);
  if (hadFocus)
    slide.querySelector<HTMLElement>('[data-ig-fallback] a')?.focus({ preventScroll: true });
}

/** The disc of a clip without a file was pressed: now — and only now — the notice and the link. */
function revealNotice(button: HTMLElement): void {
  const slide = button.closest<HTMLElement>('[data-ig-slide]');
  if (!slide) return;
  slide.dataset.igRevealed = '';
  applyClipView(slide);
  slide.querySelector<HTMLElement>('[data-ig-fallback] a')?.focus({ preventScroll: true });
}

// ── the clip's own controls ─────────────────────────────────────────────

function clock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(whole / 60))}:${String(whole % 60).padStart(2, '0')}`;
}

/** How far a clip has played, 0 to 1. */
function progressOf(video: HTMLVideoElement): number {
  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  return duration > 0 ? Math.min(Math.max(video.currentTime / duration, 0), 1) : 0;
}

/** Bring a player's button, slider, line and sound button in line with its `<video>`. */
function syncPlayer(video: HTMLVideoElement): void {
  const player = video.closest<HTMLElement>('[data-ig-player]');
  if (!player) return;
  const playing = !video.paused && !video.ended;
  player.dataset.playing = String(playing);
  const label = playing ? player.dataset.igLabelPause : player.dataset.igLabelPlay;
  const toggle = player.querySelector<HTMLElement>('[data-ig-toggle]');
  if (toggle && label) toggle.setAttribute('aria-label', label);

  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  const now = Math.min(video.currentTime, duration || video.currentTime);
  const scrub = player.querySelector<HTMLElement>('[data-ig-scrub]');
  if (scrub) {
    scrub.setAttribute('aria-valuemax', String(Math.round(duration)));
    scrub.setAttribute('aria-valuenow', String(Math.round(now)));
    scrub.setAttribute(
      'aria-valuetext',
      fill(player.dataset.igSeekText ?? '', { current: clock(now), total: clock(duration) }),
    );
  }
  player.style.setProperty('--ig-pop-progress', String(progressOf(video)));

  // The button names what pressing it does, and its glyph shows how the sound stands now.
  const mute = player.querySelector<HTMLElement>('[data-ig-mute]');
  if (mute) {
    mute.dataset.muted = String(video.muted);
    const action = video.muted ? player.dataset.igLabelUnmute : player.dataset.igLabelMute;
    if (action) mute.setAttribute('aria-label', action);
  }
}

/** The line fills smoothly while a clip plays: every frame, not the four a second `timeupdate` gives. */
let progressFrame = 0;
function startProgress(): void {
  if (progressFrame || !active) return;
  const tick = (): void => {
    progressFrame = 0;
    const playing = active
      ? Array.from(active.list.querySelectorAll('video')).filter((v) => !v.paused && !v.ended)
      : [];
    for (const video of playing) {
      video
        .closest<HTMLElement>('[data-ig-player]')
        ?.style.setProperty('--ig-pop-progress', String(progressOf(video)));
    }
    if (playing.length > 0) progressFrame = requestAnimationFrame(tick);
  };
  progressFrame = requestAnimationFrame(tick);
}

function videoOf(element: Element): HTMLVideoElement | null {
  return element.closest('[data-ig-player]')?.querySelector('video') ?? null;
}

/**
 * Play a clip with the sound the visitor chose. Muted is always allowed; with sound the
 * browser may still refuse (no gesture on this page yet) — then it plays muted, and the
 * sound button says so.
 */
function playVideo(popup: Popup, video: HTMLVideoElement): void {
  video.muted = mutedPref;
  video.play().catch((error: unknown) => {
    // Anything else (a dead file) is the `error` event's business, not an exception.
    if (!(error instanceof DOMException) || error.name !== 'NotAllowedError') return;
    if (video.muted) return;
    setMuted(popup, true);
    video.play().catch(() => undefined);
  });
}

/** A clip on screen starts by itself, unless the visitor paused it, or asked for less motion. */
function autoplay(popup: Popup, video: HTMLVideoElement): void {
  if (popup.root.dataset.open !== 'true' || document.hidden || !mayAutoplay()) return;
  if (video.hidden || video.dataset.igUserPaused !== undefined) return;
  if (video.paused) playVideo(popup, video);
}

/** The visitor's tap: play or pause, and a pause stays until the clip is left. */
function togglePlay(popup: Popup, video: HTMLVideoElement): void {
  if (video.paused || video.ended) {
    delete video.dataset.igUserPaused;
    playVideo(popup, video);
  } else {
    video.dataset.igUserPaused = '';
    video.pause();
  }
}

function seekTo(video: HTMLVideoElement, seconds: number): void {
  if (!Number.isFinite(video.duration)) return;
  video.currentTime = Math.min(Math.max(seconds, 0), video.duration);
  syncPlayer(video);
}

/** The progress line: pressing or dragging on it seeks to where the pointer is. */
function wireScrub(popup: Popup): void {
  let current: { scrub: HTMLElement; video: HTMLVideoElement; id: number } | null = null;
  const seekFromPointer = (event: PointerEvent): void => {
    if (!current) return;
    const box = current.scrub.getBoundingClientRect();
    const share = box.width > 0 ? (event.clientX - box.left) / box.width : 0;
    const duration = Number.isFinite(current.video.duration) ? current.video.duration : 0;
    seekTo(current.video, Math.min(Math.max(share, 0), 1) * duration);
  };
  popup.list.addEventListener('pointerdown', (event) => {
    const scrub = (event.target as Element).closest<HTMLElement>('[data-ig-scrub]');
    const video = scrub ? videoOf(scrub) : null;
    if (!scrub || !video || event.button !== 0) return;
    current = { scrub, video, id: event.pointerId };
    scrub.setPointerCapture(event.pointerId);
    scrub.dataset.scrubbing = '';
    scrub.focus({ preventScroll: true });
    seekFromPointer(event);
  });
  popup.list.addEventListener('pointermove', (event) => {
    if (current?.id === event.pointerId) seekFromPointer(event);
  });
  const end = (event: PointerEvent): void => {
    if (current?.id !== event.pointerId) return;
    delete current.scrub.dataset.scrubbing;
    current = null;
  };
  popup.list.addEventListener('pointerup', end);
  popup.list.addEventListener('pointercancel', end);
}

/** The arrow keys on a focused progress slider: ±5 s, and nothing for the album behind it. */
function onSliderKey(event: KeyboardEvent, slider: HTMLElement): boolean {
  const video = videoOf(slider);
  if (!video) return false;
  const step =
    event.key === 'ArrowRight' || event.key === 'ArrowUp'
      ? SEEK_STEP
      : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
        ? -SEEK_STEP
        : 0;
  const home = event.key === 'Home';
  const end = event.key === 'End';
  if (!step && !home && !end) return false;
  event.preventDefault();
  event.stopPropagation();
  if (home) seekTo(video, 0);
  else if (end) seekTo(video, video.duration);
  else seekTo(video, video.currentTime + step);
  return true;
}

/** Sound is the visitor's, and lasts: every clip in the popup and in the ones opened later follows it. */
function setMuted(popup: Popup, muted: boolean): void {
  mutedPref = muted;
  popup.list.querySelectorAll('video').forEach((video) => {
    video.muted = muted;
    syncPlayer(video);
  });
}

/**
 * Watch a mounted post's clips. A slide that is mostly on screen is "seen" — and only the clip
 * on a seen slide of the post that is in view plays (muted, looping); every other one stops, and
 * plays again from where it was when it returns, unless the visitor paused it.
 */
function observeSlide(popup: Popup, slide: HTMLElement): void {
  popup.observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const target = entry.target as HTMLElement;
        // Mostly on screen — or filling most of a screen that is shorter than the picture (a phone on its side).
        const onScreen =
          entry.intersectionRatio >= PLAY_SHARE ||
          entry.intersectionRect.height >= PLAY_SHARE * window.innerHeight;
        if (entry.isIntersecting && onScreen) target.dataset.igSeen = '';
        else delete target.dataset.igSeen;
      }
      reconcileVideos(popup);
    },
    // every 5 %: a slide that is dragged or scrolled away is noticed while it goes, not only at the end
    { threshold: Array.from({ length: 21 }, (_, i) => i / 20) },
  );
  popup.observer.observe(slide);
}

/** At most one clip plays: on a seen slide of the current post. All others are paused. */
function reconcileVideos(popup: Popup): void {
  for (const post of popup.posts) {
    if (!post.mounted) continue;
    post.el.querySelectorAll<HTMLElement>('[data-ig-slide]').forEach((slide) => {
      const video = slide.querySelector('video');
      if (!video) return;
      if (post.index === popup.current && slide.dataset.igSeen !== undefined) {
        autoplay(popup, video);
      } else {
        if (!video.paused) video.pause();
        delete video.dataset.igUserPaused;
      }
    });
  }
}

/** A hidden tab plays nothing; coming back, the clip in view goes on. */
document.addEventListener('visibilitychange', () => {
  if (!active) return;
  if (document.hidden) {
    active.list.querySelectorAll('video').forEach((video) => {
      video.pause();
    });
    return;
  }
  reconcileVideos(active);
});

// ── album ───────────────────────────────────────────────────────────────

/** A clip's poster is set when its slide is near, so a faraway slide fetches nothing. */
function loadPoster(slide: HTMLElement): void {
  const video = slide.querySelector<HTMLVideoElement>('video[data-poster]');
  if (!video) return;
  const poster = video.dataset.poster;
  if (poster) video.poster = poster;
  delete video.dataset.poster;
}

/** The slide the album has scrolled to, as a fraction (1.4 = 40 % of the way to the third). */
function positionOf(album: Album): number {
  const width = album.track.clientWidth;
  return width > 0 ? album.track.scrollLeft / width : album.index;
}

function albumOf(popup: Popup, post: PostView, media: HTMLElement | null): Album | null {
  if (!media) return null;
  const track = media.querySelector<HTMLElement>('[data-ig-track]');
  const slides = Array.from(media.querySelectorAll<HTMLElement>('[data-ig-slide]'));
  if (!track || slides.length < 2) return null;
  const album: Album = {
    post,
    track,
    slides,
    index: 0,
    start: 0,
    prev: media.querySelector<HTMLButtonElement>('[data-ig-slide-prev]'),
    next: media.querySelector<HTMLButtonElement>('[data-ig-slide-next]'),
    counter: media.querySelector<HTMLElement>('[data-ig-counter]'),
    status: media.querySelector<HTMLElement>('[data-ig-slide-status]'),
    dots: Array.from(media.querySelectorAll<HTMLElement>('[data-ig-dots] > span')),
    label: media.dataset.igSlideLabel ?? '',
    announced: 0,
    frame: 0,
    timer: undefined,
  };
  track.addEventListener(
    'scroll',
    () => {
      // once a frame is plenty: the dots fade with the finger, the counter turns at the midpoint
      if (!album.frame) {
        album.frame = requestAnimationFrame(() => {
          album.frame = 0;
          followScroll(popup, album);
        });
      }
      window.clearTimeout(album.timer);
      album.timer = window.setTimeout(() => {
        announceSlide(album);
      }, SETTLE_MS);
    },
    { passive: true },
  );
  // Instagram turns the slide on a short drag; the browser's own snap wants half a width.
  track.addEventListener(
    'touchstart',
    () => {
      album.start = album.index;
    },
    { passive: true },
  );
  track.addEventListener(
    'touchend',
    () => {
      const position = positionOf(album);
      const target = settleIndex(position, album.start, album.slides.length);
      const nearest = Math.min(Math.max(Math.round(position), 0), album.slides.length - 1);
      // Only where the browser would fall back to the slide it came from.
      if (target !== album.start && nearest === album.start) scrollToSlide(album, target);
    },
    { passive: true },
  );
  return album;
}

function scrollToSlide(album: Album, index: number): void {
  const target = Math.min(Math.max(index, 0), album.slides.length - 1);
  album.track.scrollTo({
    left: target * album.track.clientWidth,
    behavior: reducedMotion() ? 'auto' : 'smooth',
  });
}

/** Turn the album by one (arrows, keys); the scroll event that follows does the rest. */
function turn(post: PostView | undefined, by: number): void {
  const album = post?.album;
  if (album) scrollToSlide(album, album.index + by);
}

/** The scroll position moved: fade the dots with it, and commit a new slide once it is the nearest. */
function followScroll(popup: Popup, album: Album): void {
  const position = positionOf(album);
  album.dots.forEach((dot, i) => {
    dot.style.setProperty('--ig-dot-p', Math.max(0, 1 - Math.abs(position - i)).toFixed(3));
  });
  const index = Math.min(Math.max(Math.round(position), 0), album.slides.length - 1);
  if (index !== album.index) showSlide(popup, album.post, index, false);
}

function announceSlide(album: Album): void {
  if (album.index === album.announced) return;
  album.announced = album.index;
  if (album.status) {
    album.status.textContent = fill(album.label, {
      n: album.index + 1,
      total: album.slides.length,
    });
  }
}

/**
 * What a mounted post loads, by how near the visitor is. A card two posts away is built but
 * loads only what the browser's own lazy loading asks for when it gets close (its first
 * picture); a card next to the post in view also sets its clip's poster; the post in view
 * also brings the album's neighbouring slides in — pictures stop being lazy, posters are set —
 * so a swipe never meets an empty slide, and a faraway album costs one picture, not ten.
 */
function warmPost(popup: Popup, post: PostView): void {
  if (!post.mounted) return;
  const distance = Math.abs(post.index - popup.current);
  if (distance > 1) return;
  const slides = Array.from(post.el.querySelectorAll<HTMLElement>('[data-ig-slide]'));
  const at = post.album?.index ?? 0;
  slides.forEach((slide, i) => {
    const near = Math.abs(i - at) <= (distance === 0 ? 1 : 0);
    if (!near) return;
    loadPoster(slide);
    slide.querySelectorAll('img').forEach((img) => {
      img.loading = 'eager';
    });
  });
}

/**
 * Make `target` the album's current slide: counter, dots, arrows, and what is near enough to load.
 * The slides that are not current are `inert` — off screen, out of the tab order and the reading
 * order — so a clip's controls cannot be reached while its slide is somewhere else.
 */
function showSlide(popup: Popup, post: PostView, target: number, instant: boolean): void {
  const album = post.album;
  if (!album) return;
  const index = Math.min(Math.max(target, 0), album.slides.length - 1);
  const focused = document.activeElement;
  const focusInSlide = album.slides.some((slide, i) => i !== index && slide.contains(focused));
  const count = album.slides.length;

  album.slides.forEach((slide, i) => {
    slide.inert = i !== index;
    if (i !== index) {
      // A file-less clip starts again without its notice when the slide comes back.
      if (slide.dataset.igRevealed !== undefined) {
        delete slide.dataset.igRevealed;
        applyClipView(slide);
      }
    }
  });
  album.index = index;
  warmPost(popup, post);
  if (instant) album.announced = index;

  const scales = dotScales(index, count);
  album.dots.forEach((dot, i) => {
    dot.style.setProperty('--ig-dot-s', String(scales[i] ?? 0));
    if (instant) dot.style.setProperty('--ig-dot-p', i === index ? '1' : '0');
  });
  if (album.counter) album.counter.textContent = `${String(index + 1)}/${String(count)}`;

  // The arrow that has nowhere to go disappears. If it held the focus, the
  // other arrow takes it — otherwise the focus would fall out of the dialog.
  const atStart = index === 0;
  const atEnd = index === count - 1;
  if (album.prev) album.prev.hidden = atStart;
  if (album.next) album.next.hidden = atEnd;
  // A control inside the slide that was just left (a clip's surface or slider) is inert
  // now, and an inert element drops the focus on the page. The card takes it.
  if (focusInSlide) post.el.focus({ preventScroll: true });
  if (focused === album.prev && atStart) album.next?.focus({ preventScroll: true });
  if (focused === album.next && atEnd) album.prev?.focus({ preventScroll: true });
}

// ── caption ─────────────────────────────────────────────────────────────

/** The caption shows this many lines, then "… more". */
const CAPTION_LINES = 2;

/** What the caption was made of, to put it back whole: its text nodes and the links among them. */
interface Caption {
  nodes: Text[];
  originals: string[];
  links: HTMLAnchorElement[];
}

const captions = new WeakMap<HTMLElement, Caption>();

function captionOf(text: HTMLElement): Caption {
  const known = captions.get(text);
  if (known) return known;
  const walker = document.createTreeWalker(text, NodeFilter.SHOW_TEXT, {
    // the toggle sits inside the text while it is collapsed; its words are not the caption's
    acceptNode: (node) =>
      node.parentElement?.closest('[data-ig-more]')
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
  });
  const nodes: Text[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) nodes.push(node as Text);
  const caption: Caption = {
    nodes,
    originals: nodes.map((node) => node.data),
    links: Array.from(text.querySelectorAll<HTMLAnchorElement>('a')),
  };
  captions.set(text, caption);
  return caption;
}

/** Show the first `length` characters of the caption — a link left with none disappears with its words. */
function showCaption(caption: Caption, length: number): void {
  let left = length;
  caption.nodes.forEach((node, i) => {
    const original = caption.originals[i] ?? '';
    node.data = original.slice(0, Math.max(0, left));
    left -= original.length;
  });
  caption.links.forEach((link) => {
    link.hidden = link.textContent === '';
  });
}

/**
 * Collapse the caption to two lines with "… more" right after the last word that fits, as
 * Instagram writes it — not at the far end of the line. The caption is cut at a word, so a
 * `#tag` is whole or gone, and the words after the cut are put back by `expandCaption`.
 * A caption that fits in two lines gets no toggle.
 */
function collapseCaption(text: HTMLElement, more: HTMLElement): void {
  const caption = captionOf(text);
  showCaption(caption, Infinity);
  delete text.dataset.collapsed;
  delete text.dataset.expanded;
  text.after(more);
  more.hidden = true;
  // until it is cut, the text is clamped to its lines by CSS
  if (text.scrollHeight <= text.clientHeight + 1) return;

  text.dataset.collapsed = '';
  text.append(more);
  more.hidden = false;
  const line =
    Number.parseFloat(getComputedStyle(text).lineHeight) || text.clientHeight / CAPTION_LINES;
  const fits = (length: number): boolean => {
    showCaption(caption, length);
    return text.getBoundingClientRect().height <= line * CAPTION_LINES + 1;
  };
  const full = caption.originals.join('');
  // where a word begins: the only places the caption may be cut
  const cuts: number[] = [0];
  for (let i = 1; i < full.length; i += 1) {
    if (/\s/.test(full.charAt(i - 1)) && !/\s/.test(full.charAt(i))) cuts.push(i);
  }
  let low = 0;
  let high = cuts.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (fits(full.slice(0, cuts[middle] ?? 0).trimEnd().length)) low = middle;
    else high = middle - 1;
  }
  // the text up to the cut, without the space or the line breaks that led to the next word
  const kept = full.slice(0, cuts[low] ?? 0).trimEnd().length;
  showCaption(caption, kept);
}

/** Put the whole caption back; the toggle drops under it, reading "less". */
function expandCaption(text: HTMLElement, more: HTMLElement): void {
  showCaption(captionOf(text), Infinity);
  delete text.dataset.collapsed;
  text.dataset.expanded = 'true';
  text.after(more);
}

function setupCaption(post: PostView): void {
  const text = post.el.querySelector<HTMLElement>('[data-ig-text]');
  const more = post.el.querySelector<HTMLElement>('[data-ig-more]');
  if (!text || !more) return;
  if (more.getAttribute('aria-expanded') === 'true') return;
  collapseCaption(text, more);
}

function toggleCaption(button: HTMLElement): void {
  const text = button.closest('.ig-pop__caption')?.querySelector<HTMLElement>('[data-ig-text]');
  if (!text) return;
  const expanded = button.getAttribute('aria-expanded') !== 'true';
  button.setAttribute('aria-expanded', String(expanded));
  const label = button.querySelector('[data-ig-more-text]');
  const next = expanded ? button.dataset.igLessLabel : button.dataset.igMoreLabel;
  if (label && next) label.textContent = next;
  if (expanded) expandCaption(text, button);
  else collapseCaption(text, button);
  button.focus({ preventScroll: true });
}

/** A turned phone or a resized window changes where the lines break: the cut is made again. */
let captionFrame = 0;
window.addEventListener('resize', () => {
  if (!active || captionFrame) return;
  const popup = active;
  captionFrame = requestAnimationFrame(() => {
    captionFrame = 0;
    withAnchor(popup, () => {
      popup.posts.forEach((post) => {
        if (post.mounted) setupCaption(post);
      });
    });
    updateCurrent(popup);
  });
});

// ── date ────────────────────────────────────────────────────────────────

/** A page is cached for minutes, a static one for days: "3 days ago" is written when the post is opened. */
function refreshDate(post: PostView): void {
  const time = post.el.querySelector<HTMLTimeElement>('time[data-ig-date]');
  if (!time?.dateTime) return;
  const zone = time.dataset.igZone;
  const text = formatPostDate(time.dateTime, {
    locale: time.dataset.igLocale ?? document.documentElement.lang,
    ...(zone ? { timeZone: zone } : {}),
  });
  if (text) time.textContent = text;
}

// ── share ───────────────────────────────────────────────────────────────

/** Copy through a throw-away textarea — for a page where `navigator.clipboard` does not exist (http). */
function legacyCopy(text: string): boolean {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.cssText = 'position:fixed;inset-block-start:0;opacity:0';
  popupHost().append(area);
  area.select();
  let ok = false;
  try {
    // Deprecated, and the only way to copy on a page without `navigator.clipboard` (plain http).
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  area.remove();
  return ok;
}

/** Inside the dialog, so the focus trap and `inert` leave the selection alone. */
function popupHost(): HTMLElement {
  return document.querySelector<HTMLElement>('[data-ig-popup][data-open="true"]') ?? document.body;
}

async function share(popup: Popup, post: PostView | undefined, button: HTMLElement): Promise<void> {
  const url = post?.permalink;
  if (!url) return;
  let copied = false;
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ url });
      return;
    } catch (error) {
      // The visitor closed the sheet: done. Anything else: fall back to copying.
      if (error instanceof DOMException && error.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    copied = true;
  } catch {
    copied = legacyCopy(url);
  }
  if (!copied) return;
  const status = button.parentElement?.querySelector<HTMLElement>('[data-ig-status]');
  if (!status) return;
  status.textContent = button.dataset.igCopied ?? '';
  window.clearTimeout(popup.statusTimer);
  popup.statusTimer = window.setTimeout(() => {
    status.textContent = '';
  }, STATUS_MS);
}

// ── the list: building and tearing down cards ───────────────────────────

/** The measured limits of a picture box, or what the style sheet gives. */
function mediaLimits(popup: Popup): { min: number; max: number } {
  const media = popup.list.querySelector<HTMLElement>('.ig-pop__media');
  if (media) {
    const style = getComputedStyle(media);
    const max = Number.parseFloat(style.maxHeight);
    const min = Number.parseFloat(style.minHeight);
    if (Number.isFinite(max) && Number.isFinite(min)) return { min, max };
  }
  return { min: 128, max: Math.min(window.innerHeight * 0.85, 736) };
}

/** The proportion the tile shows, when its picture has loaded. */
function tileRatio(post: PostView): number | null {
  const img = post.tile?.querySelector('img');
  return img && img.naturalWidth > 0 && img.naturalHeight > 0
    ? snapRatio(
        clampRatio(img.naturalWidth, img.naturalHeight, RATIO_SANE_MIN, RATIO_SANE_MAX, 0.8),
      )
    : null;
}

/** Give a card that has never been built the height it will most likely have. */
function estimate(popup: Popup, post: PostView): void {
  if (post.mounted || post.height > 0) return;
  const content = post.template.content;
  const text = content.querySelector('[data-ig-text]')?.textContent ?? '';
  const { min, max } = mediaLimits(popup);
  const width = post.el.getBoundingClientRect().width || popup.list.clientWidth;
  const ratio = post.ratioKnown ? post.ratio : (tileRatio(post) ?? post.ratio);
  post.height = estimateHeight({
    width,
    ratio,
    maxMedia: max,
    minMedia: min,
    captionChars: text.trim() === '' ? 0 : text.length + 24,
    charsPerLine: Math.max(20, Math.floor((width - 32) / 7)),
    hasComments: content.querySelector('.ig-pop__comments') !== null,
    hasDate: content.querySelector('time') !== null,
  });
  post.el.style.blockSize = `${String(post.height)}px`;
}

/**
 * Run `change`, and move the scroller by whatever it did to the place of the post in view —
 * cards above it that are built, torn down or told their real proportion change their height,
 * and the post the visitor is reading must not move. (The browser's own scroll anchoring is off
 * on the scroller: Safari has none, and two corrections would add up.)
 */
function withAnchor(popup: Popup, change: () => void, anchorIndex = popup.current): void {
  const anchor = at(popup.posts, anchorIndex)?.el;
  const before = anchor?.isConnected ? anchor.getBoundingClientRect().top : null;
  change();
  if (!anchor || before === null) return;
  const shift = anchorShift(before, anchor.getBoundingClientRect().top);
  if (shift !== 0) popup.scroll.scrollTop += shift;
}

/** Build a post's card: its header and its body, from the templates the server rendered. */
function mountPost(popup: Popup, post: PostView): void {
  if (post.mounted || !popup.head) return;
  const head = popup.head.content.cloneNode(true) as DocumentFragment;
  const user = head.querySelector<HTMLElement>('.ig-pop__user');
  const labelId = `${popup.root.id}-user-${String(post.index)}`;
  if (user) user.id = labelId;
  post.el.replaceChildren(head, post.template.content.cloneNode(true));
  post.el.style.blockSize = '';
  post.el.dataset.mounted = 'true';
  post.el.removeAttribute('aria-busy');
  post.el.removeAttribute('aria-label');
  if (user) post.el.setAttribute('aria-labelledby', labelId);
  post.mounted = true;
  const media = post.el.querySelector<HTMLElement>('[data-ig-media]');
  post.album = albumOf(popup, post, media);
  refreshDate(post);

  // The box takes the proportion of the first picture. The tile shows the same picture uncut (the
  // optimizer keeps the proportion; only CSS crops the tile), so when it has loaded the box is right
  // from the first frame. Otherwise the card starts at the quiet default and takes the proportion
  // of whichever of the tile, the popup's own picture or the clip's poster arrives first.
  const known = post.ratioKnown ? post.ratio : tileRatio(post);
  if (known !== null) {
    post.ratio = known;
    post.ratioKnown = true;
    post.el.style.setProperty('--ig-pop-ar', String(known));
  } else if (media) {
    post.el.style.setProperty('--ig-pop-ar', String(post.ratio));
    let settled = false;
    const take = (w: number, h: number): void => {
      if (settled || !post.mounted) return;
      settled = true;
      setRatio(popup, post, w, h);
    };
    const tile = post.tile?.querySelector('img');
    if (tile) whenSized(tile, take);
    const firstSlide = media.querySelector<HTMLElement>('[data-ig-slide]');
    const own = firstSlide?.querySelector<HTMLImageElement>('img.ig-pop__img');
    const poster =
      firstSlide?.querySelector<HTMLVideoElement>('video[data-poster]')?.dataset.poster;
    if (own) whenSized(own, take);
    else if (poster) whenSized(poster, take);
  }

  // The visitor's sound choice follows every clip; each player starts in sync with its element.
  post.el.querySelectorAll('video').forEach((video) => {
    video.muted = mutedPref;
    syncPlayer(video);
    const src = video.getAttribute('src');
    // A clip that already failed once does not get a second try in this page view.
    if (src && failedClips.has(src)) showFallback(video);
  });

  // The first slide: a clip shows its poster, an album its arrows, counter and dots.
  if (post.album) showSlide(popup, post, 0, true);
  post.el.querySelectorAll<HTMLElement>('[data-ig-slide]').forEach((slide) => {
    if (slide.querySelector('[data-ig-player]')) observeSlide(popup, slide);
  });
  setupCaption(post);
}

/** Tear a card down to an empty box of the height it had, so the scroll bar and the position hold. */
function unmountPost(popup: Popup, post: PostView): void {
  if (!post.mounted) return;
  if (post.el.contains(document.activeElement)) post.el.focus({ preventScroll: true });
  post.height = post.el.getBoundingClientRect().height;
  post.el.querySelectorAll<HTMLElement>('[data-ig-slide]').forEach((slide) => {
    popup.observer?.unobserve(slide);
  });
  post.el.querySelectorAll('video').forEach((video) => {
    video.pause();
  });
  post.el.replaceChildren();
  post.el.style.blockSize = `${String(post.height)}px`;
  post.el.dataset.mounted = 'false';
  post.el.setAttribute('aria-busy', 'true');
  post.el.removeAttribute('aria-labelledby');
  const alt = post.template.dataset.igAlt;
  if (alt) post.el.setAttribute('aria-label', alt);
  post.mounted = false;
  post.album = null;
}

/** The posts around the current one carry their pictures; the others are empty boxes. */
function syncWindow(popup: Popup, anchorIndex = popup.current): void {
  const [first, last] = mountWindow(popup.current, popup.posts.length);
  withAnchor(
    popup,
    () => {
      popup.posts.forEach((post) => {
        if (post.index >= first && post.index <= last) mountPost(popup, post);
        else unmountPost(popup, post);
      });
      popup.posts.forEach((post) => {
        estimate(popup, post);
        warmPost(popup, post);
      });
    },
    anchorIndex,
  );
}

function updateSteps(popup: Popup): void {
  const last = popup.posts.length - 1;
  popup.steps.forEach((button) => {
    const by = Number(button.dataset.igStep);
    const hide = stepTarget(popup.current, by, popup.posts.length) === null;
    if (button.hidden === hide) return;
    const held = document.activeElement === button;
    button.hidden = hide;
    // a button that goes away must not take the focus with it
    if (held && hide)
      at(popup.posts, Math.min(Math.max(popup.current, 0), last))?.el.focus({
        preventScroll: true,
      });
  });
}

/** The post with the most of itself in view is the current one: the list builds around it. */
function updateCurrent(popup: Popup): void {
  const view = popup.scroll.getBoundingClientRect();
  const spans = popup.posts.map((post) => {
    const box = post.el.getBoundingClientRect();
    return { top: box.top, bottom: box.bottom };
  });
  const index = currentPost(spans, view.top, view.bottom);
  if (index >= 0 && index !== popup.current) {
    popup.current = index;
    syncWindow(popup);
    reconcileVideos(popup);
  }
  updateSteps(popup);
}

/** Scroll so that post `index` starts where the first one does (one margin below the top, none on a phone). */
function goToPost(popup: Popup, index: number, smooth: boolean): void {
  const post = at(popup.posts, index);
  if (!post) return;
  // build it and its neighbours first, so the place it is scrolled to is a real one
  const [first, last] = mountWindow(index, popup.posts.length);
  withAnchor(popup, () => {
    for (let i = first; i <= last; i += 1) {
      const neighbour = at(popup.posts, i);
      if (neighbour) mountPost(popup, neighbour);
    }
  });
  const margin = Number.parseFloat(getComputedStyle(popup.list).paddingTop) || 0;
  const top =
    post.el.getBoundingClientRect().top -
    popup.scroll.getBoundingClientRect().top +
    popup.scroll.scrollTop -
    margin;
  popup.scroll.scrollTo({ top, behavior: smooth && !reducedMotion() ? 'smooth' : 'auto' });
}

/** Focus goes back to the tile of the post that was in view when the popup closed. */
function focusTile(popup: Popup): void {
  const tiles = [at(popup.posts, popup.current)?.tile, popup.opener];
  for (const tile of tiles) {
    if (tile && tile.offsetParent !== null) {
      tile.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      tile.focus({ preventScroll: true });
      return;
    }
  }
}

// ── events ──────────────────────────────────────────────────────────────

function onClick(event: MouseEvent, popup: Popup): void {
  const target = event.target as Element;
  const toggle = target.closest<HTMLElement>('[data-ig-toggle]');
  const mute = target.closest<HTMLElement>('[data-ig-mute]');
  const reveal = target.closest<HTMLElement>('[data-ig-reveal]');
  const post = postOf(popup, target);
  if (target.closest('[data-ig-close]')) {
    closeModal(popup.root.id);
  } else if (target.closest('[data-ig-step]')) {
    const by = Number(target.closest<HTMLElement>('[data-ig-step]')?.dataset.igStep);
    const next = stepTarget(popup.current, by, popup.posts.length);
    if (next !== null) goToPost(popup, next, true);
  } else if (reveal) {
    revealNotice(reveal);
  } else if (toggle) {
    const video = videoOf(toggle);
    if (video) togglePlay(popup, video);
  } else if (mute) {
    setMuted(popup, mute.dataset.muted !== 'true');
  } else if (target.closest('[data-ig-slide-prev]')) {
    turn(post, -1);
  } else if (target.closest('[data-ig-slide-next]')) {
    turn(post, 1);
  } else if (
    (target === popup.scroll || target === popup.list) &&
    window.matchMedia('(min-width: 640px)').matches
  ) {
    // beside the column of cards: the backdrop
    closeModal(popup.root.id);
  } else {
    const more = target.closest<HTMLElement>('[data-ig-more]');
    const button = target.closest<HTMLElement>('[data-ig-share]');
    if (more) toggleCaption(more);
    else if (button) void share(popup, post, button);
  }
}

function onKeydown(event: KeyboardEvent, popup: Popup): void {
  const target = event.target as HTMLElement;
  if (target.matches('[role="slider"]') && onSliderKey(event, target)) return;
  if (event.key === 'Tab') {
    // The engine wraps the first and last control. This catches the one case it
    // cannot: focus on the first card itself (a click on its text), which sits before
    // the first control in the order and would let Shift+Tab leave the dialog.
    if (event.shiftKey && target === at(popup.posts, 0)?.el) {
      const list = focusables(popup);
      const last = at(list, -1);
      if (last) {
        event.preventDefault();
        last.focus();
      }
    }
    return;
  }
  const step = keyStep(event.key, {
    alt: event.altKey,
    ctrl: event.ctrlKey,
    meta: event.metaKey,
    shift: event.shiftKey,
  });
  if (step !== null) {
    event.preventDefault();
    const next = stepTarget(popup.current, step, popup.posts.length);
    if (next !== null) goToPost(popup, next, true);
    return;
  }
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  if (target.closest('input, select, textarea')) return;
  // the album of the post the key was pressed in (or, outside every post, of the one in view)
  const post = postOf(popup, target);
  if (!post?.album) return;
  event.preventDefault();
  turn(post, event.key === 'ArrowRight' ? 1 : -1);
}

// ── entry ───────────────────────────────────────────────────────────────

/**
 * Open the popup at the post `postId` of `feed`: the list of all the feed's posts, scrolled so
 * that this one starts at the top. Returns `false` when there is nothing to open (no template —
 * an old cached page), so the caller can fall back to the link.
 */
export function openPopup(
  feed: HTMLElement,
  postId: string,
  opener: HTMLElement,
  viaKeyboard = false,
): boolean {
  // a hover preview in the grid stops: nothing plays beside the popup's own clips
  document.dispatchEvent(new CustomEvent('ig:popup-open'));
  const popup = popupOf(feed);
  const index = popup?.posts.findIndex((post) => post.id === postId) ?? -1;
  if (!popup || index < 0) return false;

  popup.observer?.disconnect();
  popup.observer = null;
  pauseAll(popup);
  // a clean start: nothing of the last visit is left built, whatever the list looked like then
  popup.posts.forEach((post) => {
    unmountPost(popup, post);
  });
  popup.opener = opener;
  copyVariables(feed, popup);
  popup.scroll.scrollTop = 0;
  popup.current = index;
  syncWindow(popup);
  goToPost(popup, index, false);

  active = popup;
  // A reflow, so a dialog created a moment ago still plays its fade-in.
  void popup.root.offsetWidth;
  openModal(popup.root.id);
  // The engine has just focused the first control it found — the first built card's header — and
  // the browser scrolled it into view. Back to the post that was asked for.
  goToPost(popup, index, false);
  updateSteps(popup);
  // The engine focuses the first control. Opened with the keyboard, the visitor starts on the
  // × of the post they chose — Enter there leaves nothing behind, and its focus ring is expected.
  // Opened with a pointer, the post's card takes the focus (no ring, still inside the trap, Tab
  // and the keys work from there).
  const card = at(popup.posts, index)?.el;
  focusWhenReady(viaKeyboard ? card?.querySelector<HTMLElement>('[data-ig-close]') : card);
  return true;
}

/** Forget the popup of a feed that was rendered again: its templates are gone, so is its dialog. */
export function resetPopup(feed: HTMLElement): void {
  const popup = popups.get(feed);
  if (!popup) return;
  if (popup.root.dataset.open === 'true') closeModal(popup.root.id);
  popup.observer?.disconnect();
  popup.root.remove();
  popups.delete(feed);
}
