/**
 * Plyr bundle - install step
 *
 * `dist/standalone/plyr.min.js` ships Plyr (script, stylesheet and icon sprite) in one
 * file, so a page can serve it from its own origin instead of letting the video-player
 * module fetch it from cdn.plyr.io on the first click. This function does what the CDN
 * route would have done, without a single request:
 *
 *   - exposes the library as `window.Plyr` (the module uses a ready `window.Plyr` as is),
 *   - injects the stylesheet,
 *   - injects the icon sprite and tells Plyr not to download it (`loadSprite: false`),
 *   - points Plyr's blank-video placeholder at a data: URI, so nothing is requested from
 *     cdn.plyr.io when a player cancels its download.
 *
 * It is idempotent and never overwrites a `window.Plyr` the page provides itself.
 */

type PlyrStatic = {
  setup(targets: unknown, options?: unknown): unknown[];
  defaults: Record<string, unknown>;
};

const STYLE_ATTR = 'data-dm-plyr-style';
const SPRITE_ATTR = 'data-dm-plyr-sprite';
const BLANK_VIDEO = 'data:video/mp4;base64,';

/** The sprite file starts with an XML prolog and a DOCTYPE, which cannot sit inside a page. */
function stripProlog(svg: string): string {
  return svg
    .replace(/<\?xml[\s\S]*?\?>/, '')
    .replace(/<!DOCTYPE[\s\S]*?>/i, '')
    .trim();
}

/** Comments and indentation only; every value and selector stays as Plyr wrote it. */
export function minifyCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('');
}

export function installPlyr(
  PlyrClass: PlyrStatic,
  css: string,
  sprite: string,
  win: Window = window,
): void {
  const doc = win.document;

  const host = win as unknown as { Plyr?: unknown };
  if (!host.Plyr) host.Plyr = PlyrClass;

  // Plyr merges `Plyr.defaults` into every player's config.
  PlyrClass.defaults.loadSprite = false;
  PlyrClass.defaults.blankVideo = BLANK_VIDEO;

  if (!doc.querySelector(`style[${STYLE_ATTR}]`)) {
    const style = doc.createElement('style');
    style.setAttribute(STYLE_ATTR, '');
    style.textContent = minifyCss(css);
    (doc.head || doc.documentElement).appendChild(style);
  }

  const addSprite = (): void => {
    if (doc.querySelector(`[${SPRITE_ATTR}]`)) return;
    const holder = doc.createElement('div');
    holder.setAttribute(SPRITE_ATTR, '');
    holder.setAttribute('aria-hidden', 'true');
    // Not display:none: browsers do not resolve <use> references into a hidden sprite reliably.
    holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    holder.innerHTML = stripProlog(sprite);
    doc.body.insertBefore(holder, doc.body.firstChild);
  };

  if (doc.body) addSprite();
  else doc.addEventListener('DOMContentLoaded', addSprite, { once: true });
}
