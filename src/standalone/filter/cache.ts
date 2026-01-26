/**
 * Filter Module - Cache Management
 * Functions for managing filter instance cache
 */

import type { FilterCache } from './types';

const filterCache: Map<string, FilterCache> = new Map();

export function getCacheKey(instance: string | null): string {
  return instance || 'default';
}

export function updateCache(instance: string | null, listElement: HTMLElement): FilterCache {
  const key = getCacheKey(instance);
  const baseSelector = '[data-filter-count], [data-filter-results]';
  const countSelector = instance
    ? `[data-filter-instance="${instance}"] ${baseSelector}, ${baseSelector}[data-filter-instance="${instance}"]`
    : `${baseSelector}:not([data-filter-instance])`;

  const emptySelector = instance
    ? `[data-filter-instance="${instance}"] [data-filter-empty], [data-filter-empty][data-filter-instance="${instance}"]`
    : '[data-filter-empty]:not([data-filter-instance])';

  const loadingSelector = instance
    ? `[data-filter-instance="${instance}"] [data-filter-loading], [data-filter-loading][data-filter-instance="${instance}"]`
    : '[data-filter-loading]:not([data-filter-instance])';

  // Find all list items
  let items: HTMLElement[] = [];
  const explicitItems = listElement.querySelectorAll('[data-filter-item]');
  if (explicitItems.length > 0) {
    items = Array.from(explicitItems) as HTMLElement[];
  } else {
    Array.from(listElement.children).forEach((child) => {
      if (child instanceof HTMLElement) {
        items.push(child);
      }
    });
    if (items.length === 0) {
      const fieldItems = listElement.querySelectorAll('[data-filter-field]');
      items = Array.from(fieldItems) as HTMLElement[];
    }
  }

  const cache: FilterCache = {
    listElement,
    items,
    controls: Array.from(
      document.querySelectorAll(
        instance
          ? `[data-filter-instance="${instance}"] [data-filter-field], [data-filter-field][data-filter-instance="${instance}"]`
          : '[data-filter-field]:not([data-filter-instance])'
      )
    ) as HTMLElement[],
    countElements: Array.from(document.querySelectorAll(countSelector)) as HTMLElement[],
    emptyElement: (document.querySelector(emptySelector) as HTMLElement) || null,
    loadingElement: (document.querySelector(loadingSelector) as HTMLElement) || null,
    lastUpdate: Date.now(),
  };

  filterCache.set(key, cache);
  return cache;
}

export function getCache(instance: string | null, listElement: HTMLElement): FilterCache {
  const key = getCacheKey(instance);
  const cached = filterCache.get(key);
  if (cached && cached.listElement === listElement) {
    return cached;
  }
  return updateCache(instance, listElement);
}
