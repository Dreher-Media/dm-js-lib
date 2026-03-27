/**
 * Pagination Module
 * Client-side pagination for generic DOM lists.
 *
 * Supports:
 * - Numbered pagination (prev/next/first/last, numbered buttons)
 * - Load more (progressively reveals more items)
 * - Infinite scroll (auto-loads more items as sentinel enters viewport)
 *
 * Configuration is done via data attributes on the list, controls, and status elements.
 */

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
const PAGINATION_HIDDEN_CLASS = "pagination-hidden";
const PAGINATION_ACTIVE_CLASS = "pagination-active";
const PAGINATION_DISABLED_CLASS = "pagination-disabled";
const PAGINATION_LIST_ANIMATION_CLASSES = [
  "pagination-list-enter",
  "pagination-list-enter-active",
  "pagination-list-exit",
  "pagination-list-exit-active",
] as const;
const PAGINATION_ITEM_ANIMATION_CLASSES = [
  "pagination-item-enter",
  "pagination-item-enter-active",
  "pagination-item-exit",
  "pagination-item-exit-active",
] as const;
const ANIMATION_TIMEOUT_BUFFER_MS = 80;
const DEFAULT_ANIMATION_DURATION = 220;
const DEFAULT_ANIMATION_STAGGER = 30;
const DEFAULT_ANIMATION_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const MAX_ANIMATED_ITEMS = 60;
const LARGE_BATCH_STAGGER_CUTOFF = 24;

const instances: InstancesMap = new Map();
const NON_RENDERED_ITEM_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "TEMPLATE",
  "NOSCRIPT",
  "LINK",
  "META",
]);

const getInstanceId = (element: HTMLElement | null): string => {
  if (!element) return DEFAULT_INSTANCE_ID;

  const attr = element.dataset.paginationInstance;
  if (attr && attr.trim() !== "") return attr.trim();

  const wrapper = element.closest<HTMLElement>("[data-pagination-instance]");
  if (wrapper?.dataset.paginationInstance) {
    return wrapper.dataset.paginationInstance.trim();
  }

  return DEFAULT_INSTANCE_ID;
};

const isEligibleItem = (el: HTMLElement): boolean => {
  if (NON_RENDERED_ITEM_TAGS.has(el.tagName)) return false;
  if (el.classList.contains("pagination-exclude")) return false;
  if (el.classList.contains("filter-hidden")) return false;
  return true;
};

const collectItems = (list: HTMLElement): HTMLElement[] => {
  const explicitItems = Array.from(list.querySelectorAll<HTMLElement>("[data-pagination-item]"));

  if (explicitItems.length > 0) {
    return explicitItems.filter(isEligibleItem);
  }

  return Array.from(list.children)
    .filter((node): node is HTMLElement => node instanceof HTMLElement)
    .filter(isEligibleItem);
};

const readMode = (source: HTMLElement | null): PaginationMode => {
  const value =
    source?.dataset.paginationMode ??
    source?.closest<HTMLElement>("[data-pagination-mode]")?.dataset.paginationMode ??
    null;

  if (value === "load-more" || value === "infinite") return value;
  return "numbers";
};

const readStringAttr = (
  source: HTMLElement | null,
  attr: keyof HTMLElement["dataset"]
): string | undefined => {
  if (!source) return undefined;
  const attrKey = String(attr);
  const dataAttrName = `data-${attrKey.replace(/[A-Z]/g, (m: string) => `-${m.toLowerCase()}`)}`;

  const dataset = source.dataset as unknown as Record<string, string | undefined>;
  const ancestor = source.closest<HTMLElement>(`[${dataAttrName}]`);
  const ancestorDataset = ancestor?.dataset as unknown as Record<string, string | undefined>;
  const value = dataset[attrKey] ?? ancestorDataset?.[attrKey];

  if (!value || value.trim() === "") return undefined;
  return value.trim();
};

const readNumberAttr = (
  source: HTMLElement | null,
  attr: keyof HTMLElement["dataset"],
  defaultValue: number
): number => {
  const value = readStringAttr(source, attr);
  if (!value) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? defaultValue : parsed;
};

const computeTotalPages = (
  totalItems: number,
  pageSize: number,
  firstPageSize?: number
): number => {
  const first = firstPageSize ?? pageSize;
  if (totalItems <= 0) return 1;
  if (first >= totalItems) return 1;
  const remaining = totalItems - first;
  return 1 + Math.ceil(remaining / pageSize);
};

const getVisibleCount = (
  mode: PaginationMode,
  totalItems: number,
  currentPage: number,
  pageSize: number,
  firstPageSize?: number
): number => {
  const first = firstPageSize ?? pageSize;

  if (mode === "numbers") {
    if (currentPage <= 1) return Math.min(first, totalItems);
    const startIndex = first + (currentPage - 2) * pageSize;
    const remaining = Math.max(totalItems - startIndex, 0);
    return Math.min(pageSize, remaining);
  }

  if (currentPage <= 1) return Math.min(first, totalItems);
  return Math.min(first + (currentPage - 1) * pageSize, totalItems);
};

const readAnimationEngine = (list: HTMLElement): PaginationAnimationEngine => {
  const value = readStringAttr(list, "paginationAnimationEngine");
  return value === "css" ? "css" : "js";
};

const readAnimationStyle = (list: HTMLElement): PaginationAnimationStyle => {
  const value = readStringAttr(list, "paginationAnimationStyle");
  if (value === "slide-up" || value === "slide-left" || value === "scale" || value === "none") {
    return value;
  }
  return "fade";
};

const readAnimationScope = (list: HTMLElement): PaginationAnimationScope => {
  const value = readStringAttr(list, "paginationAnimationScope");
  if (value === "list" || value === "both") return value;
  return "items";
};

const shouldReduceMotion = (): boolean => {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

const applyAnimationVars = (instance: PaginationInstanceState): void => {
  const list = instance.elements.list;
  list.style.setProperty("--pagination-anim-duration", `${instance.options.animationDuration}ms`);
  list.style.setProperty("--pagination-anim-stagger", `${instance.options.animationStagger}ms`);
  list.style.setProperty("--pagination-anim-easing", instance.options.animationEasing);
};

const resolveOptions = (list: HTMLElement, instanceId: string): PaginationOptions => {
  const mode = readMode(list);
  const pageSize = readNumberAttr(list, "paginationPageSize", 12);
  const firstPageSizeRaw = readStringAttr(list, "paginationFirstPageSize");
  const firstPageSizeParsed =
    firstPageSizeRaw !== undefined ? Number.parseInt(firstPageSizeRaw, 10) : undefined;
  const firstPageSize =
    firstPageSizeParsed && !Number.isNaN(firstPageSizeParsed) && firstPageSizeParsed > 0
      ? firstPageSizeParsed
      : undefined;
  const startPage = readNumberAttr(list, "paginationStartPage", 1);

  const urlKey = list.dataset.paginationUrl === "true" ? instanceId : undefined;

  const persistKey = list.dataset.paginationPersist || undefined;
  const hideLoadMoreWhenComplete =
    list.dataset.paginationHideLoadMoreWhenComplete !== "false" &&
    list.closest<HTMLElement>('[data-pagination-hide-load-more-when-complete="false"]') === null;

  const infiniteOffsetRaw = list.dataset.paginationInfiniteOffset;
  const infiniteOffset =
    infiniteOffsetRaw !== undefined ? Number.parseFloat(infiniteOffsetRaw) : 0.5;
  const animate =
    list.dataset.paginationAnimate !== "false" &&
    list.closest<HTMLElement>('[data-pagination-animate="false"]') === null;
  const animationEngine = readAnimationEngine(list);
  const animationStyle = readAnimationStyle(list);
  const animationScope = readAnimationScope(list);
  const animationDuration = readNumberAttr(
    list,
    "paginationAnimationDuration",
    DEFAULT_ANIMATION_DURATION
  );
  const animationStagger = readNumberAttr(
    list,
    "paginationAnimationStagger",
    DEFAULT_ANIMATION_STAGGER
  );
  const animationEasing =
    readStringAttr(list, "paginationAnimationEasing") ?? DEFAULT_ANIMATION_EASING;

  return {
    mode,
    pageSize,
    firstPageSize,
    startPage,
    urlKey,
    persistKey,
    infiniteOffset: Number.isNaN(infiniteOffset) ? 0.5 : infiniteOffset,
    hideLoadMoreWhenComplete,
    animate,
    animationEngine,
    animationStyle,
    animationScope,
    animationDuration,
    animationStagger,
    animationEasing,
  };
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

const collectStatusElements = (
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

const updateStatusElements = (instance: PaginationInstanceState): void => {
  const { elements, currentPage, totalPages } = instance;
  const totalItems = elements.items.length;

  const visibleCount = getVisibleCount(
    instance.options.mode,
    totalItems,
    currentPage,
    instance.options.pageSize,
    instance.options.firstPageSize
  );

  elements.status.currentPage.forEach((el) => {
    el.textContent = String(currentPage);
  });

  elements.status.totalPages.forEach((el) => {
    el.textContent = String(totalPages);
  });

  elements.status.totalItems.forEach((el) => {
    el.textContent = String(totalItems);
  });

  elements.status.visibleItems.forEach((el) => {
    el.textContent = String(visibleCount);
  });
};

const updateControlStates = (instance: PaginationInstanceState): void => {
  const { elements, currentPage, totalPages, options } = instance;

  const setDisabled = (els: HTMLElement[], disabled: boolean): void => {
    els.forEach((el) => {
      if (disabled) {
        el.classList.add(PAGINATION_DISABLED_CLASS);
        el.classList.add("is-disabled");
        el.setAttribute("aria-disabled", "true");
      } else {
        el.classList.remove(PAGINATION_DISABLED_CLASS);
        el.classList.remove("is-disabled");
        el.removeAttribute("aria-disabled");
      }
    });
  };

  if (options.mode === "numbers") {
    const isAtStart = currentPage <= 1;
    const isAtEnd = currentPage >= totalPages;

    setDisabled(elements.controls.prev, currentPage <= 1);
    setDisabled(elements.controls.first, currentPage <= 1);
    setDisabled(elements.controls.next, currentPage >= totalPages);
    setDisabled(elements.controls.last, currentPage >= totalPages);

    // Keep first/last visible, but hide prev/next at boundaries
    // without collapsing their layout space.
    elements.controls.prev.forEach((btn) => {
      btn.style.visibility = isAtStart ? "hidden" : "";
      btn.style.pointerEvents = isAtStart ? "none" : "";
    });
    elements.controls.next.forEach((btn) => {
      btn.style.visibility = isAtEnd ? "hidden" : "";
      btn.style.pointerEvents = isAtEnd ? "none" : "";
    });
  } else {
    const isComplete = currentPage >= totalPages;
    setDisabled(elements.controls.loadMore, isComplete);
    elements.controls.loadMore.forEach((btn) => {
      if (isComplete) {
        btn.setAttribute("data-pagination-complete", "true");
      } else {
        btn.removeAttribute("data-pagination-complete");
      }

      if (options.hideLoadMoreWhenComplete) {
        btn.style.display = isComplete ? "none" : "";
      }
    });
  }

  const scope = elements.list.closest<HTMLElement>("[data-pagination-instance]") ?? elements.list;
  const pageButtons = scope.querySelectorAll<HTMLElement>("[data-pagination-page]");

  pageButtons.forEach((btn) => {
    const pageAttr = btn.dataset.paginationPage;
    if (!pageAttr || pageAttr === "*") return;

    const pageNumber = Number.parseInt(pageAttr, 10);
    if (Number.isNaN(pageNumber)) return;

    const isActive = pageNumber === currentPage;
    if (isActive) {
      btn.classList.add(PAGINATION_ACTIVE_CLASS);
      btn.classList.add("is-active");
      btn.setAttribute("aria-current", "page");
    } else {
      btn.classList.remove(PAGINATION_ACTIVE_CLASS);
      btn.classList.remove("is-active");
      btn.removeAttribute("aria-current");
    }
  });
};

const waitForAnimationGroup = async (animations: Animation[], timeoutMs: number): Promise<void> => {
  if (animations.length === 0) return;

  await Promise.race([
    Promise.all(
      animations.map((animation) =>
        animation.finished.catch(() => {
          // Ignore interrupted animations.
        })
      )
    ).then(() => undefined),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, timeoutMs);
    }),
  ]);
};

const cancelInFlightAnimations = (instance: PaginationInstanceState): void => {
  if (!instance.activeAnimations || instance.activeAnimations.length === 0) return;
  instance.activeAnimations.forEach((animation) => {
    try {
      animation.cancel();
    } catch {
      // no-op
    }
  });
  instance.activeAnimations = [];
};

const getAnimationKeyframes = (
  style: PaginationAnimationStyle,
  phase: "enter" | "exit"
): Keyframe[] => {
  if (style === "none") {
    return phase === "enter" ? [{ opacity: 1 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 1 }];
  }

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

  // fade
  return phase === "enter" ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }];
};

const animateElements = (
  elements: HTMLElement[],
  keyframes: Keyframe[],
  duration: number,
  easing: string,
  stagger = 0
): Animation[] => {
  if (duration <= 0) return [];

  const animations: Animation[] = [];
  elements
    .filter((element) => element.isConnected)
    .forEach((element, index) => {
      element.style.willChange = "opacity, transform";

      const animation = element.animate(keyframes, {
        duration,
        easing,
        delay: stagger > 0 ? index * stagger : 0,
        fill: "both",
      });
      animation.finished.finally(() => {
        element.style.willChange = "";
      });
      animations.push(animation);
    });
  return animations;
};

const clearTransientAnimationStyles = (element: HTMLElement): void => {
  element.style.willChange = "";
  element.style.opacity = "";
  element.style.transform = "";
};

const cleanupAnimationArtifacts = (
  list: HTMLElement,
  items: HTMLElement[]
): void => {
  PAGINATION_LIST_ANIMATION_CLASSES.forEach((className) => {
    list.classList.remove(className);
  });
  clearTransientAnimationStyles(list);

  items.forEach((item) => {
    PAGINATION_ITEM_ANIMATION_CLASSES.forEach((className) => {
      item.classList.remove(className);
    });
    clearTransientAnimationStyles(item);
  });
};

const setHiddenState = (element: HTMLElement, hidden: boolean): void => {
  if (hidden) {
    element.classList.add(PAGINATION_HIDDEN_CLASS);
    element.style.display = "none";
    element.style.visibility = "";
    clearTransientAnimationStyles(element);
  } else {
    element.classList.remove(PAGINATION_HIDDEN_CLASS);
    element.style.display = "";
    // Explicitly normalize visibility so external CSS cannot leave
    // paginated items visually hidden after transitions.
    element.style.opacity = "1";
    element.style.visibility = "visible";
  }
};

const applyCssAnimationLifecycle = async (
  instance: PaginationInstanceState,
  listExit: boolean,
  listEnter: boolean,
  enteringItems: HTMLElement[],
  exitingItems: HTMLElement[],
  applyVisibilityState: () => void
): Promise<void> => {
  const { list } = instance.elements;
  const affectedItems = Array.from(
    new Set([...enteringItems, ...exitingItems])
  );
  const duration = instance.options.animationDuration;
  const stagger =
    Math.max(enteringItems.length, exitingItems.length) > LARGE_BATCH_STAGGER_CUTOFF
      ? 0
      : instance.options.animationStagger;
  const timeout = duration + Math.max(enteringItems.length, exitingItems.length) * stagger + ANIMATION_TIMEOUT_BUFFER_MS;

  try {
    if (listExit) {
      list.classList.add("pagination-list-exit");
      list.classList.add("pagination-list-exit-active");
    }
    exitingItems.forEach((item) => {
      item.classList.add("pagination-item-exit");
      item.classList.add("pagination-item-exit-active");
    });

    await new Promise<void>((resolve) => window.setTimeout(resolve, timeout));

    if (listExit) {
      list.classList.remove("pagination-list-exit");
      list.classList.remove("pagination-list-exit-active");
    }
    exitingItems.forEach((item) => {
      item.classList.remove("pagination-item-exit");
      item.classList.remove("pagination-item-exit-active");
    });

    applyVisibilityState();

    if (listEnter) {
      list.classList.add("pagination-list-enter");
      list.classList.add("pagination-list-enter-active");
    }
    enteringItems.forEach((item) => {
      item.classList.add("pagination-item-enter");
      item.classList.add("pagination-item-enter-active");
    });

    await new Promise<void>((resolve) => window.setTimeout(resolve, timeout));
  } finally {
    cleanupAnimationArtifacts(list, affectedItems);
  }
};

const applyJsAnimationPreset = async (
  instance: PaginationInstanceState,
  listExit: boolean,
  listEnter: boolean,
  enteringItems: HTMLElement[],
  exitingItems: HTMLElement[],
  applyVisibilityState: () => void
): Promise<void> => {
  const { animationStyle, animationDuration, animationEasing } = instance.options;
  const affectedItems = Array.from(
    new Set([...enteringItems, ...exitingItems])
  );
  const animationStagger =
    Math.max(enteringItems.length, exitingItems.length) > LARGE_BATCH_STAGGER_CUTOFF
      ? 0
      : instance.options.animationStagger;
  const timeout =
    animationDuration +
    Math.max(enteringItems.length, exitingItems.length) * animationStagger +
    ANIMATION_TIMEOUT_BUFFER_MS;

  try {
    const exitAnimations: Animation[] = [];
    if (listExit) {
      exitAnimations.push(
        ...animateElements(
          [instance.elements.list],
          getAnimationKeyframes(animationStyle, "exit"),
          animationDuration,
          animationEasing
        )
      );
    }
    if (exitingItems.length > 0) {
      exitAnimations.push(
        ...animateElements(
          exitingItems,
          getAnimationKeyframes(animationStyle, "exit"),
          animationDuration,
          animationEasing,
          animationStagger
        )
      );
    }
    instance.activeAnimations = exitAnimations;
    await waitForAnimationGroup(exitAnimations, timeout);

    applyVisibilityState();

    const enterAnimations: Animation[] = [];
    if (listEnter) {
      enterAnimations.push(
        ...animateElements(
          [instance.elements.list],
          getAnimationKeyframes(animationStyle, "enter"),
          animationDuration,
          animationEasing
        )
      );
    }
    if (enteringItems.length > 0) {
      enterAnimations.push(
        ...animateElements(
          enteringItems,
          getAnimationKeyframes(animationStyle, "enter"),
          animationDuration,
          animationEasing,
          animationStagger
        )
      );
    }
    instance.activeAnimations = enterAnimations;
    await waitForAnimationGroup(enterAnimations, timeout);
  } finally {
    cleanupAnimationArtifacts(instance.elements.list, affectedItems);
  }
};

const applyVisibility = async (instance: PaginationInstanceState): Promise<void> => {
  const { elements, currentPage, options } = instance;
  const { items } = elements;
  const { pageSize, firstPageSize, mode } = options;

  const totalItems = items.length;
  const totalPages = computeTotalPages(totalItems, pageSize, firstPageSize);
  instance.totalPages = totalPages;

  const clamp = (value: number, min: number, max: number): number =>
    Math.min(Math.max(value, min), max);

  instance.currentPage = clamp(currentPage, 1, totalPages);

  const first = firstPageSize ?? pageSize;
  const maxIndex =
    mode === "numbers"
      ? 0
      : instance.currentPage <= 1
        ? first
        : first + (instance.currentPage - 1) * pageSize;

  const visibilityChanges = items.map((item, index) => {
    const itemIndex = index + 1;

    const isVisible =
      mode === "numbers"
        ? (() => {
            if (instance.currentPage <= 1) {
              return itemIndex <= first;
            }
            const pageStart = first + (instance.currentPage - 2) * pageSize + 1;
            const pageEnd = first + (instance.currentPage - 1) * pageSize;
            return itemIndex >= pageStart && itemIndex <= pageEnd;
          })()
        : itemIndex <= maxIndex;
    const wasVisible = !item.classList.contains(PAGINATION_HIDDEN_CLASS);
    return { item, isVisible, wasVisible };
  });

  const enteringItems = visibilityChanges
    .filter((entry) => entry.isVisible && !entry.wasVisible)
    .map((entry) => entry.item);
  const exitingItemsRaw = visibilityChanges
    .filter((entry) => !entry.isVisible && entry.wasVisible)
    .map((entry) => entry.item);
  const exitingItems = mode === "numbers" ? exitingItemsRaw : [];
  const applyVisibilityState = (): void => {
    visibilityChanges.forEach((entry) => {
      setHiddenState(entry.item, !entry.isVisible);
    });
  };

  const isAnimated =
    options.animate &&
    options.animationStyle !== "none" &&
    !shouldReduceMotion() &&
    (enteringItems.length > 0 || exitingItems.length > 0);

  const token = (instance.animationToken ?? 0) + 1;
  instance.animationToken = token;
  cancelInFlightAnimations(instance);

  if (isAnimated) {
    const listExit = options.animationScope === "list" || options.animationScope === "both";
    const listEnter = listExit;
    const itemScope = options.animationScope === "items" || options.animationScope === "both";
    let scopedEntering = itemScope ? enteringItems : [];
    let scopedExiting = itemScope ? exitingItems : [];

    // Protect performance on very large transitions:
    // keep list-level animation, but limit expensive per-item animations.
    if (scopedEntering.length + scopedExiting.length > MAX_ANIMATED_ITEMS) {
      scopedEntering = [];
      scopedExiting = [];
    }

    if (options.animationEngine === "css") {
      await applyCssAnimationLifecycle(
        instance,
        listExit,
        listEnter,
        scopedEntering,
        scopedExiting,
        applyVisibilityState
      );
    } else {
      await applyJsAnimationPreset(
        instance,
        listExit,
        listEnter,
        scopedEntering,
        scopedExiting,
        applyVisibilityState
      );
    }
  } else {
    applyVisibilityState();
  }

  if (instance.animationToken !== token) {
    return;
  }

  cancelInFlightAnimations(instance);
  cleanupAnimationArtifacts(elements.list, elements.items);

  visibilityChanges.forEach((entry) => {
    if (entry.isVisible) {
      entry.item.style.display = "";
      entry.item.style.opacity = "1";
      entry.item.style.visibility = "visible";
    } else {
      entry.item.style.display = "none";
      entry.item.style.visibility = "";
      entry.item.style.opacity = "";
    }
  });

  updateStatusElements(instance);
  updateControlStates(instance);

  const detail = {
    instanceId: instance.id,
    currentPage: instance.currentPage,
    totalPages: instance.totalPages,
    totalItems,
  };

  const changeEvent = new CustomEvent("pagination:change", {
    detail,
  });
  elements.list.dispatchEvent(changeEvent);

  if (instance.currentPage >= instance.totalPages) {
    const endEvent = new CustomEvent("pagination:end", {
      detail,
    });
    elements.list.dispatchEvent(endEvent);
  }
};

const readPageFromUrl = (key: string): number | null => {
  if (typeof window === "undefined") return null;
  try {
    const url = new URL(window.location.href);
    const value = url.searchParams.get(`page_${key}`);
    if (!value) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
  } catch {
    return null;
  }
};

const writePageToUrl = (key: string, page: number): void => {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set(`page_${key}`, String(page));
    window.history.replaceState({}, "", url.toString());
  } catch {
    // ignore
  }
};

const readPageFromStorage = (key: string): number | null => {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const value = window.localStorage.getItem(`pagination_${key}`);
    if (!value) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
  } catch {
    return null;
  }
};

const writePageToStorage = (key: string, page: number): void => {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(`pagination_${key}`, String(page));
  } catch {
    // ignore
  }
};

const restoreInitialPage = (instance: PaginationInstanceState): void => {
  let page = instance.options.startPage;

  if (instance.options.persistKey) {
    const stored = readPageFromStorage(instance.options.persistKey);
    if (stored !== null) {
      page = stored;
    }
  }

  if (instance.options.urlKey) {
    const fromUrl = readPageFromUrl(instance.options.urlKey);
    if (fromUrl !== null) {
      page = fromUrl;
    }
  }

  instance.currentPage = page;
};

const persistPage = (instance: PaginationInstanceState): void => {
  if (instance.options.persistKey) {
    writePageToStorage(instance.options.persistKey, instance.currentPage);
  }
  if (instance.options.urlKey) {
    writePageToUrl(instance.options.urlKey, instance.currentPage);
  }
};

const createObserver = (instance: PaginationInstanceState): void => {
  if (instance.options.mode !== "infinite") return;
  if (!("IntersectionObserver" in window)) return;

  const sentinel = instance.elements.sentinel;
  if (!sentinel) return;

  const threshold = instance.options.infiniteOffset ?? 0.5;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const nextPage = instance.currentPage + 1;
        if (nextPage > instance.totalPages) return;
        goToPageInternal(instance.id, nextPage);
      });
    },
    {
      root: null,
      threshold,
    }
  );

  observer.observe(sentinel);
  instance.observer = observer;
};

const destroyObserver = (instance: PaginationInstanceState): void => {
  if (instance.observer) {
    instance.observer.disconnect();
    instance.observer = undefined;
  }
};

const initInstance = (list: HTMLElement): void => {
  const instanceId = getInstanceId(list);
  const options = resolveOptions(list, instanceId);
  const items = collectItems(list);

  const elements = {
    list,
    items,
    controls: collectControls(list, instanceId),
    status: collectStatusElements(list, instanceId),
    sentinel: collectSentinel(list),
  };

  const state: PaginationInstanceState = {
    id: instanceId,
    elements,
    options,
    currentPage: 1,
    totalPages: 1,
  };

  restoreInitialPage(state);
  instances.set(instanceId, state);
  applyAnimationVars(state);

  createObserver(state);
  void applyVisibility(state);
  persistPage(state);
};

const reinitializeInstance = (instance: PaginationInstanceState): void => {
  const list = instance.elements.list;
  destroyObserver(instance);

  const items = collectItems(list);
  instance.elements.items = items;

  void applyVisibility(instance);
  createObserver(instance);
};

const goToPageInternal = (instanceId: string, page: number): void => {
  const instance = instances.get(instanceId);
  if (!instance) return;

  instance.currentPage = page;
  void applyVisibility(instance);
  persistPage(instance);
};

const nextInternal = (instanceId: string): void => {
  const instance = instances.get(instanceId);
  if (!instance) return;
  if (instance.currentPage >= instance.totalPages) return;
  goToPageInternal(instanceId, instance.currentPage + 1);
};

const prevInternal = (instanceId: string): void => {
  const instance = instances.get(instanceId);
  if (!instance) return;
  if (instance.currentPage <= 1) return;
  goToPageInternal(instanceId, instance.currentPage - 1);
};

const attachControlHandlers = (): void => {
  const scope = document;

  scope.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const control = target.closest<HTMLElement>("[data-pagination-control]");
    if (!control) return;

    const instanceId = getInstanceId(control);
    const type = control.dataset.paginationControl;

    if (!type) return;
    if (type === "load-more") {
      event.preventDefault();
      nextInternal(instanceId);
      return;
    }

    event.preventDefault();

    if (type === "prev") {
      prevInternal(instanceId);
    } else if (type === "next") {
      nextInternal(instanceId);
    } else if (type === "first") {
      goToPageInternal(instanceId, 1);
    } else if (type === "last") {
      const instance = instances.get(instanceId);
      if (!instance) return;
      goToPageInternal(instanceId, instance.totalPages);
    }
  });

  scope.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const pageButton = target.closest<HTMLElement>("[data-pagination-page]");
    if (!pageButton) return;

    const pageAttr = pageButton.dataset.paginationPage;
    if (!pageAttr || pageAttr === "*") return;

    const page = Number.parseInt(pageAttr, 10);
    if (Number.isNaN(page) || page <= 0) return;

    event.preventDefault();
    const instanceId = getInstanceId(pageButton);
    goToPageInternal(instanceId, page);
  });
};

let isInitialized = false;

function initializePaginationModule(): void {
  if (isInitialized) {
    instances.forEach((instance) => {
      reinitializeInstance(instance);
    });
    return;
  }

  const lists = document.querySelectorAll<HTMLElement>("[data-pagination-list]");
  lists.forEach((list) => {
    initInstance(list);
  });

  const filterLists = document.querySelectorAll<HTMLElement>("[data-filter-list]");
  filterLists.forEach((filterList) => {
    filterList.addEventListener("filter:change", () => {
      const filterInstanceId = getInstanceId(filterList);

      instances.forEach((instance) => {
        const sameInstance = instance.id === filterInstanceId;
        if (!sameInstance) return;

        const listElement = instance.elements.list;
        const isSameElement = listElement === filterList;
        const isWithinFilter = filterList.contains(listElement) || listElement.contains(filterList);

        if (isSameElement || isWithinFilter) {
          instance.currentPage = 1;
          reinitializeInstance(instance);
        }
      });
    });
  });

  attachControlHandlers();
  isInitialized = true;

  const observer = new MutationObserver(() => {
    instances.forEach((instance) => {
      reinitializeInstance(instance);
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
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
    const id = instanceId || DEFAULT_INSTANCE_ID;
    goToPageInternal(id, page);
  },
  next(instanceId: string | null = null): void {
    const id = instanceId || DEFAULT_INSTANCE_ID;
    nextInternal(id);
  },
  prev(instanceId: string | null = null): void {
    const id = instanceId || DEFAULT_INSTANCE_ID;
    prevInternal(id);
  },
  refresh(instanceId: string | null = null): void {
    if (instanceId) {
      const instance = instances.get(instanceId);
      if (instance) {
        reinitializeInstance(instance);
      }
      return;
    }

    instances.forEach((instance) => {
      reinitializeInstance(instance);
    });
  },
  getState(instanceId: string | null = null): PaginationInstanceState | undefined {
    const id = instanceId || DEFAULT_INSTANCE_ID;
    return instances.get(id);
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
