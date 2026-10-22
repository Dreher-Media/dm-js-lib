/**
 * The hover preview of a video tile: when it may start, how long the pointer has to rest on the tile
 * first, and what the tile does as the pointer comes and goes. A small state machine with no DOM in
 * it — `../preview.ts` runs it in the browser, `../instagramFeed.test.ts` tests it.
 * Ported unchanged from `astro-client-template`.
 *
 * The connector that serves the clips allows 8 streams at once and 120 video requests a minute per
 * address. So: one preview at a time, none before the pointer has rested (`HOVER_DELAY_MS`), a
 * pointer that moves on aborts the request, no start closer to the last one than `MIN_START_GAP_MS`
 * (60 starts a minute, which is at most 120 requests even when the browser asks twice), and a clip
 * that failed is not asked for again.
 */

/** How long the pointer must rest on a tile before its clip is requested. */
export const HOVER_DELAY_MS = 100;

/** The least time between two starts. */
export const MIN_START_GAP_MS = 1000;

/** What decides whether a tile may preview, at the moment the pointer arrives. */
export interface Environment {
  /** A fine pointer that can hover (`(hover: hover) and (pointer: fine)`). */
  finePointer: boolean;
  reducedMotion: boolean;
  saveData: boolean;
  /** The popup is open, or the tab is hidden. */
  suspended: boolean;
}

/**
 * May this tile play a preview? Needs a pointer that hovers, no wish for less motion or less data,
 * nothing else on screen playing (the popup), a clip file, and a file that has not failed before.
 */
export function previewAllowed(
  environment: Environment,
  src: string | undefined,
  failed: ReadonlySet<string>,
): boolean {
  return (
    environment.finePointer &&
    !environment.reducedMotion &&
    !environment.saveData &&
    !environment.suspended &&
    typeof src === 'string' &&
    src !== '' &&
    !failed.has(src)
  );
}

/** The wait before a start: the hover delay, stretched so that two starts are `MIN_START_GAP_MS` apart. */
export function startDelay(now: number, lastStart: number | null): number {
  if (lastStart === null) return HOVER_DELAY_MS;
  return Math.max(HOVER_DELAY_MS, lastStart + MIN_START_GAP_MS - now);
}

/** `idle`: nothing; `waiting`: the pointer is resting, nothing requested; `running`: the clip was started. */
export type PreviewState =
  | { phase: 'idle' }
  | { phase: 'waiting'; tile: string }
  | { phase: 'running'; tile: string };

export type PreviewEvent =
  /** The pointer came onto a tile; `allowed` is `previewAllowed(…)` for it. */
  | { type: 'enter'; tile: string; allowed: boolean }
  | { type: 'leave'; tile: string }
  /** The wait is over. */
  | { type: 'elapsed'; tile: string }
  /** The popup opened, the carousel moved, the tab was hidden: everything stops. */
  | { type: 'stop' }
  /** The clip of this tile failed to play. */
  | { type: 'failed'; tile: string };

export type PreviewAction =
  | { type: 'wait' }
  | { type: 'cancelWait' }
  | { type: 'start' }
  | { type: 'stop' }
  | { type: 'remember' };

const IDLE: PreviewState = { phase: 'idle' };

/** Stop whatever is going on: cancel a wait, tear a running preview down. */
function halt(state: PreviewState): PreviewAction[] {
  if (state.phase === 'waiting') return [{ type: 'cancelWait' }];
  if (state.phase === 'running') return [{ type: 'stop' }];
  return [];
}

/** The next state, and what the browser side has to do about it. */
export function step(
  state: PreviewState,
  event: PreviewEvent,
): { state: PreviewState; actions: PreviewAction[] } {
  switch (event.type) {
    case 'enter':
      if (state.phase !== 'idle' && state.tile === event.tile) return { state, actions: [] };
      if (!event.allowed) return { state: IDLE, actions: halt(state) };
      return {
        state: { phase: 'waiting', tile: event.tile },
        actions: [...halt(state), { type: 'wait' }],
      };
    case 'leave':
      if (state.phase === 'idle' || state.tile !== event.tile) return { state, actions: [] };
      return { state: IDLE, actions: halt(state) };
    case 'elapsed':
      if (state.phase !== 'waiting' || state.tile !== event.tile) return { state, actions: [] };
      return { state: { phase: 'running', tile: event.tile }, actions: [{ type: 'start' }] };
    case 'stop':
      return { state: IDLE, actions: halt(state) };
    case 'failed':
      if (state.phase === 'idle' || state.tile !== event.tile) return { state, actions: [] };
      return { state: IDLE, actions: [...halt(state), { type: 'remember' }] };
  }
}
