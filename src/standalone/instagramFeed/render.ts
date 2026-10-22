/**
 * Builds the feed's markup in the browser. It is the same markup contract as the Astro shell
 * (`astro-client-template`, `InstagramFeed.astro`), element for element, so the one stylesheet and
 * the ported popup (`popup.ts`) work on it unchanged:
 *
 *   div.ig-feed[data-ig-feed][data-layout][data-status]      role="group"
 *     div.ig-feed__stage
 *       ul.ig-feed__track[data-ig-track]
 *         li.ig-feed__item (.is-off-base / -md / -lg in the grid)
 *           a.ig-feed__tile[data-ig-open=<post id>] > img.ig-feed__img, span.ig-feed__badge, span.ig-feed__overlay
 *       button.ig-feed__nav--prev / --next                   (carousel; hidden until scrollable)
 *     div.ig-feed__footer > a.ig-feed__follow
 *     template[data-ig-dialog]                               the popup shell, cloned into <body> on first open
 *     template[data-ig-post=<id>]*                           one per post of the popup's list
 *
 * Everything inside a `<template>` is inert until the first click: no picture of an unopened post
 * is requested. Text from the feed is only ever set as text, never as markup.
 */
import { MAX_LIMIT } from './config';
import {
  dotScales,
  feedEnd,
  formatCount,
  formatPostDate,
  formatWhole,
  splitCaption,
} from './lib/format';
import type { Feed, FeedColumns, FeedOptions, FeedPost } from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';

type Attrs = Record<string, string | number | boolean | undefined>;
type Child = Node | string | false | null | undefined;

function apply(node: Element, attrs: Attrs): void {
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    node.setAttribute(key, value === true ? '' : String(value));
  }
}

function append(node: Node, children: Child[]): void {
  for (const child of children) {
    if (child === undefined || child === null || child === false) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
}

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string | null,
  attrs: Attrs = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  apply(node, attrs);
  append(node, children);
  return node;
}

function svg(attrs: Attrs, ...paths: Element[]): SVGSVGElement {
  const node = document.createElementNS(SVG_NS, 'svg');
  node.setAttribute('viewBox', '0 0 24 24');
  node.setAttribute('focusable', 'false');
  apply(node, attrs);
  append(node, paths);
  return node;
}

function path(attrs: Attrs): SVGPathElement {
  const node = document.createElementNS(SVG_NS, 'path');
  apply(node, attrs);
  return node;
}

/** A 24 × 24 glyph drawn with `currentColor`, hidden from assistive technology. */
function icon(d: string, extra: Attrs): SVGSVGElement {
  return svg({ 'aria-hidden': 'true' }, path({ d, ...extra }));
}

const ICON = {
  close: 'M6 6l12 12M18 6L6 18',
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
  prev: 'M15 6l-6 6 6 6',
  next: 'M9 6l6 6-6 6',
  heart:
    'M12 20.5s-8.5-5.1-8.5-11.2C3.5 6.2 5.7 4 8.5 4c1.4 0 2.7.7 3.5 1.9C12.8 4.7 14.1 4 15.5 4c2.8 0 5 2.2 5 5.3 0 6.1-8.5 11.2-8.5 11.2z',
  comment: 'M12 3a9 9 0 1 0 4.9 16.6l4.1 1.4-1.4-4.1A9 9 0 0 0 12 3z',
  share: 'M21.5 2.5L3 9.5l7.5 3.5 3.5 7.5zM21.5 2.5L10.5 13',
  play: 'M8 5.5v13a1 1 0 0 0 1.5.9l10.4-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5z',
  speaker: 'M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z',
  waves: 'M15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11',
  slash: 'M16 9.5l5 5M21 9.5l-5 5',
} as const;

const stroke = (width: number, join = false, cap = false): Attrs => ({
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': width,
  ...(join ? { 'stroke-linejoin': 'round' } : {}),
  ...(cap ? { 'stroke-linecap': 'round' } : {}),
});

const fill = (label: string, values: Record<string, string | number>): string =>
  label.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match));

let popupSerial = 0;

// ── tiles ───────────────────────────────────────────────────────────────

/** Which breakpoints show tile `index` in the grid layout. */
export function visibleFlags(index: number, rows: number, columns: FeedColumns) {
  return {
    base: index < rows * columns.base,
    md: index < rows * columns.md,
    lg: index < rows * columns.lg,
  };
}

function offClasses(index: number, opts: FeedOptions): string[] {
  if (opts.layout !== 'grid') return [];
  const on = visibleFlags(index, opts.rows, opts.columns);
  return [!on.base && 'is-off-base', !on.md && 'is-off-md', !on.lg && 'is-off-lg'].filter(
    (c): c is string => Boolean(c),
  );
}

function tileName(post: FeedPost, opts: FeedOptions, action = opts.labels.openPost): string {
  return [
    post.alt,
    post.type === 'VIDEO'
      ? opts.labels.video
      : post.type === 'CAROUSEL_ALBUM'
        ? opts.labels.album
        : '',
    action,
  ]
    .filter(Boolean)
    .join(' – ');
}

/** Instagram's mark for a clip (a rounded square with the triangle cut out) or an album (two squares). */
function badge(post: FeedPost): HTMLElement {
  const glyph =
    post.type === 'VIDEO'
      ? svg(
          {},
          path({
            fill: 'currentColor',
            'fill-rule': 'evenodd',
            d: 'M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm2.4 5.3a.8.8 0 0 0-1.2.7v8a.8.8 0 0 0 1.2.7l6.3-4a.8.8 0 0 0 0-1.4z',
          }),
        )
      : svg(
          {},
          path({
            d: 'M9 3.2h8.5A3.5 3.5 0 0 1 21 6.7v8.5',
            fill: 'none',
            stroke: 'currentColor',
            'stroke-width': 2,
            'stroke-linecap': 'round',
          }),
          (() => {
            const rect = document.createElementNS(SVG_NS, 'rect');
            apply(rect, { x: 3, y: 7, width: 14, height: 14, rx: 3.5, fill: 'currentColor' });
            return rect;
          })(),
        );
  return h('span', 'ig-feed__badge', { 'aria-hidden': 'true' }, glyph);
}

function postTile(
  post: FeedPost,
  opts: FeedOptions,
  index: number,
  popupCount: number,
): HTMLElement {
  const opens = opts.popup && index < popupCount;
  const preview = opts.hoverPreview && post.type === 'VIDEO' ? post.videoUrl : undefined;
  const link = h('a', 'ig-feed__tile', {
    href: post.permalink,
    target: '_blank',
    rel: 'noopener noreferrer',
    'aria-label': tileName(post, opts),
    draggable: opts.protectMedia ? 'false' : undefined,
    'data-ig-preview': preview,
    'data-ig-open': opens ? post.id : undefined,
    'data-ig-popup-label': opens ? tileName(post, opts, opts.labels.openPopup) : undefined,
  });
  // alt is empty on purpose: the link's accessible name already carries it.
  link.appendChild(
    h('img', 'ig-feed__img', {
      src: post.imageUrl,
      alt: '',
      loading: index < opts.columns.lg ? 'eager' : 'lazy',
      decoding: 'async',
      draggable: opts.protectMedia ? 'false' : undefined,
    }),
  );
  if (post.type !== 'IMAGE') link.appendChild(badge(post));
  if (opts.overlay === 'hover' && post.caption) {
    // the caption is text, never markup
    link.appendChild(
      h(
        'span',
        'ig-feed__overlay',
        { 'aria-hidden': 'true' },
        h('span', 'ig-feed__caption', {}, post.caption),
      ),
    );
  }
  return h('li', ['ig-feed__item', ...offClasses(index, opts)].join(' '), {}, link);
}

function placeholderTile(opts: FeedOptions, index: number): HTMLElement {
  return h(
    'li',
    ['ig-feed__item', ...offClasses(index, opts)].join(' '),
    { 'aria-hidden': 'true' },
    h('span', 'ig-feed__tile ig-feed__tile--placeholder'),
  );
}

function navButton(kind: 'prev' | 'next', label: string): HTMLButtonElement {
  const button = h(
    'button',
    `ig-feed__nav ig-feed__nav--${kind}`,
    { type: 'button', 'aria-label': label, [`data-ig-${kind}`]: true, hidden: true },
    svg(
      { 'aria-hidden': 'true' },
      path({
        d: kind === 'prev' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7',
        ...stroke(2, true, true),
      }),
    ),
  );
  return button;
}

/** Carousel arrows: page the track by its own width, shown only while there is something to scroll to. */
function wireCarousel(track: HTMLElement, prev: HTMLButtonElement, next: HTMLButtonElement): void {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const update = (): void => {
    const max = track.scrollWidth - track.clientWidth;
    prev.hidden = next.hidden = max <= 1;
    prev.disabled = track.scrollLeft <= 1;
    next.disabled = track.scrollLeft >= max - 1;
  };
  const page = (direction: -1 | 1): void => {
    track.scrollBy({
      left: direction * track.clientWidth,
      behavior: reduceMotion.matches ? 'auto' : 'smooth',
    });
  };
  prev.addEventListener('click', () => {
    page(-1);
  });
  next.addEventListener('click', () => {
    page(1);
  });
  track.addEventListener('scroll', update, { passive: true });
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(update).observe(track);
  update();
}

// ── the popup's templates ───────────────────────────────────────────────

interface Slide {
  id: string;
  imageUrl: string;
  videoUrl?: string;
  isVideo: boolean;
}

function slidesOf(post: FeedPost): Slide[] {
  if (post.children && post.children.length > 0) {
    return post.children.map((child) => ({
      id: child.id,
      imageUrl: child.imageUrl,
      ...(child.videoUrl ? { videoUrl: child.videoUrl } : {}),
      isVideo: child.type === 'VIDEO',
    }));
  }
  return [
    {
      id: post.id,
      imageUrl: post.imageUrl,
      ...(post.videoUrl ? { videoUrl: post.videoUrl } : {}),
      isVideo: post.type === 'VIDEO',
    },
  ];
}

const playDisc = (): HTMLElement =>
  h(
    'span',
    'ig-pop__playicon',
    { 'aria-hidden': 'true' },
    svg(
      {},
      path({
        d: ICON.play,
        fill: 'currentColor',
        stroke: 'currentColor',
        'stroke-width': 1.5,
        'stroke-linejoin': 'round',
      }),
    ),
  );

/** The cover and a link out, for a clip with no file or one that failed. */
function fallback(post: FeedPost, opts: FeedOptions, cover?: string): HTMLElement {
  return h(
    'div',
    'ig-pop__fallback',
    { 'data-ig-fallback': true, hidden: true },
    cover
      ? h('img', 'ig-pop__fallback-img', {
          'data-src': cover,
          alt: '',
          draggable: opts.protectMedia ? 'false' : undefined,
        })
      : null,
    h(
      'a',
      'ig-pop__watch',
      { href: post.permalink, target: '_blank', rel: 'noopener noreferrer' },
      playDisc(),
      h('span', 'ig-pop__watch-text', {}, opts.labels.videoFailed),
    ),
  );
}

function clipSlide(slide: Slide & { videoUrl: string }, post: FeedPost, opts: FeedOptions) {
  const { labels } = opts;
  const video = h('video', 'ig-pop__video', {
    src: slide.videoUrl,
    'data-poster': slide.imageUrl,
    playsinline: true,
    preload: 'none',
    disablepictureinpicture: opts.protectMedia,
    controlslist: opts.protectMedia ? 'nodownload noremoteplayback noplaybackrate' : undefined,
    'aria-label': post.alt || undefined,
  });
  // attributes the DOM only honours as properties
  video.muted = true;
  video.loop = true;
  video.disableRemotePlayback = opts.protectMedia;

  const player = h(
    'div',
    'ig-pop__player',
    {
      'data-ig-player': true,
      'data-ig-label-play': labels.play,
      'data-ig-label-pause': labels.pause,
      'data-ig-label-mute': labels.mute,
      'data-ig-label-unmute': labels.unmute,
      'data-ig-seek-text': labels.seekText,
    },
    video,
    h(
      'button',
      'ig-pop__surface',
      { type: 'button', 'aria-label': labels.play, 'data-ig-toggle': true },
      playDisc(),
    ),
    h(
      'div',
      'ig-pop__scrub',
      {
        role: 'slider',
        tabindex: 0,
        'aria-label': labels.seek,
        'aria-valuemin': 0,
        'aria-valuemax': 0,
        'aria-valuenow': 0,
        'data-ig-scrub': true,
      },
      h('span', 'ig-pop__line', {}, h('span', 'ig-pop__fill')),
    ),
    h(
      'button',
      'ig-pop__mute',
      { type: 'button', 'aria-label': labels.unmute, 'data-muted': 'true', 'data-ig-mute': true },
      svg(
        { 'aria-hidden': 'true' },
        path({
          d: ICON.speaker,
          fill: 'currentColor',
          stroke: 'currentColor',
          'stroke-width': 2,
          'stroke-linejoin': 'round',
        }),
        path({ class: 'ig-pop__waves', d: ICON.waves, ...stroke(2, false, true) }),
        path({ class: 'ig-pop__slash', d: ICON.slash, ...stroke(2, false, true) }),
      ),
    ),
  );
  // popup.ts reads the class off the clip's wrapper (`display: contents`)
  return h('div', 'ig-pop__clip', {}, player, fallback(post, opts, slide.imageUrl));
}

function slideEl(
  slide: Slide,
  index: number,
  total: number,
  post: FeedPost,
  opts: FeedOptions,
): HTMLElement {
  const multi = total > 1;
  const el = h('div', 'ig-pop__slide', {
    'data-ig-slide': true,
    role: multi ? 'group' : undefined,
    'aria-label': multi ? fill(opts.labels.slide, { n: index + 1, total }) : undefined,
  });
  el.inert = index > 0;
  if (slide.videoUrl) {
    el.appendChild(clipSlide({ ...slide, videoUrl: slide.videoUrl }, post, opts));
  } else {
    el.appendChild(
      h('img', 'ig-pop__img', {
        src: slide.imageUrl,
        alt: post.alt,
        loading: 'lazy',
        decoding: 'async',
        draggable: opts.protectMedia ? 'false' : undefined,
      }),
    );
  }
  if (slide.isVideo && !slide.videoUrl) {
    // A clip with no file looks like any other clip until the disc is pressed (popup.ts).
    el.append(
      h(
        'button',
        'ig-pop__surface',
        { type: 'button', 'aria-label': opts.labels.play, 'data-ig-reveal': true },
        playDisc(),
      ),
      fallback(post, opts),
    );
  }
  return el;
}

function mediaBox(post: FeedPost, opts: FeedOptions): HTMLElement {
  const { labels } = opts;
  const slides = slidesOf(post);
  const multi = slides.length > 1;
  const scales = dotScales(0, slides.length);
  const media = h('div', 'ig-pop__media', {
    'data-ig-media': true,
    'data-ig-count': slides.length,
    'data-ig-slide-label': multi ? labels.slide : undefined,
  });
  media.appendChild(
    h(
      'div',
      'ig-pop__track',
      { 'data-ig-track': true },
      ...slides.map((slide, i) => slideEl(slide, i, slides.length, post, opts)),
    ),
  );
  if (multi) {
    const arrow = (kind: 'prev' | 'next'): HTMLElement =>
      h(
        'button',
        `ig-pop__nav ig-pop__nav--${kind}`,
        {
          type: 'button',
          'aria-label': kind === 'prev' ? labels.prevSlide : labels.nextSlide,
          [`data-ig-slide-${kind}`]: true,
          hidden: kind === 'prev',
        },
        icon(kind === 'prev' ? ICON.prev : ICON.next, {
          ...stroke(2.5, true, true),
        }),
      );
    media.append(
      arrow('prev'),
      arrow('next'),
      h(
        'span',
        'ig-pop__count',
        { 'aria-hidden': 'true', 'data-ig-counter': true },
        `1/${String(slides.length)}`,
      ),
      h(
        'div',
        'ig-pop__dots',
        { 'aria-hidden': 'true', 'data-ig-dots': true },
        ...slides.map((_, i) =>
          h('span', 'ig-pop__dot', {
            style: `--ig-dot-s:${String(scales[i] ?? 0)};--ig-dot-p:${i === 0 ? '1' : '0'}`,
          }),
        ),
      ),
      h('span', 'ig-vh', { role: 'status', 'data-ig-slide-status': true }),
    );
  }
  return media;
}

/** The like or comment count: the icon links to the post, the number is shown when the feed has it. */
function stat(
  post: FeedPost,
  opts: FeedOptions,
  glyph: string,
  count: number | undefined,
  label: string,
): HTMLElement {
  return h(
    'span',
    'ig-pop__stat',
    {},
    h(
      'a',
      'ig-pop__icon-btn',
      {
        href: post.permalink,
        target: '_blank',
        rel: 'noopener noreferrer',
        'aria-label': opts.labels.openOnInstagram,
      },
      icon(glyph, stroke(2, true)),
    ),
    count !== undefined
      ? h(
          'span',
          'ig-pop__num',
          {},
          h('span', null, { 'aria-hidden': 'true' }, formatCount(count, opts.locale)),
          h('span', 'ig-vh', {}, fill(label, { n: formatWhole(count, opts.locale) })),
        )
      : null,
  );
}

function footer(post: FeedPost, opts: FeedOptions, account: Feed['account']): HTMLElement {
  const { labels, locale, timeZone } = opts;
  const parts: Child[] = [];
  if (account) parts.push(h('strong', 'ig-pop__author', {}, `${account.username} `));
  for (const part of splitCaption(post.caption)) {
    parts.push(
      part.type === 'text'
        ? part.text
        : h(
            'a',
            'ig-pop__link',
            { href: part.href, target: '_blank', rel: 'noopener noreferrer' },
            part.text,
          ),
    );
  }
  const commentsLine = (count: number): string =>
    count === 1 ? labels.commentsOne : fill(labels.commentsAll, { n: formatWhole(count, locale) });

  return h(
    'div',
    'ig-pop__footer',
    {},
    h(
      'div',
      'ig-pop__actions',
      {},
      stat(post, opts, ICON.heart, post.likeCount, labels.likes),
      stat(post, opts, ICON.comment, post.commentsCount, labels.comments),
      h(
        'button',
        'ig-pop__icon-btn ig-pop__share',
        {
          type: 'button',
          'aria-label': labels.share,
          'data-ig-share': true,
          'data-ig-copied': labels.copied,
        },
        icon(ICON.share, stroke(2, true, true)),
      ),
      h('span', 'ig-pop__status', { role: 'status', 'data-ig-status': true }),
    ),
    post.caption
      ? h(
          'div',
          'ig-pop__caption',
          {},
          // the text keeps its own line breaks (white-space: pre-line): nothing but the caption goes inside
          h('p', 'ig-pop__text', { 'data-ig-text': true }, ...parts),
          h(
            'button',
            'ig-pop__more',
            {
              type: 'button',
              'aria-expanded': 'false',
              'data-ig-more': true,
              'data-ig-more-label': labels.more,
              'data-ig-less-label': labels.less,
              hidden: true,
            },
            h('span', 'ig-pop__ellipsis', { 'aria-hidden': 'true' }, '… '),
            h('span', null, { 'data-ig-more-text': true }, labels.more),
          ),
        )
      : null,
    post.commentsCount !== undefined && post.commentsCount > 0
      ? h(
          'a',
          'ig-pop__comments',
          { href: post.permalink, target: '_blank', rel: 'noopener noreferrer' },
          commentsLine(post.commentsCount),
        )
      : null,
    post.timestamp
      ? h(
          'time',
          'ig-pop__date',
          {
            datetime: post.timestamp,
            'data-ig-date': true,
            'data-ig-locale': locale,
            'data-ig-zone': timeZone,
          },
          formatPostDate(post.timestamp, { locale, timeZone }),
        )
      : null,
  );
}

function postTemplate(
  post: FeedPost,
  opts: FeedOptions,
  account: Feed['account'],
): HTMLTemplateElement {
  const template = h('template', null, {
    'data-ig-post': post.id,
    'data-ig-permalink': post.permalink,
    'data-ig-alt': post.alt || undefined,
  });
  template.content.append(mediaBox(post, opts), footer(post, opts, account));
  return template;
}

/** The header every card starts with: cloned into each card as it is mounted. */
function headTemplate(opts: FeedOptions, account: Feed['account'], profileUrl: string | undefined) {
  const { labels } = opts;
  const head = h('div', 'ig-pop__head');
  if (account) {
    const avatar = account.avatarUrl
      ? h('img', 'ig-pop__avatar', {
          src: account.avatarUrl,
          alt: '',
          loading: 'lazy',
          decoding: 'async',
          draggable: opts.protectMedia ? 'false' : undefined,
        })
      : h(
          'span',
          'ig-pop__avatar ig-pop__avatar--initial',
          { 'aria-hidden': 'true' },
          account.username.charAt(0).toUpperCase(),
        );
    // avatar and username are ONE link to the profile; without a profile link it has no href
    head.appendChild(
      h(
        'a',
        'ig-pop__profile',
        {
          href: profileUrl,
          target: profileUrl ? '_blank' : undefined,
          rel: profileUrl ? 'noopener noreferrer' : undefined,
        },
        avatar,
        h('span', 'ig-pop__user', {}, account.username),
      ),
    );
    if (profileUrl) {
      head.appendChild(
        h(
          'span',
          'ig-pop__who',
          {},
          h('span', 'ig-pop__sep', { 'aria-hidden': 'true' }, '•'),
          h(
            'a',
            'ig-pop__follow',
            {
              href: profileUrl,
              target: '_blank',
              rel: 'noopener noreferrer',
              'aria-label': labels.followProfile,
            },
            labels.followShort,
          ),
        ),
      );
    }
  }
  head.appendChild(
    h(
      'button',
      'ig-pop__close',
      { type: 'button', 'data-ig-close': true, 'aria-label': labels.close },
      icon(ICON.close, stroke(2, false, true)),
    ),
  );
  const template = h('template', null, { 'data-ig-head': true });
  template.content.appendChild(head);
  return template;
}

function dialogTemplate(
  feed: Feed,
  opts: FeedOptions,
  popupCount: number,
  profileUrl: string | undefined,
): HTMLTemplateElement {
  const { labels, locale } = opts;
  const end = feedEnd({
    shown: popupCount,
    delivered: feed.posts.length,
    mediaCount: feed.account?.mediaCount,
    more: feed.more,
  });
  const endText =
    end.kind === 'count'
      ? end.remaining === 1
        ? labels.endCountOne
        : fill(labels.endCount, { n: formatWhole(end.remaining, locale) })
      : end.kind === 'more'
        ? labels.endMore
        : end.kind === 'all'
          ? labels.endAll
          : undefined;
  const endLink =
    end.kind === 'count' || end.kind === 'more'
      ? labels.endLinkAll
      : end.kind === 'all'
        ? labels.endProfile
        : labels.moreOnInstagram;

  popupSerial += 1;
  const step = (by: -1 | 1): HTMLElement =>
    h(
      'button',
      'ig-pop__step',
      {
        type: 'button',
        'aria-label': by < 0 ? labels.prevPost : labels.nextPost,
        'data-ig-step': by,
        hidden: by < 0,
      },
      icon(by < 0 ? ICON.up : ICON.down, stroke(2.5, true, true)),
    );

  const dialog = h(
    'div',
    'ig-pop',
    {
      id: `ig-popup-${String(popupSerial)}`,
      'data-modal': true,
      'data-ig-popup': true,
      'data-ig-protect': opts.protectMedia,
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': labels.dialog,
    },
    // the posts are cards in one list (popup.ts mounts the ones near the visitor)
    h(
      'div',
      'ig-pop__scroll',
      { 'data-ig-scroll': true },
      h('div', 'ig-pop__feed', { role: 'feed', 'aria-label': labels.region, 'data-ig-list': true }),
      profileUrl
        ? h(
            'div',
            'ig-pop__end',
            { 'data-end': end.kind },
            endText ? h('p', 'ig-pop__end-text', {}, endText) : null,
            h(
              'a',
              'ig-pop__end-link',
              { href: profileUrl, target: '_blank', rel: 'noopener noreferrer' },
              endLink,
            ),
          )
        : null,
    ),
    // two round buttons for pointers: the previous and the next post
    h('div', 'ig-pop__steps', {}, step(-1), step(1)),
    headTemplate(opts, feed.account, profileUrl),
  );
  const template = h('template', null, { 'data-ig-dialog': true });
  template.content.appendChild(dialog);
  return template;
}

// ── the feed ────────────────────────────────────────────────────────────

/**
 * Replaces the root's content with the feed. `loading` renders placeholder tiles for a feed that
 * has not answered yet, so the box keeps its size and the page does not jump.
 */
export function renderFeed(
  root: HTMLElement,
  feed: Feed,
  opts: FeedOptions,
  loading = false,
): void {
  const posts = feed.posts;
  const hasPosts = posts.length > 0;
  // Placeholders stand in for a feed we could NOT read, never for an account that has no posts.
  const showPlaceholder =
    !hasPosts && (loading || feed.status !== 'ok') && opts.placeholder === 'tiles';
  const profileUrl = opts.profileUrl ?? feed.account?.profileUrl;
  const showFooter = opts.showProfileLink && Boolean(profileUrl) && !loading;
  const popupOn = opts.popup && hasPosts;
  const popupCount = Math.max(1, Math.min(opts.popupLimit, MAX_LIMIT, posts.length));
  const hasPreview =
    opts.hoverPreview && posts.some((post) => post.type === 'VIDEO' && post.videoUrl);

  root.classList.add('ig-feed');
  root.dataset.layout = opts.layout;
  root.dataset.status = loading ? 'loading' : feed.status;
  if (opts.protectMedia) root.setAttribute('data-ig-protect', '');
  else root.removeAttribute('data-ig-protect');
  if (hasPreview) root.setAttribute('data-ig-hover-preview', '');
  else root.removeAttribute('data-ig-hover-preview');
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', opts.labels.region);
  root.setAttribute('aria-busy', String(loading));
  root.style.setProperty('--ig-cols-base', String(opts.columns.base));
  root.style.setProperty('--ig-cols-md', String(opts.columns.md));
  root.style.setProperty('--ig-cols-lg', String(opts.columns.lg));
  root.style.setProperty('--ig-ratio', opts.ratio);
  root.replaceChildren();

  if (!hasPosts && !showPlaceholder && !showFooter) {
    root.hidden = true;
    return;
  }
  root.hidden = false;

  if (hasPosts || showPlaceholder) {
    const track = h('ul', 'ig-feed__track', { role: 'list', 'data-ig-track': true });
    if (hasPosts) {
      posts.forEach((post, i) => track.appendChild(postTile(post, opts, i, popupCount)));
    } else {
      const count = opts.layout === 'carousel' ? opts.columns.lg + 1 : opts.rows * opts.columns.lg;
      for (let i = 0; i < count; i += 1) track.appendChild(placeholderTile(opts, i));
    }
    const stage = h('div', 'ig-feed__stage', {}, track);
    if (opts.layout === 'carousel' && hasPosts) {
      const prev = navButton('prev', opts.labels.prev);
      const next = navButton('next', opts.labels.next);
      stage.append(prev, next);
      wireCarousel(track, prev, next);
    }
    root.appendChild(stage);
  }

  if (showFooter && profileUrl) {
    root.appendChild(
      h(
        'div',
        'ig-feed__footer',
        {},
        h(
          'a',
          'ig-feed__follow',
          { href: profileUrl, target: '_blank', rel: 'noopener noreferrer' },
          opts.labels.follow,
        ),
      ),
    );
  }

  if (popupOn) {
    root.appendChild(dialogTemplate(feed, opts, popupCount, profileUrl));
    posts
      .slice(0, popupCount)
      .forEach((post) => root.appendChild(postTemplate(post, opts, feed.account)));
  }
}
