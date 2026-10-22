/**
 * The stylesheet, injected once. It is the `<style>` of `InstagramFeed.astro` in `astro-client-template`
 * (grid, carousel, tiles, hover preview, the post popup, media protection), compacted, with three
 * changes for a Webflow page:
 *
 *   - the template's design tokens (`--space-*`, `--radius-*`, `--text-*`, …) are given their template
 *     values on `.ig-feed` and `.ig-pop`, so the rules read them unchanged; a site's own tokens of
 *     the same name do not reach in,
 *   - a small reset, because a Webflow page has global rules for lists, links, images and buttons
 *     (all of it `:where()`, i.e. specificity zero: the rules below still win over it),
 *   - the popup sits above everything (`--ig-popup-z`), Webflow's navbar and sticky elements included.
 *
 * Every rule is one or two classes deep, so a rule of your own that comes later overrides it, or set
 * the `--ig-*` variables. When the Astro component's CSS changes, change it here too.
 */
const STYLE_ATTR = 'data-dm-ig-feed-style';

const TOKENS =
  '.ig-feed,.ig-pop{--color-white:#fff;--color-black:#000;--font-weight-regular:400;--font-weight-semibold:600;--text-xs:12px;--text-sm:14px;--space-1:4px;--space-2:8px;--space-3:12px;--space-4:16px;--space-5:20px;--space-6:24px;--space-8:32px;--space-10:40px;--space-12:48px;--space-16:64px;--radius-none:0;--radius-sm:4px;--radius-md:8px;--radius-pill:9999px;--line-thin:1px;--z-overlay:var(--ig-popup-z,2147483000);--ease-out:cubic-bezier(.4,0,.2,1);--duration-fast:200ms;--duration-base:300ms;--duration-slow:450ms}';

const RESET = [
  ':where(.ig-feed,.ig-pop),:where(.ig-feed,.ig-pop) *,:where(.ig-feed,.ig-pop) ::before,:where(.ig-feed,.ig-pop) ::after{box-sizing:border-box}',
  ':where(.ig-feed,.ig-pop) :where(a){background:transparent;color:inherit;text-decoration:none}',
  ':where(.ig-feed,.ig-pop) :where(img,video){max-width:none;border:0;vertical-align:baseline}',
  ':where(.ig-feed,.ig-pop) :where(button){margin:0;font:inherit;line-height:inherit;text-transform:none}',
  ':where(.ig-feed,.ig-pop) :where(ul,ol,li,p){margin:0;padding:0}',
  '.ig-feed__item{margin:0;padding:0;list-style:none}',
  '.ig-feed[hidden]{display:none!important}',
  '.ig-vh{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}',
  '.ig-feed__footer{text-align:end}',
  '.ig-feed__follow{display:inline-block;color:inherit;text-decoration:none}',
  '.ig-feed__follow:hover,.ig-feed__follow:focus-visible{text-decoration:underline}',
].join('\n');

const CSS = `
.ig-feed{--ig-cols: var(--ig-cols-base);position: relative;}
@media (min-width: 768px){.ig-feed{--ig-cols: var(--ig-cols-md);}}
@media (min-width: 1024px){.ig-feed{--ig-cols: var(--ig-cols-lg);}}
.ig-feed__stage{position: relative;}
.ig-feed__track{display: grid;grid-template-columns: repeat(var(--ig-cols), minmax(0, 1fr));gap: var(--ig-gap, 2px);margin: 0;padding: 0;list-style: none;}
@media (max-width: 767px){.ig-feed[data-layout='grid'] .is-off-base{display: none;}}
@media (min-width: 768px) and (max-width: 1023px){.ig-feed[data-layout='grid'] .is-off-md{display: none;}}
@media (min-width: 1024px){.ig-feed[data-layout='grid'] .is-off-lg{display: none;}}
.ig-feed[data-layout='carousel'] .ig-feed__track{grid-auto-flow: column;grid-template-columns: none;grid-auto-columns: calc( (100% - (var(--ig-cols) - 1) * var(--ig-gap, 2px)) / var(--ig-cols) );overflow-x: auto;overscroll-behavior-x: contain;scroll-snap-type: x mandatory;scrollbar-width: none;}
.ig-feed[data-layout='carousel'] .ig-feed__track::-webkit-scrollbar{display: none;}
.ig-feed[data-layout='carousel'] .ig-feed__item{scroll-snap-align: start;}
.ig-feed__item{min-width: 0;}
.ig-feed__tile{position: relative;display: block;overflow: hidden;aspect-ratio: var(--ig-ratio);border-radius: var(--ig-radius, var(--radius-none));background: var(--ig-tile-bg, rgb(127 127 127 / 0.15));color: var(--ig-overlay-color, var(--color-white));}
.ig-feed__tile .ig-feed__img{display: block;width: 100%;height: 100%;object-fit: cover;transition: transform var(--duration-slow) var(--ease-out);}
@media (hover: hover) and (prefers-reduced-motion: no-preference){.ig-feed__tile:hover .ig-feed__img{transform: scale(1.03);}}
.ig-feed__badge{position: absolute;inset-block-start: var(--space-2);inset-inline-end: var(--space-2);display: grid;place-items: center;color: var(--ig-overlay-color, var(--color-white));filter: drop-shadow(0 0 var(--space-1) color-mix(in srgb, var(--color-black) 35%, transparent));pointer-events: none;}
.ig-feed__badge svg{inline-size: var(--space-5);block-size: var(--space-5);}
.ig-feed__overlay{position: absolute;inset: 0;display: flex;align-items: flex-end;padding: var(--space-3);background: var(--ig-overlay-bg, color-mix(in srgb, var(--color-black) 55%, transparent));font-size: var(--text-sm);line-height: 1.35;opacity: 0;pointer-events: none;transition: opacity var(--duration-base) var(--ease-out);}
.ig-feed__caption{display: -webkit-box;-webkit-box-orient: vertical;-webkit-line-clamp: 6;line-clamp: 6;overflow: hidden;}
@media (hover: hover){.ig-feed__tile:hover .ig-feed__overlay, .ig-feed__tile:focus-visible .ig-feed__overlay{opacity: 1;}}
.ig-feed__nav{position: absolute;inset-block-start: 50%;z-index: 1;display: grid;place-items: center;inline-size: var(--space-10);block-size: var(--space-10);padding: 0;border: 0;border-radius: var(--radius-pill);background: var(--ig-nav-bg, #fff);color: var(--ig-nav-color, #111);cursor: pointer;transform: translateY(-50%);transition: opacity var(--duration-fast) var(--ease-out);}
.ig-feed__nav[hidden]{display: none;}
.ig-feed__nav:disabled{opacity: 0;pointer-events: none;}
.ig-feed__nav svg{inline-size: var(--space-5);block-size: var(--space-5);}
.ig-feed__nav--prev{inset-inline-start: var(--space-2);}
.ig-feed__nav--next{inset-inline-end: var(--space-2);}
.ig-feed__footer{margin-block-start: var(--space-6);}
.ig-pop{--ig-pop-hit: 44px;--ig-pop-glyph: var(--space-6);--ig-pop-slack: calc((var(--ig-pop-hit) - var(--ig-pop-glyph)) / 2);--ig-pop-inset: var(--ig-inset, var(--space-4));--ig-pop-margin: var(--space-6);--ig-pop-media-max: var(--ig-popup-media-max-h, min(85svh, 46rem));--ig-pop-gap: var(--space-4);--ig-pop-text: var(--ig-popup-text, #000);--ig-pop-secondary: var(--ig-popup-secondary, #737373);--ig-pop-link: var(--ig-popup-link, #4150f7);--ig-pop-line: var(--ig-popup-line, #dbdbdb);--ig-pop-bg: var(--ig-popup-bg, #fff);--ig-pop-chip-bg: var(--ig-popup-chip-bg, rgb(43 48 54 / 0.8));--ig-pop-chip-color: var(--ig-popup-chip-color, #fff);color-scheme: light;position: fixed;inset: 0;z-index: var(--z-overlay);display: grid;place-items: stretch;background: var(--ig-pop-bg);color: var(--ig-pop-text);font-family: var( --ig-popup-font, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif );font-size: var(--text-sm);font-weight: var(--font-weight-regular);line-height: calc(18 / 14);opacity: 0;visibility: hidden;transition: opacity var(--duration-base) var(--ease-out), visibility 0s linear var(--duration-base);}
.ig-pop[data-open='true']{opacity: 1;visibility: visible;transition: opacity var(--duration-base) var(--ease-out), visibility 0s linear 0s;}
.ig-pop :where(a, button, [role='slider']):focus-visible{outline: 2px solid var(--ig-pop-link);outline-offset: 2px;}
.ig-pop__scroll{position: absolute;inset: 0;overflow-y: auto;overscroll-behavior: contain;overflow-anchor: none;}
.ig-pop__feed{padding-block-start: env(safe-area-inset-top, 0px);}
@media (prefers-reduced-motion: reduce){.ig-pop{transition: none;}}
.ig-pop__post{position: relative;display: flow-root;background: var(--ig-pop-bg);border-block-end: var(--line-thin) solid var(--ig-pop-line);outline: none;}
.ig-pop__post[data-mounted='false']{overflow: hidden;background: color-mix(in srgb, var(--ig-pop-bg) 94%, var(--ig-pop-text));}
@media (min-width: 640px){.ig-pop{background: var(--ig-popup-backdrop, rgb(0 0 0 / 0.65));}.ig-pop__feed{display: flex;flex-direction: column;align-items: center;gap: var(--ig-pop-gap);padding: var(--ig-pop-margin) var(--space-4) 0;}.ig-pop__post{flex: none;inline-size: min(100%, var(--ig-popup-max-width, 470px));border: 0;border-radius: var(--ig-popup-radius, var(--radius-md));overflow: hidden;}}
.ig-pop__end{padding: var(--space-6) var(--ig-pop-inset) calc(var(--space-6) + env(safe-area-inset-bottom, 0px));background: var(--ig-pop-bg);border-block-start: var(--line-thin) solid var(--ig-pop-line);text-align: center;}
.ig-pop__end-text{margin: 0;color: var(--ig-pop-secondary);}
.ig-pop__end-link{position: relative;display: inline-block;color: var(--ig-pop-link);text-decoration: none;}
.ig-pop__end-text + .ig-pop__end-link{margin-block-start: var(--space-1);}
.ig-pop__end-link::after{content: '';position: absolute;inset-block: calc((1lh - var(--ig-pop-hit)) / 2);inset-inline: calc(var(--space-2) * -1);}
.ig-pop__end-link:hover{text-decoration: underline;}
@media (min-width: 640px){.ig-pop__end{inline-size: min(calc(100% - 2 * var(--space-4)), var(--ig-popup-max-width, 470px));margin: var(--ig-pop-gap) auto var(--ig-pop-margin);padding-block: var(--space-4);border: 0;border-radius: var(--ig-popup-radius, var(--radius-md));}}
.ig-pop__steps{position: absolute;inset-block: 0;inset-inline-end: calc(var(--space-4) * 2);display: none;flex-direction: column;justify-content: center;gap: var(--space-3);pointer-events: none;}
@media (min-width: 640px) and (hover: hover) and (pointer: fine){.ig-pop__steps{display: flex;}}
.ig-pop__step{display: grid;place-items: center;inline-size: var(--space-10);block-size: var(--space-10);padding: 0;border: 0;border-radius: var(--radius-pill);background: var(--ig-popup-nav-bg, rgb(255 255 255 / 0.7));color: var(--ig-popup-nav-color, #262626);cursor: pointer;pointer-events: auto;transition: opacity var(--duration-fast) var(--ease-out);}
.ig-pop__step[hidden]{display: none;}
.ig-pop__step svg{inline-size: var(--space-5);block-size: var(--space-5);}
.ig-pop__step:hover{background: var(--ig-pop-bg);}
.ig-pop__head{display: flex;flex: none;align-items: center;min-block-size: calc(var(--space-12) + var(--space-2));padding-inline: calc(var(--ig-pop-inset) - var(--space-1)) calc(var(--ig-pop-inset) - var(--ig-pop-slack));}
.ig-pop__close{display: grid;flex: none;place-items: center;inline-size: var(--ig-pop-hit);block-size: var(--ig-pop-hit);margin-inline-start: auto;padding: 0;border: 0;border-radius: var(--radius-pill);background: transparent;color: inherit;cursor: pointer;-webkit-tap-highlight-color: transparent;}
.ig-pop__close svg{inline-size: var(--ig-pop-glyph);block-size: var(--ig-pop-glyph);}
@media (hover: hover){.ig-pop__close:hover{opacity: 0.6;}}
.ig-pop__avatar{flex: none;inline-size: var(--space-8);block-size: var(--space-8);border-radius: var(--radius-pill);object-fit: cover;background: color-mix(in srgb, var(--ig-pop-text) 8%, transparent);}
.ig-pop__avatar--initial{display: grid;place-items: center;font-size: var(--text-sm);font-weight: var(--font-weight-semibold);}
.ig-pop__profile{position: relative;display: flex;flex: 0 1 auto;align-items: center;gap: var(--space-3);min-inline-size: 0;color: inherit;text-decoration: none;}
a.ig-pop__profile[href]::after{content: '';position: absolute;inset-block: calc((var(--space-8) - var(--ig-pop-hit)) / 2);inset-inline: 0;}
@media (hover: hover){a.ig-pop__profile[href]:hover{opacity: 0.7;}}
.ig-pop__who{display: flex;flex: none;align-items: baseline;}
.ig-pop__user{min-inline-size: 0;overflow: hidden;font-weight: var(--font-weight-semibold);text-overflow: ellipsis;white-space: nowrap;}
.ig-pop__sep{flex: none;margin-inline: var(--space-1) calc(var(--space-1) * 1.5);}
.ig-pop__follow{position: relative;flex: none;color: var(--ig-pop-link);text-decoration: none;}
.ig-pop__follow::after{content: '';position: absolute;inset-block: calc((1lh - var(--ig-pop-hit)) / 2);inset-inline: calc(var(--space-2) * -1);}
.ig-pop__follow:hover{text-decoration: underline;}
.ig-pop__media{position: relative;inline-size: 100%;aspect-ratio: var(--ig-pop-ar, var(--ig-popup-ratio, 0.8));min-block-size: var(--ig-popup-media-min-h, 8rem);max-block-size: var(--ig-pop-media-max);overflow: hidden;background: var(--ig-popup-media-bg, #000);}
.ig-pop__track{position: absolute;inset: 0;display: flex;overflow: auto hidden;overscroll-behavior-x: contain;scroll-snap-type: x mandatory;scrollbar-width: none;}
.ig-pop__track::-webkit-scrollbar{display: none;}
.ig-pop__slide{position: relative;flex: 0 0 100%;min-inline-size: 0;overflow: hidden;scroll-snap-align: start;scroll-snap-stop: always;}
.ig-pop__slide .ig-pop__img, .ig-pop__video, .ig-pop__fallback-img{display: block;inline-size: 100%;block-size: 100%;object-fit: contain;}
.ig-pop__count{position: absolute;inset-block-start: var(--space-3);inset-inline-end: var(--space-3);z-index: 2;display: grid;place-items: center;min-block-size: var(--space-6);padding-inline: var(--space-2);border-radius: var(--radius-pill);background: var(--ig-pop-chip-bg);color: var(--ig-pop-chip-color);font-size: var(--text-xs);font-variant-numeric: tabular-nums;line-height: 1;pointer-events: none;}
.ig-pop__nav{position: absolute;inset-block-start: 50%;z-index: 2;display: grid;place-items: center;inline-size: var(--space-6);block-size: var(--space-6);padding: 0;border: 0;border-radius: var(--radius-pill);background: var(--ig-popup-nav-bg, rgb(255 255 255 / 0.7));color: var(--ig-popup-nav-color, #262626);cursor: pointer;opacity: 0;pointer-events: none;transform: translateY(-50%);transition: opacity var(--duration-fast) var(--ease-out);}
.ig-pop__nav[hidden]{display: none;}
.ig-pop__nav::after{content: '';position: absolute;inset: calc((var(--ig-pop-hit) - var(--space-6)) / -2);}
.ig-pop__nav svg{inline-size: var(--space-4);block-size: var(--space-4);}
.ig-pop__nav--prev{inset-inline-start: var(--space-3);}
.ig-pop__nav--next{inset-inline-end: var(--space-3);}
@media (hover: hover) and (pointer: fine){.ig-pop__nav{opacity: 1;pointer-events: auto;}}
.ig-pop__nav:focus-visible{opacity: 1;}
.ig-pop__dots{position: absolute;inset-block-end: 15px;inset-inline: 0;z-index: 2;display: flex;align-items: center;justify-content: center;filter: drop-shadow(0 0 var(--space-1) color-mix(in srgb, var(--color-black) 30%, transparent));pointer-events: none;}
.ig-pop__dot{--ig-pop-dot: 6px;flex: none;inline-size: calc(var(--ig-pop-dot) * var(--ig-dot-s, 1));block-size: calc(var(--ig-pop-dot) * var(--ig-dot-s, 1));margin-inline: calc(var(--space-1) / 2 * var(--ig-dot-s, 1));border-radius: var(--radius-pill);background: #fff;opacity: calc(0.4 + 0.6 * var(--ig-dot-p, 0));transition: inline-size var(--duration-fast) var(--ease-out), block-size var(--duration-fast) var(--ease-out), margin var(--duration-fast) var(--ease-out);}
@media (prefers-reduced-motion: reduce){.ig-pop__dot{transition: none;}}
.ig-pop__clip{display: contents;}
.ig-pop__player{position: absolute;inset: 0;}
.ig-pop__player[hidden], .ig-pop__fallback[hidden]{display: none;}
.ig-pop__fallback{position: absolute;inset: 0;}
.ig-pop__surface{position: absolute;inset: 0;display: grid;place-items: center;padding: 0;border: 0;background: transparent;color: inherit;cursor: pointer;outline-offset: calc(-1 * var(--space-1));-webkit-tap-highlight-color: transparent;}
.ig-pop__surface[hidden]{display: none;}
.ig-pop__playicon{display: grid;place-items: center;inline-size: var(--space-16);block-size: var(--space-16);border-radius: var(--radius-pill);background: var(--ig-pop-chip-bg);color: var(--ig-pop-chip-color);transition: opacity var(--duration-fast) var(--ease-out);}
.ig-pop__playicon svg{inline-size: var(--space-10);block-size: var(--space-10);}
.ig-pop__player[data-playing='true'] .ig-pop__playicon{opacity: 0;}
@media (prefers-reduced-motion: reduce){.ig-pop__playicon{transition: none;}}
.ig-pop__scrub{position: absolute;inset-inline: 0;inset-block-end: 0;z-index: 1;display: flex;align-items: flex-end;block-size: var(--ig-pop-hit);cursor: pointer;touch-action: none;}
.ig-pop__line{position: relative;inline-size: 100%;block-size: calc(var(--space-1) / 2);overflow: hidden;background: color-mix(in srgb, var(--color-white) 30%, transparent);transition: block-size var(--duration-fast) var(--ease-out);}
.ig-pop__scrub:hover .ig-pop__line, .ig-pop__scrub:focus-visible .ig-pop__line, .ig-pop__scrub[data-scrubbing] .ig-pop__line{block-size: var(--space-1);}
.ig-pop__fill{display: block;inline-size: 100%;block-size: 100%;background: #fff;transform: scaleX(var(--ig-pop-progress, 0));transform-origin: left;}
@media (prefers-reduced-motion: reduce){.ig-pop__line{transition: none;}}
.ig-pop__mute{position: absolute;inset-block-end: var(--space-3);inset-inline-end: var(--space-3);z-index: 2;display: grid;place-items: center;inline-size: 28px;block-size: 28px;padding: 0;border: 0;border-radius: var(--radius-pill);background: var(--ig-pop-chip-bg);color: var(--ig-pop-chip-color);cursor: pointer;}
.ig-pop__mute::after{content: '';position: absolute;inset: calc((var(--ig-pop-hit) - 28px) / -2);}
.ig-pop__mute svg{inline-size: var(--space-4);block-size: var(--space-4);}
.ig-pop__mute[data-muted='true'] .ig-pop__waves, .ig-pop__mute[data-muted='false'] .ig-pop__slash{display: none;}
.ig-pop__watch{position: absolute;inset: 0;display: grid;place-items: center;}
.ig-pop__watch:focus-visible{outline-offset: calc(-1 * var(--space-1));}
.ig-pop__watch-text{position: absolute;inset-inline: var(--space-3);inset-block-end: var(--space-3);padding: var(--space-2) var(--space-3);border-radius: var(--radius-sm);background: var(--ig-pop-chip-bg);color: var(--ig-pop-chip-color);text-align: center;}
.ig-pop__footer{padding: 0 var(--ig-pop-inset) var(--ig-pop-inset);}
.ig-pop__actions{display: flex;align-items: center;gap: var(--space-4);margin-block-start: calc(var(--space-2) + var(--space-1) / 2);min-block-size: var(--space-10);}
.ig-pop__stat{display: inline-flex;align-items: center;gap: var(--ig-popup-stat-gap, calc(var(--space-1) / 2));}
.ig-pop__icon-btn{display: grid;flex: none;place-items: center;inline-size: var(--ig-pop-hit);block-size: var(--ig-pop-hit);margin: calc(-1 * var(--ig-pop-slack));padding: 0;border: 0;border-radius: var(--radius-pill);background: transparent;color: inherit;cursor: pointer;-webkit-tap-highlight-color: transparent;}
.ig-pop__icon-btn svg{inline-size: var(--ig-pop-glyph);block-size: var(--ig-pop-glyph);}
@media (hover: hover){.ig-pop__icon-btn:hover{opacity: 0.6;}}
.ig-pop__num{font-size: var(--text-sm);font-weight: var(--font-weight-semibold);font-variant-numeric: tabular-nums;line-height: var(--ig-pop-glyph);}
@supports (text-box: trim-both cap alphabetic){.ig-pop__num > [aria-hidden='true']{text-box: trim-both cap alphabetic;}}
.ig-pop__status{margin-inline-start: auto;color: var(--ig-pop-secondary);font-size: var(--text-xs);}
.ig-pop__caption{margin-block-start: var(--space-2);}
.ig-pop__text{display: -webkit-box;margin: 0;overflow: hidden;overflow-wrap: anywhere;white-space: pre-line;-webkit-box-orient: vertical;-webkit-line-clamp: 2;line-clamp: 2;}
.ig-pop__text[data-collapsed], .ig-pop__text[data-expanded='true']{display: block;overflow: visible;}
.ig-pop__author{font-weight: var(--font-weight-semibold);}
.ig-pop__link{color: var(--ig-pop-link);text-decoration: none;}
.ig-pop__link:hover{text-decoration: underline;}
.ig-pop__more{position: relative;padding: 0;border: 0;background: none;color: var(--ig-pop-secondary);cursor: pointer;font: inherit;}
.ig-pop__more[hidden]{display: none;}
.ig-pop__more::after{content: '';position: absolute;inset-block: calc(var(--space-1) * -1);inset-inline: 0;}
.ig-pop__text[data-expanded='true'] + .ig-pop__more{display: block;}
.ig-pop__text[data-expanded='true'] + .ig-pop__more .ig-pop__ellipsis{display: none;}
.ig-pop__comments{position: relative;display: block;inline-size: fit-content;margin-block-start: var(--space-1);color: var(--ig-pop-secondary);text-decoration: none;}
.ig-pop__comments::after{content: '';position: absolute;inset-block: calc(var(--space-1) * -1) calc((1lh - var(--ig-pop-hit)) / 2);inset-inline: 0;}
.ig-pop__comments:hover{text-decoration: underline;}
.ig-pop__date{display: block;margin-block-start: calc(var(--space-1) * 1.5);color: var(--ig-pop-secondary);font-size: var(--text-xs);line-height: var(--space-4);}
.ig-feed[data-ig-protect] .ig-feed__tile, .ig-pop[data-ig-protect] .ig-pop__media{-webkit-touch-callout: none;-webkit-user-select: none;user-select: none;}
.ig-feed[data-ig-protect] .ig-feed__tile .ig-feed__img, .ig-pop[data-ig-protect] .ig-pop__img, .ig-pop[data-ig-protect] .ig-pop__avatar, .ig-pop[data-ig-protect] .ig-pop__video, .ig-pop[data-ig-protect] .ig-pop__fallback-img{-webkit-touch-callout: none;-webkit-user-drag: none;-webkit-user-select: none;user-select: none;pointer-events: none;}
.ig-feed__tile .ig-feed__preview{position: absolute;inset: 0;display: block;inline-size: 100%;block-size: 100%;object-fit: cover;opacity: 0;pointer-events: none;-webkit-user-select: none;user-select: none;transition: opacity var(--duration-base) var(--ease-out), transform var(--duration-slow) var(--ease-out);}
@media (hover: hover) and (prefers-reduced-motion: no-preference){.ig-feed__tile:hover .ig-feed__preview{transform: scale(1.03);}}
.ig-feed__tile[data-ig-previewing] .ig-feed__preview{opacity: 1;}
@media (prefers-reduced-motion: reduce){.ig-feed__tile .ig-feed__preview{transition: none;}}
@media print{.ig-feed__tile .ig-feed__preview, .ig-feed[data-ig-protect] .ig-feed__tile .ig-feed__img, .ig-pop[data-ig-protect] .ig-pop__media, .ig-pop[data-ig-protect] .ig-pop__avatar{display: none;}}
`.trim();

export function injectStyles(doc: Document = document): void {
  if (doc.head.querySelector(`style[${STYLE_ATTR}]`)) return;
  const style = doc.createElement('style');
  style.setAttribute(STYLE_ATTR, '');
  style.textContent = `${TOKENS}\n${RESET}\n${CSS}`;
  doc.head.appendChild(style);
}
