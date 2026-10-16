/**
 * The stylesheet, injected once. A Webflow page has no scoped CSS and its own global rules
 * for lists, links and images, so every rule is one class deep (a page's own class overrides
 * it by coming later or through the `--ig-*` variables) and the list/link/button resets are explicit.
 */
const STYLE_ATTR = 'data-dm-ig-feed-style';

const CSS = `
.ig-feed{--ig-cols:var(--ig-cols-base);position:relative;box-sizing:border-box}
@media (min-width:768px){.ig-feed{--ig-cols:var(--ig-cols-md)}}
@media (min-width:1024px){.ig-feed{--ig-cols:var(--ig-cols-lg)}}
.ig-feed[hidden]{display:none!important}
.ig-feed__stage{position:relative}
.ig-feed__track{display:grid;grid-template-columns:repeat(var(--ig-cols),minmax(0,1fr));gap:var(--ig-gap,8px);margin:0;padding:0;list-style:none}
.ig-feed__item{min-width:0;margin:0;padding:0;list-style:none}
@media (max-width:767px){.ig-feed[data-layout=grid] .is-off-base{display:none}}
@media (min-width:768px) and (max-width:1023px){.ig-feed[data-layout=grid] .is-off-md{display:none}}
@media (min-width:1024px){.ig-feed[data-layout=grid] .is-off-lg{display:none}}
.ig-feed[data-layout=carousel] .ig-feed__track{grid-auto-flow:column;grid-template-columns:none;grid-auto-columns:calc((100% - (var(--ig-cols) - 1) * var(--ig-gap,8px)) / var(--ig-cols));overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x mandatory;scrollbar-width:none}
.ig-feed[data-layout=carousel] .ig-feed__track::-webkit-scrollbar{display:none}
.ig-feed[data-layout=carousel] .ig-feed__item{scroll-snap-align:start}
.ig-feed__tile{position:relative;display:block;overflow:hidden;aspect-ratio:var(--ig-ratio);border-radius:var(--ig-radius,0);background:var(--ig-tile-bg,rgba(127,127,127,.15));color:var(--ig-overlay-color,#fff);text-decoration:none}
.ig-feed__img{display:block;width:100%;max-width:none;height:100%;object-fit:cover;transition:transform .5s ease}
@media (hover:hover) and (prefers-reduced-motion:no-preference){.ig-feed__tile:hover .ig-feed__img{transform:scale(1.03)}}
.ig-feed__badge{position:absolute;top:8px;right:8px;display:grid;width:24px;height:24px;color:var(--ig-overlay-color,#fff);filter:drop-shadow(0 0 4px rgba(0,0,0,.5));pointer-events:none}
.ig-feed__badge svg{width:100%;height:100%}
.ig-feed__overlay{position:absolute;inset:0;display:flex;align-items:flex-end;padding:12px;background:var(--ig-overlay-bg,rgba(0,0,0,.55));font-size:14px;line-height:1.35;opacity:0;pointer-events:none;transition:opacity .2s ease}
.ig-feed__caption{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:6;line-clamp:6;overflow:hidden}
@media (hover:hover){.ig-feed__tile:hover .ig-feed__overlay,.ig-feed__tile:focus-visible .ig-feed__overlay{opacity:1}}
.ig-feed__nav{position:absolute;top:50%;z-index:1;display:grid;place-items:center;width:40px;height:40px;margin:0;padding:0;border:0;border-radius:999px;background:var(--ig-nav-bg,#fff);color:var(--ig-nav-color,#111);cursor:pointer;transform:translateY(-50%);transition:opacity .15s ease}
.ig-feed__nav[hidden]{display:none}
.ig-feed__nav:disabled{opacity:0;pointer-events:none}
.ig-feed__nav svg{width:20px;height:20px}
.ig-feed__nav--prev{left:8px}
.ig-feed__nav--next{right:8px}
.ig-feed__footer{margin-top:24px}
.ig-feed__follow{color:inherit}
`.trim();

export function injectStyles(doc: Document = document): void {
  if (doc.head.querySelector(`style[${STYLE_ATTR}]`)) return;
  const style = doc.createElement('style');
  style.setAttribute(STYLE_ATTR, '');
  style.textContent = CSS;
  doc.head.appendChild(style);
}
