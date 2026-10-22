/**
 * The arithmetic of the popup's post list: which post is the one in view, which posts carry their
 * pictures, where a step lands, how high a post that is not there yet will be, what a key does.
 *
 * Pure and import-free on purpose, like `instagram-format.ts`: `../popup.ts` calls it in the browser,
 * `../instagramFeed.test.ts` tests it. Ported unchanged from `astro-client-template`
 */

/** A post's place on the scroller, in the scroller's own coordinates. */
export interface Span {
  top: number;
  bottom: number;
}

/** How many pixels of a post are inside the window `[viewTop, viewBottom]`. */
export function visiblePx(span: Span, viewTop: number, viewBottom: number): number {
  return Math.max(0, Math.min(span.bottom, viewBottom) - Math.max(span.top, viewTop));
}

/**
 * The post that is "the" post at the moment: the one with the most of itself in the window
 * (the first, when two share). With nothing in the window — the list is shorter than the gap
 * to its first post, say — the one nearest to it. `-1` for an empty list.
 */
export function currentPost(spans: readonly Span[], viewTop: number, viewBottom: number): number {
  let best = -1;
  let bestPx = 0;
  spans.forEach((span, i) => {
    const px = visiblePx(span, viewTop, viewBottom);
    if (px > bestPx) {
      best = i;
      bestPx = px;
    }
  });
  if (best >= 0 || spans.length === 0) return best;
  let nearest = 0;
  let nearestDistance = Infinity;
  spans.forEach((span, i) => {
    const distance = span.bottom < viewTop ? viewTop - span.bottom : span.top - viewBottom;
    if (distance < nearestDistance) {
      nearest = i;
      nearestDistance = distance;
    }
  });
  return nearest;
}

/** How many posts on each side of the current one carry their pictures. */
export const MOUNT_RADIUS = 2;

/** The posts that are mounted while `current` is in view: `[first, last]`, inclusive, inside the list. */
export function mountWindow(
  current: number,
  total: number,
  radius = MOUNT_RADIUS,
): [number, number] {
  if (total <= 0) return [0, -1];
  const middle = Math.min(Math.max(Math.trunc(current), 0), total - 1);
  return [Math.max(0, middle - radius), Math.min(total - 1, middle + radius)];
}

/** The post a step of `by` leads to, or `null` where there is none (before the first, after the last). */
export function stepTarget(current: number, by: number, total: number): number | null {
  const target = current + by;
  return target >= 0 && target < total && target !== current ? target : null;
}

/**
 * What a key does in the list. Page Up / Page Down go to the previous / next post; the arrow
 * keys keep their own work — Left / Right turn an album's slides, Up / Down scroll a line (and
 * seek on a clip's progress slider) — and are not taken here. A key with a modifier is the
 * browser's.
 */
export function keyStep(
  key: string,
  modifiers: { alt?: boolean; ctrl?: boolean; meta?: boolean; shift?: boolean } = {},
): -1 | 1 | null {
  if (modifiers.alt || modifiers.ctrl || modifiers.meta || modifiers.shift) return null;
  if (key === 'PageUp') return -1;
  if (key === 'PageDown') return 1;
  return null;
}

/** What a post is made of, as far as it decides its height. */
export interface PostShape {
  /** The card's width. */
  width: number;
  /** The first picture's width ÷ height; `0.8` while it is not known. */
  ratio: number;
  /** The highest and the lowest the picture box gets. */
  maxMedia: number;
  minMedia: number;
  /** The caption's length in characters (`0`: none) and how many characters a line holds. */
  captionChars: number;
  charsPerLine: number;
  /** Whether the "View all comments" link shows. */
  hasComments: boolean;
  /** Whether there is a date line. */
  hasDate: boolean;
}

/** The heights, in px, of the parts of a mounted card (measured, 390 px): header, icon row, line, under the date. */
export const HEAD_H = 56;
const ACTIONS_H = 50;
const LINE_H = 18;
const CAPTION_GAP = 8;
const CAPTION_MAX_LINES = 2;
const COMMENTS_H = 22;
const DATE_H = 22;
const UNDER_H = 16;

/**
 * How high a post will be before it is built — what an empty card takes, so the scroll bar and the
 * position hold still while the cards around the visitor are built and torn down. The pictures'
 * box is exact when the proportion is known; the caption is the one guess (one line or two).
 * Once a card is mounted its real height replaces this.
 */
export function estimateHeight(shape: PostShape): number {
  const box = Math.min(
    Math.max(shape.width / Math.max(shape.ratio, 0.1), shape.minMedia),
    shape.maxMedia,
  );
  const lines =
    shape.captionChars > 0
      ? Math.min(
          CAPTION_MAX_LINES,
          Math.max(1, Math.ceil(shape.captionChars / Math.max(shape.charsPerLine, 1))),
        )
      : 0;
  const caption = lines > 0 ? CAPTION_GAP + lines * LINE_H : 0;
  return Math.round(
    HEAD_H +
      box +
      ACTIONS_H +
      caption +
      (shape.hasComments ? COMMENTS_H : 0) +
      (shape.hasDate ? DATE_H : 0) +
      UNDER_H,
  );
}

/**
 * How far to move the scroller so that the post in view stays where it was when the cards above
 * it change height: the difference between where its top was and where it is now. `0` for a
 * shift too small to see.
 */
export function anchorShift(topBefore: number, topAfter: number): number {
  const shift = topAfter - topBefore;
  return Math.abs(shift) < 0.5 ? 0 : shift;
}
