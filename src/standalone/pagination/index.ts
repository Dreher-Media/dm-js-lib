import type {
  PaginationAnimationEngine,
  PaginationAnimationScope,
  PaginationAnimationStyle,
  PaginationInstanceState,
  PaginationMode,
  PaginationOptions,
} from "./types";

type InstancesMap = Map<string, PaginationInstanceState>;

const DEFAULT_INSTANCE_ID = "default";
const PAGINATION_ACTIVE_CLASS = "pagination-active";
const PAGINATION_DISABLED_CLASS = "pagination-disabled";
const DEFAULT_ANIMATION_DURATION = 220;
const DEFAULT_ANIMATION_STAGGER = 30;
const DEFAULT_ANIMATION_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const ANIMATION_TIMEOUT_BUFFER_MS = 120;
const MAX_ITEM_ANIMATIONS = 64;
const NON_RENDERED_ITEM_TAGS = new Set(["SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT", "LINK", "META"]);
const instances: InstancesMap = new Map();
const renderQueues = new Map<string, Promise<void>>();
const sourceItemsByInstance = new Map<string, HTMLElement[]>();

const getInstanceId = (element: HTMLElement | null): string => {
  if (!element) return DEFAULT_INSTANCE_ID;
  const own = element.dataset.paginationInstance;
  if (own && own.trim()) return own.trim();
  const scoped = element.closest<HTMLElement>("[data-pagination-instance]");
  if (scoped?.dataset.paginationInstance?.trim()) return scoped.dataset.paginationInstance.trim();
  return DEFAULT_INSTANCE_ID;
};

const isReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

const readStringAttr = (
  source: HTMLElement | null,
  attr: keyof HTMLElement["dataset"]
): string | undefined => {
  if (!source) return undefined;
  const attrKey = String(attr);
  const dataAttrName = `data-${attrKey.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;
  const local = (source.dataset as unknown as Record<string, string | undefined>)[attrKey];
  const nearest = source.closest<HTMLElement>(`[${dataAttrName}]`);
  const inherited = nearest
    ? (nearest.dataset as unknown as Record<string, string | undefined>)[attrKey]
    : undefined;
  const value = local ?? inherited;
  return value && value.trim() ? value.trim() : undefined;
};

const readNumberAttr = (
  source: HTMLElement | null,
  attr: keyof HTMLElement["dataset"],
  defaultValue: number
): number => {
  const raw = readStringAttr(source, attr);
  if (!raw) return defaultValue;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
};

const resolveMode = (list: HTMLElement): PaginationMode => {
  const mode = readStringAttr(list, "paginationMode");
  if (mode === "load-more" || mode === "infinite") return mode;
  return "numbers";
};

const resolveAnimationEngine = (list: HTMLElement): PaginationAnimationEngine =>
  readStringAttr(list, "paginationAnimationEngine") === "css" ? "css" : "js";

const resolveAnimationStyle = (list: HTMLElement): PaginationAnimationStyle => {
  const style = readStringAttr(list, "paginationAnimationStyle");
  if (style === "slide-up" || style === "slide-left" || style === "scale" || style === "none") {
    return style;
  }
  return "fade";
};

const resolveAnimationScope = (list: HTMLElement): PaginationAnimationScope => {
  const scope = readStringAttr(list, "paginationAnimationScope");
  if (scope === "list" || scope === "both") return scope;
  return "items";
};

const resolveOptions = (list: HTMLElement, instanceId: string): PaginationOptions => {
  const pageSize = readNumberAttr(list, "paginationPageSize", 12);
  const firstRaw = readStringAttr(list, "paginationFirstPageSize");
  const firstParsed = firstRaw ? Number.parseInt(firstRaw, 10) : NaN;
  const firstPageSize = Number.isFinite(firstParsed) && firstParsed > 0 ? firstParsed : undefined;
  const urlKey = list.dataset.paginationUrl === "true" ? instanceId : undefined;
  const persistKey = list.dataset.paginationPersist || undefined;
  const hideLoadMoreWhenComplete =
    list.dataset.paginationHideLoadMoreWhenComplete !== "false" &&
    list.closest<HTMLElement>('[data-pagination-hide-load-more-when-complete="false"]') === null;
  const infiniteOffsetRaw = list.dataset.paginationInfiniteOffset;
  const infiniteOffset = infiniteOffsetRaw ? Number.parseFloat(infiniteOffsetRaw) : 0.5;
  const animate =
    list.dataset.paginationAnimate !== "false" &&
    list.closest<HTMLElement>('[data-pagination-animate="false"]') === null;

  return {
    mode: resolveMode(list),
    pageSize,
    firstPageSize,
    startPage: readNumberAttr(list, "paginationStartPage", 1),
    urlKey,
    persistKey,
    infiniteOffset: Number.isFinite(infiniteOffset) ? infiniteOffset : 0.5,
    hideLoadMoreWhenComplete,
    animate,
    animationEngine: resolveAnimationEngine(list),
    animationStyle: resolveAnimationStyle(list),
    animationScope: resolveAnimationScope(list),
    animationDuration: readNumberAttr(list, "paginationAnimationDuration", DEFAULT_ANIMATION_DURATION),
    animationStagger: readNumberAttr(list, "paginationAnimationStagger", DEFAULT_ANIMATION_STAGGER),
    animationEasing: readStringAttr(list, "paginationAnimationEasing") ?? DEFAULT_ANIMATION_EASING,
  };
};

const collectItems = (list: HTMLElement): HTMLElement[] => {
  const explicit = Array.from(list.querySelectorAll<HTMLElement>("[data-pagination-item]"));
  const source = explicit.length > 0 ? explicit : Array.from(list.children).filter(
    (node): node is HTMLElement => node instanceof HTMLElement
  );
  return source.filter((item) => {
    if (NON_RENDERED_ITEM_TAGS.has(item.tagName)) return false;
    if (item.classList.contains("pagination-exclude")) return false;
    if (item.classList.contains("filter-hidden")) return false;
    return true;
  });
};

const isRuntimeEligibleItem = (item: HTMLElement): boolean => {
  if (NON_RENDERED_ITEM_TAGS.has(item.tagName)) return false;
  if (item.classList.contains("pagination-exclude")) return false;
  if (item.classList.contains("filter-hidden")) return false;
  return true;
};

const collectControls = (
  root: HTMLElement,
  instanceId: string
): PaginationInstanceState["elements"]["controls"] => {
  const scope = root.closest<HTMLElement>("[data-pagination-instance]") ?? root;
  const queryAll = (selector: string): HTMLElement[] =>
    Array.from(scope.querySelectorAll<HTMLElement>(selector)).filter(
      (el) => getInstanceId(el) === instanceId
    );
  return {
    prev: queryAll('[data-pagination-control="prev"]'),
    next: queryAll('[data-pagination-control="next"]'),
    first: queryAll('[data-pagination-control="first"]'),
    last: queryAll('[data-pagination-control="last"]'),
    loadMore: queryAll('[data-pagination-control="load-more"]'),
  };
};

const collectStatus = (
  root: HTMLElement,
  instanceId: string
): PaginationInstanceState["elements"]["status"] => {
  const scope = root.closest<HTMLElement>("[data-pagination-instance]") ?? root;
  const queryAll = (selector: string): HTMLElement[] =>
    Array.from(scope.querySelectorAll<HTMLElement>(selector)).filter(
      (el) => getInstanceId(el) === instanceId
    );
  return {
    currentPage: queryAll("[data-pagination-current-page]"),
    totalPages: queryAll("[data-pagination-total-pages]"),
    totalItems: queryAll("[data-pagination-total-items]"),
    visibleItems: queryAll("[data-pagination-visible-items]"),
  };
};

const collectSentinel = (root: HTMLElement): HTMLElement | null => {
  const scope = root.closest<HTMLElement>("[data-pagination-instance]") ?? root;
  return (
    scope.querySelector<HTMLElement>("[data-pagination-sentinel]") ??
    scope.querySelector<HTMLElement>('[data-pagination-control="load-more"]')
  );
};

const computeTotalPages = (totalItems: number, pageSize: number, firstPageSize?: number): number => {
  const first = firstPageSize ?? pageSize;
  if (totalItems <= 0) return 1;
  if (totalItems <= first) return 1;
  return 1 + Math.ceil((totalItems - first) / pageSize);
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const visibleIndexSet = (
  mode: PaginationMode,
  currentPage: number,
  totalItems: number,
  pageSize: number,
  firstPageSize?: number
): Set<number> => {
  const first = firstPageSize ?? pageSize;
  const visible = new Set<number>();
  if (totalItems <= 0) return visible;

  if (mode === "numbers") {
    if (currentPage <= 1) {
      for (let i = 0; i < Math.min(first, totalItems); i += 1) visible.add(i);
      return visible;
    }
    const start = first + (currentPage - 2) * pageSize;
    const end = Math.min(start + pageSize, totalItems);
    for (let i = start; i < end; i += 1) visible.add(i);
    return visible;
  }

  const count = currentPage <= 1 ? first : first + (currentPage - 1) * pageSize;
  const end = Math.min(count, totalItems);
  for (let i = 0; i < end; i += 1) visible.add(i);
  return visible;
};

const setDisabled = (elements: HTMLElement[], disabled: boolean): void => {
  elements.forEach((element) => {
    element.classList.toggle(PAGINATION_DISABLED_CLASS, disabled);
    element.classList.toggle("is-disabled", disabled);
    if (disabled) element.setAttribute("aria-disabled", "true");
    else element.removeAttribute("aria-disabled");
  });
};

const normalizeRenderedItem = (item: HTMLElement): void => {
  item.style.display = "";
  item.style.visibility = "visible";
  item.style.opacity = "1";
  item.style.transform = "";
  item.style.willChange = "";
};

const getKeyframes = (style: PaginationAnimationStyle, phase: "enter" | "exit"): Keyframe[] => {
  if (style === "none") return [{ opacity: 1 }, { opacity: 1 }];
  if (style === "slide-up") {
    return phase === "enter"
      ? [{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "translateY(0)" }]
      : [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(-12px)" }];
  }
  if (style === "slide-left") {
    return phase === "enter"
      ? [{ opacity: 0, transform: "translateX(12px)" }, { opacity: 1, transform: "translateX(0)" }]
      : [{ opacity: 1, transform: "translateX(0)" }, { opacity: 0, transform: "translateX(-12px)" }];
  }
  if (style === "scale") {
    return phase === "enter"
      ? [{ opacity: 0, transform: "scale(0.96)" }, { opacity: 1, transform: "scale(1)" }]
      : [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(0.96)" }];
  }
  return phase === "enter" ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }];
};

const runWaapiGroup = (
  elements: HTMLElement[],
  keyframes: Keyframe[],
  duration: number,
  easing: string,
  stagger: number
): Animation[] => {
  const animations: Animation[] = [];
  elements.forEach((element, index) => {
    if (!element.isConnected) return;
    element.style.willChange = "opacity, transform";
    const animation = element.animate(keyframes, {
      duration,
      easing,
      delay: Math.max(0, stagger) * index,
      fill: "both",
    });
    animation.finished.finally(() => {
      element.style.willChange = "";
    });
    animations.push(animation);
  });
  return animations;
};

const awaitAnimations = async (animations: Animation[], timeoutMs: number): Promise<void> => {
  if (animations.length === 0) return;
  await Promise.race([
    Promise.all(animations.map((animation) => animation.finished.catch(() => undefined))).then(() => undefined),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, timeoutMs);
    }),
  ]);
};

const cancelAnimations = (instance: PaginationInstanceState): void => {
  const active = instance.activeAnimations ?? [];
  active.forEach((animation) => {
    try {
      animation.cancel();
    } catch {
      // noop
    }
  });
  instance.activeAnimations = [];
};

const applyCssPhase = (
  items: HTMLElement[],
  phase: "enter" | "exit"
): void => {
  const base = phase === "enter" ? "pagination-item-enter" : "pagination-item-exit";
  const active = `${base}-active`;
  items.forEach((item) => {
    item.classList.add(base);
    item.classList.add(active);
  });
};

const clearCssPhase = (
  items: HTMLElement[],
  phase: "enter" | "exit"
): void => {
  const base = phase === "enter" ? "pagination-item-enter" : "pagination-item-exit";
  const active = `${base}-active`;
  items.forEach((item) => {
    item.classList.remove(base);
    item.classList.remove(active);
  });
};

const readPageFromUrl = (key: string): number | null => {
  try {
    const url = new URL(window.location.href);
    const raw = url.searchParams.get(`page_${key}`);
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
};

const writePageToUrl = (key: string, page: number): void => {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set(`page_${key}`, String(page));
    window.history.replaceState({}, "", url.toString());
  } catch {
    // noop
  }
};

const readPageFromStorage = (key: string): number | null => {
  try {
    const raw = window.localStorage.getItem(`pagination_${key}`);
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
};

const writePageToStorage = (key: string, page: number): void => {
  try {
    window.localStorage.setItem(`pagination_${key}`, String(page));
  } catch {
    // noop
  }
};

const persistPage = (instance: PaginationInstanceState): void => {
  if (instance.options.persistKey) writePageToStorage(instance.options.persistKey, instance.currentPage);
  if (instance.options.urlKey) writePageToUrl(instance.options.urlKey, instance.currentPage);
};

const visibleCountForState = (instance: PaginationInstanceState): number => {
  const totalItems = instance.elements.items.length;
  const first = instance.options.firstPageSize ?? instance.options.pageSize;
  if (instance.options.mode === "numbers") {
    if (instance.currentPage <= 1) return Math.min(first, totalItems);
    const start = first + (instance.currentPage - 2) * instance.options.pageSize;
    return Math.max(0, Math.min(instance.options.pageSize, totalItems - start));
  }
  if (instance.currentPage <= 1) return Math.min(first, totalItems);
  return Math.min(first + (instance.currentPage - 1) * instance.options.pageSize, totalItems);
};

const updateStatus = (instance: PaginationInstanceState): void => {
  const totalItems = instance.elements.items.length;
  const visibleItems = visibleCountForState(instance);
  instance.elements.status.currentPage.forEach((el) => {
    el.textContent = String(instance.currentPage);
  });
  instance.elements.status.totalPages.forEach((el) => {
    el.textContent = String(instance.totalPages);
  });
  instance.elements.status.totalItems.forEach((el) => {
    el.textContent = String(totalItems);
  });
  instance.elements.status.visibleItems.forEach((el) => {
    el.textContent = String(visibleItems);
  });
};

const updateControls = (instance: PaginationInstanceState): void => {
  const atStart = instance.currentPage <= 1;
  const atEnd = instance.currentPage >= instance.totalPages;

  if (instance.options.mode === "numbers") {
    setDisabled(instance.elements.controls.prev, atStart);
    setDisabled(instance.elements.controls.first, atStart);
    setDisabled(instance.elements.controls.next, atEnd);
    setDisabled(instance.elements.controls.last, atEnd);
    instance.elements.controls.prev.forEach((button) => {
      button.style.visibility = atStart ? "hidden" : "";
      button.style.pointerEvents = atStart ? "none" : "";
    });
    instance.elements.controls.next.forEach((button) => {
      button.style.visibility = atEnd ? "hidden" : "";
      button.style.pointerEvents = atEnd ? "none" : "";
    });
  } else {
    const complete = atEnd;
    setDisabled(instance.elements.controls.loadMore, complete);
    instance.elements.controls.loadMore.forEach((button) => {
      if (complete) button.setAttribute("data-pagination-complete", "true");
      else button.removeAttribute("data-pagination-complete");
      if (instance.options.hideLoadMoreWhenComplete) {
        button.style.display = complete ? "none" : "";
      }
    });
  }

  const scope = instance.elements.list.closest<HTMLElement>("[data-pagination-instance]") ?? instance.elements.list;
  const pageButtons = scope.querySelectorAll<HTMLElement>("[data-pagination-page]");
  pageButtons.forEach((button) => {
    const pageAttr = button.dataset.paginationPage;
    if (!pageAttr || pageAttr === "*") return;
    const page = Number.parseInt(pageAttr, 10);
    if (!Number.isFinite(page)) return;
    const active = page === instance.currentPage;
    button.classList.toggle(PAGINATION_ACTIVE_CLASS, active);
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
};

const dispatchChangeEvents = (instance: PaginationInstanceState): void => {
  const detail = {
    instanceId: instance.id,
    currentPage: instance.currentPage,
    totalPages: instance.totalPages,
    totalItems: instance.elements.items.length,
  };
  instance.elements.list.dispatchEvent(new CustomEvent("pagination:change", { detail }));
  if (instance.currentPage >= instance.totalPages) {
    instance.elements.list.dispatchEvent(new CustomEvent("pagination:end", { detail }));
  }
};

const applyAnimationVars = (instance: PaginationInstanceState): void => {
  const list = instance.elements.list;
  list.style.setProperty("--pagination-anim-duration", `${instance.options.animationDuration}ms`);
  list.style.setProperty("--pagination-anim-stagger", `${instance.options.animationStagger}ms`);
  list.style.setProperty("--pagination-anim-easing", instance.options.animationEasing);
};

const ensureObserver = (instance: PaginationInstanceState): void => {
  if (instance.options.mode !== "infinite" || !("IntersectionObserver" in window)) {
    if (instance.observer) {
      instance.observer.disconnect();
      instance.observer = undefined;
    }
    return;
  }

  if (instance.observer) instance.observer.disconnect();
  const sentinel = instance.elements.sentinel;
  if (!sentinel) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const next = instance.currentPage + 1;
        if (next > instance.totalPages) return;
        void goToPageInternal(instance.id, next);
      });
    },
    {
      root: null,
      threshold: instance.options.infiniteOffset ?? 0.5,
    }
  );
  observer.observe(sentinel);
  instance.observer = observer;
};

const isSameItemSet = (left: HTMLElement[], right: HTMLElement[]): boolean => {
  if (left.length !== right.length) return false;
  return left.every((item, index) => item === right[index]);
};

const performRender = async (instance: PaginationInstanceState): Promise<void> => {
  const sourceItems = sourceItemsByInstance.get(instance.id) ?? instance.elements.items;
  const activeItems = sourceItems.filter(isRuntimeEligibleItem);
  instance.elements.items = activeItems;
  const totalItems = activeItems.length;
  instance.totalPages = computeTotalPages(totalItems, instance.options.pageSize, instance.options.firstPageSize);
  instance.currentPage = clamp(instance.currentPage, 1, instance.totalPages);
  const targetVisible = visibleIndexSet(
    instance.options.mode,
    instance.currentPage,
    totalItems,
    instance.options.pageSize,
    instance.options.firstPageSize
  );
  const nextItems = activeItems.filter((_, index) => targetVisible.has(index));
  const sourceSet = new Set(sourceItems);
  const currentItems = Array.from(instance.elements.list.children).filter(
    (node): node is HTMLElement => node instanceof HTMLElement && sourceSet.has(node)
  );

  const token = (instance.animationToken ?? 0) + 1;
  instance.animationToken = token;
  cancelAnimations(instance);

  const entering = nextItems.filter((item) => !currentItems.includes(item));
  const exiting = currentItems.filter((item) => !nextItems.includes(item));
  const hasDomChange = !isSameItemSet(currentItems, nextItems);

  const shouldAnimate =
    hasDomChange &&
    instance.options.animate &&
    instance.options.animationStyle !== "none" &&
    !isReducedMotion() &&
    (entering.length > 0 || exiting.length > 0);

  if (shouldAnimate) {
    const useListAnimation =
      instance.options.animationScope === "list" || instance.options.animationScope === "both";
    const useItemAnimation =
      (instance.options.animationScope === "items" || instance.options.animationScope === "both") &&
      entering.length + exiting.length <= MAX_ITEM_ANIMATIONS;

    const timeout =
      instance.options.animationDuration +
      Math.max(entering.length, exiting.length) * instance.options.animationStagger +
      ANIMATION_TIMEOUT_BUFFER_MS;

    if (instance.options.animationEngine === "css") {
      if (useListAnimation) {
        instance.elements.list.classList.add("pagination-list-exit", "pagination-list-exit-active");
      }
      if (useItemAnimation) applyCssPhase(exiting, "exit");
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, timeout);
      });
      if (instance.animationToken !== token) return;

      if (useListAnimation) {
        instance.elements.list.classList.remove("pagination-list-exit", "pagination-list-exit-active");
      }
      if (useItemAnimation) clearCssPhase(exiting, "exit");

      instance.elements.list.replaceChildren(...nextItems);
      nextItems.forEach((item) => {
        normalizeRenderedItem(item);
      });

      if (useListAnimation) {
        instance.elements.list.classList.add("pagination-list-enter", "pagination-list-enter-active");
      }
      if (useItemAnimation) applyCssPhase(entering, "enter");
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, timeout);
      });
      if (instance.animationToken !== token) return;

      if (useListAnimation) {
        instance.elements.list.classList.remove("pagination-list-enter", "pagination-list-enter-active");
      }
      if (useItemAnimation) clearCssPhase(entering, "enter");
    } else {
      const exitAnimations: Animation[] = [];
      if (useListAnimation) {
        exitAnimations.push(
          ...runWaapiGroup(
            [instance.elements.list],
            getKeyframes(instance.options.animationStyle, "exit"),
            instance.options.animationDuration,
            instance.options.animationEasing,
            0
          )
        );
      }
      if (useItemAnimation) {
        exitAnimations.push(
          ...runWaapiGroup(
            exiting,
            getKeyframes(instance.options.animationStyle, "exit"),
            instance.options.animationDuration,
            instance.options.animationEasing,
            instance.options.animationStagger
          )
        );
      }
      instance.activeAnimations = exitAnimations;
      await awaitAnimations(exitAnimations, timeout);
      if (instance.animationToken !== token) return;

      instance.elements.list.replaceChildren(...nextItems);
      nextItems.forEach((item) => {
        normalizeRenderedItem(item);
      });

      const enterAnimations: Animation[] = [];
      if (useListAnimation) {
        enterAnimations.push(
          ...runWaapiGroup(
            [instance.elements.list],
            getKeyframes(instance.options.animationStyle, "enter"),
            instance.options.animationDuration,
            instance.options.animationEasing,
            0
          )
        );
      }
      if (useItemAnimation) {
        enterAnimations.push(
          ...runWaapiGroup(
            entering,
            getKeyframes(instance.options.animationStyle, "enter"),
            instance.options.animationDuration,
            instance.options.animationEasing,
            instance.options.animationStagger
          )
        );
      }
      instance.activeAnimations = enterAnimations;
      await awaitAnimations(enterAnimations, timeout);
      if (instance.animationToken !== token) return;
    }
  }

  if (!shouldAnimate) {
    if (hasDomChange) {
      instance.elements.list.replaceChildren(...nextItems);
    }
    nextItems.forEach((item) => {
      normalizeRenderedItem(item);
    });
  }

  if (instance.animationToken !== token) return;
  cancelAnimations(instance);
  const finalItems = activeItems.filter((_, index) => targetVisible.has(index));
  if (!isSameItemSet(Array.from(instance.elements.list.children).filter(
    (node): node is HTMLElement => node instanceof HTMLElement && sourceSet.has(node)
  ), finalItems)) {
    instance.elements.list.replaceChildren(...finalItems);
  }
  finalItems.forEach((item) => {
    normalizeRenderedItem(item);
  });
  updateStatus(instance);
  updateControls(instance);
  dispatchChangeEvents(instance);
};

const enqueueRender = (instance: PaginationInstanceState, persist = true): Promise<void> => {
  const previous = renderQueues.get(instance.id) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(async () => {
      applyAnimationVars(instance);
      await performRender(instance);
      ensureObserver(instance);
      if (persist) persistPage(instance);
    });
  renderQueues.set(instance.id, next);
  return next;
};

const restoreInitialPage = (instance: PaginationInstanceState): void => {
  let page = instance.options.startPage;
  if (instance.options.persistKey) {
    const fromStorage = readPageFromStorage(instance.options.persistKey);
    if (fromStorage !== null) page = fromStorage;
  }
  if (instance.options.urlKey) {
    const fromUrl = readPageFromUrl(instance.options.urlKey);
    if (fromUrl !== null) page = fromUrl;
  }
  instance.currentPage = page;
};

const initInstance = (list: HTMLElement): void => {
  const instanceId = getInstanceId(list);
  const options = resolveOptions(list, instanceId);
  const sourceItems = collectItems(list);
  sourceItemsByInstance.set(instanceId, sourceItems);
  const state: PaginationInstanceState = {
    id: instanceId,
    elements: {
      list,
      items: sourceItems,
      controls: collectControls(list, instanceId),
      status: collectStatus(list, instanceId),
      sentinel: collectSentinel(list),
    },
    options,
    currentPage: 1,
    totalPages: 1,
    observer: undefined,
    animationToken: 0,
    activeAnimations: [],
  };
  restoreInitialPage(state);
  instances.set(instanceId, state);
  void enqueueRender(state, true);
};

const refreshInstance = (instance: PaginationInstanceState, resetPage = false): Promise<void> => {
  if (resetPage) instance.currentPage = 1;
  const previousSource = sourceItemsByInstance.get(instance.id) ?? instance.elements.items;
  const discovered = collectItems(instance.elements.list);
  const knownItems = new Set(previousSource);
  const mergedSource = [...previousSource];
  discovered.forEach((item) => {
    if (!knownItems.has(item)) {
      mergedSource.push(item);
      knownItems.add(item);
    }
  });
  sourceItemsByInstance.set(instance.id, mergedSource);
  instance.elements.items = mergedSource.filter(isRuntimeEligibleItem);
  instance.elements.sentinel = collectSentinel(instance.elements.list);
  return enqueueRender(instance, !resetPage);
};

const goToPageInternal = (instanceId: string, targetPage: number): Promise<void> => {
  const instance = instances.get(instanceId);
  if (!instance) return Promise.resolve();
  instance.currentPage = targetPage;
  return enqueueRender(instance, true);
};

const nextInternal = (instanceId: string): Promise<void> => {
  const instance = instances.get(instanceId);
  if (!instance) return Promise.resolve();
  if (instance.currentPage >= instance.totalPages) return Promise.resolve();
  return goToPageInternal(instanceId, instance.currentPage + 1);
};

const prevInternal = (instanceId: string): Promise<void> => {
  const instance = instances.get(instanceId);
  if (!instance) return Promise.resolve();
  if (instance.currentPage <= 1) return Promise.resolve();
  return goToPageInternal(instanceId, instance.currentPage - 1);
};

let controlsAttached = false;
const attachControlHandlers = (): void => {
  if (controlsAttached) return;
  controlsAttached = true;

  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const control = target.closest<HTMLElement>("[data-pagination-control]");
    if (!control) return;
    const type = control.dataset.paginationControl;
    if (!type) return;
    event.preventDefault();

    const instanceId = getInstanceId(control);
    if (type === "prev") void prevInternal(instanceId);
    else if (type === "next" || type === "load-more") void nextInternal(instanceId);
    else if (type === "first") void goToPageInternal(instanceId, 1);
    else if (type === "last") {
      const instance = instances.get(instanceId);
      if (instance) void goToPageInternal(instanceId, instance.totalPages);
    }
  });

  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const pageButton = target.closest<HTMLElement>("[data-pagination-page]");
    if (!pageButton) return;
    const attr = pageButton.dataset.paginationPage;
    if (!attr || attr === "*") return;
    const page = Number.parseInt(attr, 10);
    if (!Number.isFinite(page) || page <= 0) return;
    event.preventDefault();
    void goToPageInternal(getInstanceId(pageButton), page);
  });
};

const attachFilterHandlers = (): void => {
  const filterLists = document.querySelectorAll<HTMLElement>("[data-filter-list]");
  filterLists.forEach((filterList) => {
    filterList.addEventListener("filter:change", () => {
      const filterInstanceId = getInstanceId(filterList);
      instances.forEach((instance) => {
        if (instance.id !== filterInstanceId) return;
        const list = instance.elements.list;
        const relevant = filterList === list || filterList.contains(list) || list.contains(filterList);
        if (relevant) void refreshInstance(instance, true);
      });
    });
  });
};

let isInitialized = false;
function initializePaginationModule(): void {
  if (isInitialized) {
    instances.forEach((instance) => {
      void refreshInstance(instance, false);
    });
    return;
  }

  document.querySelectorAll<HTMLElement>("[data-pagination-list]").forEach((list) => {
    initInstance(list);
  });
  attachControlHandlers();
  attachFilterHandlers();
  isInitialized = true;
}

export function initPagination(): void {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializePaginationModule);
  } else {
    initializePaginationModule();
  }
}

export const paginationAPI = {
  goToPage(instanceId: string | null, page: number): void {
    void goToPageInternal(instanceId || DEFAULT_INSTANCE_ID, page);
  },
  next(instanceId: string | null = null): void {
    void nextInternal(instanceId || DEFAULT_INSTANCE_ID);
  },
  prev(instanceId: string | null = null): void {
    void prevInternal(instanceId || DEFAULT_INSTANCE_ID);
  },
  refresh(instanceId: string | null = null): void {
    if (instanceId) {
      const instance = instances.get(instanceId);
      if (instance) void refreshInstance(instance, false);
      return;
    }
    instances.forEach((instance) => {
      void refreshInstance(instance, false);
    });
  },
  getState(instanceId: string | null = null): PaginationInstanceState | undefined {
    return instances.get(instanceId || DEFAULT_INSTANCE_ID);
  },
};

declare global {
  interface Window {
    paginationAPI?: typeof paginationAPI;
  }
}

if (typeof window !== "undefined" && !window.paginationAPI) {
  window.paginationAPI = paginationAPI;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializePaginationModule);
} else {
  initializePaginationModule();
}
