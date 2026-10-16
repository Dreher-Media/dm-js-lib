import type { Feed, FeedColumns, FeedOptions, FeedPost } from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';

type Attrs = Record<string, string>;

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  attrs: Attrs = {},
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
};

const svgIcon = (paths: Attrs[]): SVGSVGElement => {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('aria-hidden', 'true');
  for (const attrs of paths) {
    const path = document.createElementNS(SVG_NS, 'path');
    for (const [k, v] of Object.entries(attrs)) path.setAttribute(k, v);
    svg.appendChild(path);
  }
  return svg;
};

const stroke = { fill: 'none', stroke: 'currentColor', 'stroke-width': '2' };
const ICON_VIDEO = [{ d: 'M8 5v14l11-7z', fill: 'currentColor' }];
const ICON_ALBUM = [
  {
    ...stroke,
    d: 'M7 3h12a2 2 0 0 1 2 2v12M3 7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    'stroke-linejoin': 'round',
  },
];
const ICON_PREV = [
  { ...stroke, d: 'M15 5l-7 7 7 7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
];
const ICON_NEXT = [
  { ...stroke, d: 'M9 5l7 7-7 7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
];

/** Which breakpoints show tile `index` in the grid layout. */
export function visibleFlags(index: number, rows: number, columns: FeedColumns) {
  return {
    base: index < rows * columns.base,
    md: index < rows * columns.md,
    lg: index < rows * columns.lg,
  };
}

const offClasses = (index: number, opts: FeedOptions): string[] => {
  if (opts.layout !== 'grid') return [];
  const on = visibleFlags(index, opts.rows, opts.columns);
  return [!on.base && 'is-off-base', !on.md && 'is-off-md', !on.lg && 'is-off-lg'].filter(
    (c): c is string => Boolean(c),
  );
};

const tileName = (post: FeedPost, opts: FeedOptions): string =>
  [
    post.alt,
    post.type === 'VIDEO'
      ? opts.labels.video
      : post.type === 'CAROUSEL_ALBUM'
        ? opts.labels.album
        : '',
    opts.labels.openPost,
  ]
    .filter(Boolean)
    .join(' – ');

function postTile(post: FeedPost, opts: FeedOptions, index: number): HTMLElement {
  const item = el('li', ['ig-feed__item', ...offClasses(index, opts)].join(' '));
  const link = el('a', 'ig-feed__tile', {
    href: post.permalink,
    target: '_blank',
    rel: 'noopener noreferrer',
    'aria-label': tileName(post, opts),
  });
  // alt is empty on purpose: the link's accessible name already carries it.
  const img = el('img', 'ig-feed__img', {
    src: post.imageUrl,
    alt: '',
    loading: index < opts.columns.lg ? 'eager' : 'lazy',
    decoding: 'async',
    referrerpolicy: 'no-referrer',
  });
  link.appendChild(img);

  if (post.type !== 'IMAGE') {
    const badge = el('span', 'ig-feed__badge', { 'aria-hidden': 'true' });
    badge.appendChild(svgIcon(post.type === 'VIDEO' ? ICON_VIDEO : ICON_ALBUM));
    link.appendChild(badge);
  }
  if (opts.overlay === 'hover' && post.caption) {
    const overlay = el('span', 'ig-feed__overlay', { 'aria-hidden': 'true' });
    const caption = el('span', 'ig-feed__caption');
    caption.textContent = post.caption; // text, never markup
    overlay.appendChild(caption);
    link.appendChild(overlay);
  }
  item.appendChild(link);
  return item;
}

function placeholderTile(opts: FeedOptions, index: number): HTMLElement {
  const item = el('li', ['ig-feed__item', ...offClasses(index, opts)].join(' '), {
    'aria-hidden': 'true',
  });
  item.appendChild(el('span', 'ig-feed__tile ig-feed__tile--placeholder'));
  return item;
}

function navButton(kind: 'prev' | 'next', label: string): HTMLButtonElement {
  const button = el('button', `ig-feed__nav ig-feed__nav--${kind}`, {
    type: 'button',
    'aria-label': label,
    [`data-ig-${kind}`]: '',
  });
  button.hidden = true;
  button.appendChild(svgIcon(kind === 'prev' ? ICON_PREV : ICON_NEXT));
  return button;
}

/** Arrows page the track by its width and show only while there is something to scroll to. */
function wireCarousel(track: HTMLElement, prev: HTMLButtonElement, next: HTMLButtonElement): void {
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const update = (): void => {
    const max = track.scrollWidth - track.clientWidth;
    prev.hidden = next.hidden = max <= 1;
    prev.disabled = track.scrollLeft <= 1;
    next.disabled = track.scrollLeft >= max - 1;
  };
  const page = (direction: -1 | 1): void => {
    track.scrollBy({
      left: direction * track.clientWidth,
      behavior: reduceMotion?.matches ? 'auto' : 'smooth',
    });
  };
  prev.addEventListener('click', () => page(-1));
  next.addEventListener('click', () => page(1));
  track.addEventListener('scroll', update, { passive: true });
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(update).observe(track);
  update();
}

/**
 * Replaces the root's content with the feed. `loading` renders placeholder tiles for a feed
 * that has not answered yet, so the box keeps its size and the page does not jump.
 */
export function renderFeed(
  root: HTMLElement,
  feed: Feed,
  opts: FeedOptions,
  loading = false,
): void {
  const hasPosts = feed.posts.length > 0;
  // Placeholders stand in for a feed we could NOT read, never for an account that has no posts.
  const showPlaceholder =
    !hasPosts && (loading || feed.status !== 'ok') && opts.placeholder === 'tiles';
  const profileUrl = opts.profileUrl ?? feed.account?.profileUrl;
  const showFooter = opts.showProfileLink && Boolean(profileUrl) && !loading;

  root.classList.add('ig-feed');
  root.dataset.layout = opts.layout;
  root.dataset.status = loading ? 'loading' : feed.status;
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
    const stage = el('div', 'ig-feed__stage');
    const track = el('ul', 'ig-feed__track', { role: 'list', 'data-ig-track': '' });
    if (hasPosts) {
      feed.posts.forEach((post, i) => track.appendChild(postTile(post, opts, i)));
    } else {
      const count = opts.layout === 'carousel' ? opts.columns.lg + 1 : opts.rows * opts.columns.lg;
      for (let i = 0; i < count; i += 1) track.appendChild(placeholderTile(opts, i));
    }
    stage.appendChild(track);

    if (opts.layout === 'carousel' && hasPosts) {
      const prev = navButton('prev', opts.labels.prev);
      const next = navButton('next', opts.labels.next);
      stage.append(prev, next);
      wireCarousel(track, prev, next);
    }
    root.appendChild(stage);
  }

  if (showFooter && profileUrl) {
    const footer = el('div', 'ig-feed__footer');
    const link = el('a', 'ig-feed__follow', {
      href: profileUrl,
      target: '_blank',
      rel: 'noopener noreferrer',
    });
    link.textContent = opts.labels.follow;
    footer.appendChild(link);
    root.appendChild(footer);
  }
}
