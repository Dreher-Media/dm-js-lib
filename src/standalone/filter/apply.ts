/**
 * Filter Module - Apply Filters
 * Main function for applying filters to a list
 */

import { getInstance } from './filters';
import { getAllFilters, matchesFilters, updateCounts } from './filters';
import { getCache } from './cache';
import { updateUrlParams, saveToLocalStorage } from './persistence';
import type { FilterCache } from './types';

/**
 * Apply filters to a list
 */
export function applyFilters(listElement: HTMLElement): void {
  const instance = getInstance(listElement);
  const { filters, multifieldSearches } = getAllFilters(instance);
  const cache = getCache(instance, listElement);
  const items = cache.items;
  
  // Show loading state
  if (cache.loadingElement) {
    cache.loadingElement.style.display = '';
    cache.loadingElement.classList.add('filter-loading-active');
  }

  // Use requestAnimationFrame for smooth updates
  requestAnimationFrame(() => {
    let visibleCount = 0;

    items.forEach((item) => {
      const matches = matchesFilters(item, filters, multifieldSearches, instance);

      if (matches) {
        item.style.display = '';
        item.classList.add('filter-active');
        item.classList.remove('filter-hidden');
        visibleCount++;
      } else {
        item.style.display = 'none';
        item.classList.add('filter-hidden');
        item.classList.remove('filter-active');
      }
    });

    // Update counts
    updateCounts(listElement, items.length, visibleCount, instance, cache);

    // Handle empty state
    if (cache.emptyElement) {
      if (visibleCount === 0) {
        cache.emptyElement.style.display = '';
        cache.emptyElement.classList.add('filter-empty-active');
        const emptyText = cache.emptyElement.dataset.filterEmptyText;
        if (emptyText) {
          const textElement = cache.emptyElement.querySelector('[data-filter-empty-text-content]') || cache.emptyElement;
          textElement.textContent = emptyText;
        }
      } else {
        cache.emptyElement.style.display = 'none';
        cache.emptyElement.classList.remove('filter-empty-active');
      }
    }

    // Hide loading state
    if (cache.loadingElement) {
      cache.loadingElement.style.display = 'none';
      cache.loadingElement.classList.remove('filter-loading-active');
    }

    // Dispatch custom events
    const changeEvent = new CustomEvent('filter:change', {
      detail: { instance, filters, visibleCount, total: items.length },
    });
    listElement.dispatchEvent(changeEvent);

    if (visibleCount === 0) {
      const emptyEvent = new CustomEvent('filter:empty', {
        detail: { instance, filters },
      });
      listElement.dispatchEvent(emptyEvent);
    }

    // Update aria-live region for screen readers
    const liveRegion = document.querySelector(`#filter-live-${instance || 'default'}`) as HTMLElement;
    if (liveRegion) {
      liveRegion.textContent = visibleCount === 0
        ? 'No results found'
        : `Showing ${visibleCount} of ${items.length} items`;
    }

    // Handle scroll management
    const scrollMode = listElement.dataset.filterScroll;
    if (scrollMode) {
      requestAnimationFrame(() => {
        if (scrollMode === 'top') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (scrollMode === 'anchor') {
          const anchorSelector = listElement.dataset.filterScrollAnchor;
          const anchor = anchorSelector
            ? document.querySelector(anchorSelector)
            : listElement;
          anchor?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          // Custom selector
          const target = document.querySelector(scrollMode);
          target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    // Update URL if enabled
    const urlEnabled = listElement.dataset.filterUrl === 'true';
    if (urlEnabled) {
      updateUrlParams(instance, filters);
    }

    // Save to localStorage if enabled
    const persistKey = listElement.dataset.filterPersist;
    if (persistKey) {
      saveToLocalStorage(persistKey, instance, filters);
    }
  });
}
