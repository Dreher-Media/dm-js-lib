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

import type { PaginationInstanceState, PaginationMode, PaginationOptions } from "./types";

type InstancesMap = Map<string, PaginationInstanceState>;

const DEFAULT_INSTANCE_ID = "default";
const PAGINATION_HIDDEN_CLASS = "pagination-hidden";
const PAGINATION_ACTIVE_CLASS = "pagination-active";
const PAGINATION_DISABLED_CLASS = "pagination-disabled";

const instances: InstancesMap = new Map();

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

const readNumberAttr = (
  source: HTMLElement | null,
  attr: keyof HTMLElement["dataset"],
  defaultValue: number
): number => {
  if (!source) return defaultValue;
  const attrKey = String(attr);
  const dataAttrName = `data-${attrKey.replace(/[A-Z]/g, (m: string) => `-${m.toLowerCase()}`)}`;

  const dataset = source.dataset as unknown as Record<string, string | undefined>;
  const ancestor = source.closest<HTMLElement>(`[${dataAttrName}]`);
  const ancestorDataset = ancestor?.dataset as unknown as Record<string, string | undefined>;

  const value = dataset[attrKey] ?? ancestorDataset?.[attrKey];

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

const resolveOptions = (list: HTMLElement, instanceId: string): PaginationOptions => {
  const mode = readMode(list);
  const pageSize = readNumberAttr(list, "paginationPageSize", 12);
  const firstPageSizeRaw = (list.dataset.paginationFirstPageSize ??
    list.closest<HTMLElement>("[data-pagination-first-page-size]")?.dataset
      .paginationFirstPageSize) as string | undefined;
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
    list.dataset.paginationHideLoadMoreWhenComplete === "true" ||
    list.closest<HTMLElement>('[data-pagination-hide-load-more-when-complete="true"]') !== null;

  const infiniteOffsetRaw = list.dataset.paginationInfiniteOffset;
  const infiniteOffset =
    infiniteOffsetRaw !== undefined ? Number.parseFloat(infiniteOffsetRaw) : 0.5;

  return {
    mode,
    pageSize,
    firstPageSize,
    startPage,
    urlKey,
    persistKey,
    infiniteOffset: Number.isNaN(infiniteOffset) ? 0.5 : infiniteOffset,
    hideLoadMoreWhenComplete,
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
    setDisabled(elements.controls.prev, currentPage <= 1);
    setDisabled(elements.controls.first, currentPage <= 1);
    setDisabled(elements.controls.next, currentPage >= totalPages);
    setDisabled(elements.controls.last, currentPage >= totalPages);
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

const applyVisibility = (instance: PaginationInstanceState): void => {
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

  items.forEach((item, index) => {
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

    if (isVisible) {
      item.classList.remove(PAGINATION_HIDDEN_CLASS);
    } else {
      item.classList.add(PAGINATION_HIDDEN_CLASS);
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

  createObserver(state);
  applyVisibility(state);
  persistPage(state);
};

const reinitializeInstance = (instance: PaginationInstanceState): void => {
  const list = instance.elements.list;
  destroyObserver(instance);

  const items = collectItems(list);
  instance.elements.items = items;

  applyVisibility(instance);
  createObserver(instance);
};

const goToPageInternal = (instanceId: string, page: number): void => {
  const instance = instances.get(instanceId);
  if (!instance) return;

  instance.currentPage = page;
  applyVisibility(instance);
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
