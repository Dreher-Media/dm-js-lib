/**
 * What the Instagram post popup writes out: counts, the post date, the caption's links,
 * the album's dots, a picture's box. Instagram's own mobile feed is the model.
 *
 * Pure and import-free on purpose: the popup (`../popup.ts`) calls it in the browser and `../instagramFeed.test.ts`
 * tests it. Ported unchanged from `astro-client-template` (`src/lib/instagram-format.ts`)
 */

/** A locale tag the platform rejects must not take the popup down: fall back to English. */
function usableLocale(locale: string): string {
  try {
    return Intl.NumberFormat.supportedLocalesOf(locale).length > 0 ? locale : 'en';
  } catch {
    return 'en';
  }
}

// ── counts ──────────────────────────────────────────────────────────────

/** Compact suffixes per language: thousands, millions. CLDR's German short form has none, so ours. */
const COUNT_UNITS: Partial<Record<string, readonly [string, string]>> = {
  de: [' Tsd.', ' Mio.'],
  en: ['K', 'M'],
};

/** A count with every digit — what a screen reader gets (`12.345`), not the abbreviation under it. */
export function formatWhole(value: number, locale: string): string {
  const whole = Math.max(0, Math.trunc(Number.isFinite(value) ? value : 0));
  return new Intl.NumberFormat(usableLocale(locale)).format(whole);
}

/** From this value on a count is abbreviated; below it every digit is shown. */
const COUNT_COMPACT_FROM = 10_000;

/**
 * A like or comment count the way Instagram's feed writes it: whole up to 9,999
 * (`1.284` / `1,284`), abbreviated from 10,000 (`12,3 Tsd.` / `12.3K`, `1,2 Mio.` / `1.2M`).
 * Rounds down, so a post is never credited with more than it has. Languages without a
 * table here use the platform's own compact notation.
 */
export function formatCount(value: number, locale: string): string {
  const tag = usableLocale(locale);
  const whole = Math.max(0, Math.trunc(Number.isFinite(value) ? value : 0));
  if (whole < COUNT_COMPACT_FROM) return formatWhole(whole, tag);

  const units = COUNT_UNITS[tag.split('-')[0]?.toLowerCase() ?? ''];
  if (!units) {
    return new Intl.NumberFormat(tag, { notation: 'compact', maximumFractionDigits: 1 }).format(
      whole,
    );
  }
  const [thousand, million] = units;
  const millions = whole >= 1_000_000;
  const scaled = Math.floor((whole / (millions ? 1_000_000 : 1_000)) * 10) / 10;
  return `${new Intl.NumberFormat(tag, { maximumFractionDigits: 1 }).format(scaled)}${millions ? million : thousand}`;
}

// ── the post's date ─────────────────────────────────────────────────────

export interface DateOptions {
  /** The reader's locale — `de`, `en-GB`. */
  locale: string;
  /** The zone the day is read in. A post at 23:30 UTC is already tomorrow in Berlin. */
  timeZone?: string;
  /** The moment "now" is measured from. Tests pass one; the page passes nothing. */
  now?: Date;
}

const MINUTE = 60;
const HOUR = 3600;
const DAY = 86_400;
/** Younger than this reads relative ("3 days ago"); older, as a calendar date. */
const RELATIVE_DAYS = 7;

function formatter(
  locale: string,
  options: Intl.DateTimeFormatOptions,
  timeZone: string | undefined,
): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat(locale, timeZone ? { ...options, timeZone } : options);
  } catch {
    // an unknown time zone: the visitor's own is better than no date
    return new Intl.DateTimeFormat(locale, options);
  }
}

/**
 * The date line under a post, as Instagram's feed writes it: younger than a week relative
 * ("3 days ago" / "vor 3 Tagen", "now" under a minute), older as "14. April" in the current
 * year and "18. Mai 2025" in any other. `''` for a timestamp that is not one.
 */
export function formatPostDate(timestamp: string, options: DateOptions): string {
  const then = new Date(timestamp);
  if (!timestamp || Number.isNaN(then.getTime())) return '';
  const locale = usableLocale(options.locale);
  const now = options.now ?? new Date();
  // a clock a little ahead of Instagram's must not print "in 2 minutes"
  const age = Math.max(0, (now.getTime() - then.getTime()) / 1000);

  if (age < RELATIVE_DAYS * DAY) {
    if (age < MINUTE) {
      return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(0, 'second');
    }
    const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'always' });
    if (age < HOUR) return relative.format(-Math.floor(age / MINUTE), 'minute');
    if (age < DAY) return relative.format(-Math.floor(age / HOUR), 'hour');
    return relative.format(-Math.floor(age / DAY), 'day');
  }

  const yearOf = (date: Date) =>
    formatter('en', { year: 'numeric' }, options.timeZone).format(date);
  const sameYear = yearOf(then) === yearOf(now);
  return formatter(
    locale,
    sameYear
      ? { day: 'numeric', month: 'long' }
      : { day: 'numeric', month: 'long', year: 'numeric' },
    options.timeZone,
  ).format(then);
}

// ── the caption ─────────────────────────────────────────────────────────

export interface CaptionPart {
  /** `text` is plain; `tag` and `mention` carry the link Instagram would. */
  type: 'text' | 'tag' | 'mention';
  /** What is shown — `#berlin`, `@someone`, or the words around them. */
  text: string;
  /** `tag` and `mention` only: an https link on instagram.com. */
  href?: string;
}

/**
 * `#tag` after a non-word character, with a letter in it (`#2024` is no hashtag on Instagram),
 * or `@name` — letters, digits, `.` and `_`, up to 30, never ending in a dot. Neither starts
 * inside a word, an address (`me@host.de`) or a URL fragment (`/#top`).
 */
const CAPTION_TOKEN =
  /(?<![\p{L}\p{N}\p{M}_&/.:#@])(?:#(?=[\p{L}\p{N}\p{M}_]*\p{L})([\p{L}\p{N}\p{M}_]+)|@([A-Za-z0-9_](?:[A-Za-z0-9._]{0,28}[A-Za-z0-9_])?))/gu;

/**
 * Break a caption into plain text, hashtags and @mentions. A caption is somebody else's
 * text: this only splits it, never interprets markup — the caller prints every part as text
 * and builds the links from `href` itself.
 */
export function splitCaption(caption: string): CaptionPart[] {
  const parts: CaptionPart[] = [];
  let cursor = 0;
  const pushText = (text: string): void => {
    if (text) parts.push({ type: 'text', text });
  };
  for (const match of caption.matchAll(CAPTION_TOKEN)) {
    const [whole, tag, name] = match;
    pushText(caption.slice(cursor, match.index));
    if (tag) {
      parts.push({
        type: 'tag',
        text: whole,
        href: `https://www.instagram.com/explore/tags/${encodeURIComponent(tag.toLowerCase())}/`,
      });
    } else if (name) {
      parts.push({
        type: 'mention',
        text: whole,
        href: `https://www.instagram.com/${encodeURIComponent(name.toLowerCase())}/`,
      });
    }
    cursor = match.index + whole.length;
  }
  pushText(caption.slice(cursor));
  return parts;
}

// ── the album ───────────────────────────────────────────────────────────

/** How many dots the album shows at once; more slides shrink the outer ones, as the app does. */
export const DOTS_VISIBLE = 5;

/**
 * The size of every dot, `0` (not shown) to `1`. Up to five slides every dot is full size.
 * Beyond that a window of five follows the current slide, and a window edge that has more
 * slides behind it is half size — the cue that the row goes on.
 */
export function dotScales(index: number, total: number, visible = DOTS_VISIBLE): number[] {
  const count = Math.max(0, Math.trunc(total));
  if (count <= visible) return Array.from({ length: count }, () => 1);
  const current = Math.min(Math.max(Math.trunc(index), 0), count - 1);
  const start = Math.min(Math.max(current - Math.floor(visible / 2), 0), count - visible);
  const end = start + visible - 1;
  return Array.from({ length: count }, (_, i) => {
    if (i < start || i > end) return 0;
    if ((i === start && start > 0) || (i === end && end < count - 1)) return 0.5;
    return 1;
  });
}

/**
 * The share of a slide's width a drag must scroll the album to turn it, however slowly it is
 * made. Measured on Instagram (390 px, finger on glass): 30 px stays, 50 px turns, so about
 * 10 % of the width. The browser takes the first ~15 px of a touch for itself (its touch slop)
 * before the track moves, so the offset that is measured here is a little shorter than the
 * finger's way: 8 %.
 */
export const TURN_THRESHOLD = 0.08;

/**
 * Where a released album settles. `position` is the scroll offset in slides (1.4 = 40 % of the
 * way from the second to the third), `start` the slide the finger left. The browser's own snap
 * rounds to the nearest slide, which asks for half a width of dragging; Instagram turns on a
 * short drag, so a drag past `threshold` goes on to the neighbour even when it is still nearer
 * the one it came from.
 */
export function settleIndex(
  position: number,
  start: number,
  count: number,
  threshold = TURN_THRESHOLD,
): number {
  const last = Math.max(0, count - 1);
  const nearest = Math.min(Math.max(Math.round(position), 0), last);
  if (nearest !== start) return nearest;
  const moved = position - start;
  if (moved > threshold) return Math.min(start + 1, last);
  if (moved < -threshold) return Math.max(start - 1, 0);
  return start;
}

// ── the picture's box ───────────────────────────────────────────────────

/**
 * The proportion (width ÷ height) a post's picture box takes: the picture's own, uncut. `min`
 * and `max` are only a guard against a broken measurement (a 0-wide image, a 1 : 100 sliver) —
 * how high the box may get is a matter of CSS (`--ig-popup-media-max-h`, `-min-h`), and a
 * picture that does not fill the box is fitted in. Anything that is not a proportion gives
 * `fallback`.
 */
export function clampRatio(
  width: number,
  height: number,
  min: number,
  max: number,
  fallback = min,
): number {
  if (!(width > 0) || !(height > 0)) return fallback;
  return Math.min(Math.max(width / height, min), max);
}

/** The proportions photos and clips really come in. */
const COMMON_RATIOS = [
  9 / 16,
  2 / 3,
  3 / 4,
  4 / 5,
  1,
  5 / 4,
  4 / 3,
  3 / 2,
  16 / 9,
  1.91,
  2,
  3,
] as const;

/**
 * A proportion measured from a small picture is a pixel or two off (a 1080 × 1350 photo shown
 * 129 px wide is 129 × 162, not 129 × 161.25) — and a box that is 1 % off the picture leaves
 * a hairline of black along its edges. A measurement within 1.2 % of one of the proportions
 * cameras and Instagram produce is that proportion; anything else is kept as measured.
 */
export function snapRatio(ratio: number, tolerance = 0.012): number {
  for (const known of COMMON_RATIOS) {
    if (Math.abs(ratio - known) / known <= tolerance) return known;
  }
  return ratio;
}

// ── the end of the list ─────────────────────────────────────────────────

/** What the popup's closing line says. */
export type FeedEnd =
  /** There are `remaining` more posts on Instagram than the popup shows. */
  | { kind: 'count'; remaining: number }
  /** There are more, and how many is not known. */
  | { kind: 'more' }
  /** Everything the account has is shown. */
  | { kind: 'all' }
  /** Nothing is known: nothing is claimed. */
  | { kind: 'unknown' };

/**
 * What to say after the last post. `shown` is how many posts the popup actually holds (it can be fewer
 * than the feed delivered: `popupLimit`), `delivered` how many the feed brought, `mediaCount` the account's
 * total on Instagram and `more` the connector's yes / no for posts beyond the delivered ones — either
 * may be missing.
 *
 * A known total decides: more than shown is "N more", the rest is "all shown". Without it, posts the
 * popup holds back (`delivered` above `shown`) or `more === true` say "there are more"; `more === false`
 * says "all"; nothing at all says nothing.
 */
export function feedEnd(input: {
  shown: number;
  delivered: number;
  mediaCount?: number | undefined;
  more?: boolean | undefined;
}): FeedEnd {
  const shown = Math.max(0, Math.trunc(input.shown));
  if (input.mediaCount !== undefined && Number.isFinite(input.mediaCount)) {
    const remaining = Math.max(0, Math.trunc(input.mediaCount) - shown);
    return remaining > 0 ? { kind: 'count', remaining } : { kind: 'all' };
  }
  if (input.delivered > shown || input.more === true) return { kind: 'more' };
  if (input.more === false) return { kind: 'all' };
  return { kind: 'unknown' };
}
