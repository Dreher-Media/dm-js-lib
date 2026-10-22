/**
 * Media protection of `<InstagramFeed>`: what the page does to stop the NORMAL ways of taking a
 * picture or a clip — right click ("Save image as", "Copy image", "Open image in new tab", "Save
 * video as"), dragging it out of the page, a long press on a phone. It is a courtesy against the
 * casual copy and nothing more: a screenshot, the developer tools, the network panel, an extension
 * or the picture's URL copied from the network panel always work, and no script can change that.
 *
 * Pure and import-free, like `instagram-format.ts`: the module's `index.ts` calls it in the browser,
 * `../instagramFeed.test.ts` tests it. Ported unchanged from `astro-client-template`.
 */

/**
 * The elements that ARE the media of the feed, as selectors: a tile of the grid or the carousel, a
 * post's picture box in the popup (its pictures, its clips, its controls), and — for dragging
 * only — the avatar. Every selector hangs off the `data-ig-protect` attribute the component sets
 * unless `protectMedia={false}`.
 */
export const CONTEXT_MEDIA = [
  '.ig-feed[data-ig-protect] .ig-feed__tile',
  '.ig-pop[data-ig-protect] .ig-pop__media',
] as const;
export const DRAG_MEDIA = [...CONTEXT_MEDIA, '.ig-pop[data-ig-protect] .ig-pop__avatar'] as const;

/**
 * The player's and the album's own controls inside a picture box: they keep their (plain) menus. The
 * big play / pause surface over the picture is NOT one of them — it is the picture, as far as the
 * right click goes.
 */
export const CONTROLS =
  '[data-ig-mute], [data-ig-scrub], [data-ig-slide-prev], [data-ig-slide-next]';

/** What a `contextmenu` event came from. */
export interface ContextOrigin {
  /** The target is inside a picture box or a tile (`CONTEXT_MEDIA`). */
  inMedia: boolean;
  /** The target is, or is inside, one of the player's own buttons or its slider. */
  onControl: boolean;
  /** The menu key or Shift+F10 asked for it, not a pointer: it stays, for the keyboard user. */
  fromKeyboard: boolean;
}

/**
 * Does the page swallow this context menu? Only on the media: not on text (the caption stays
 * selectable and copyable), not on links (the profile, "View all comments" and the hashtags keep
 * "Open in new tab"), not on buttons and the slider, and never for the keyboard's menu key.
 */
export function blocksContextMenu(origin: ContextOrigin): boolean {
  return origin.inMedia && !origin.onControl && !origin.fromKeyboard;
}

/**
 * Did the menu key (or Shift+F10) raise this `contextmenu`, rather than a pointer? Measured: Chromium
 * gives such an event `button === -1` (a right click has 2, a touch long press 0); Firefox marks the
 * keyboard as `mozInputSource === 6`. Anything else is a pointer.
 */
export function isKeyboardContext(event: { button: number; mozInputSource?: number }): boolean {
  return event.button === -1 || event.mozInputSource === 6;
}
