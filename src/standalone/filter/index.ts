/**
 * Filter Module
 * Provides attribute-based filtering functionality for lists
 *
 * Inspired by Finsweet's List Filter approach, simplified and flexible
 *
 * Basic Usage:
 * - Add data-filter-list to the container holding filterable items
 * - Add data-filter-controls to the container holding filter controls
 * - Add data-filter-field="identifier" to filter controls (checkboxes, radios, selects, inputs)
 * - Add data-filter-field="identifier" to list items to match against filters
 *
 * Optional Features:
 * - data-filter-instance="name" to support multiple filtered lists on one page
 * - data-filter-search="field1,field2" to search across one or multiple fields (comma-separated)
 * - data-filter-value on list items to provide filterable values via attribute (works with all filter types)
 * - data-filter-clear to add a clear/reset button
 * - data-filter-count to show total items count
 * - data-filter-results to show filtered results count
 * - data-filter-empty to show element when no results found
 * - data-filter-empty-text for custom empty message
 * - data-filter-scroll to scroll to top/anchor when filtering
 * - data-filter-scroll-anchor for specific anchor element
 * - data-filter-url to save filter state to URL parameters
 * - data-filter-loading to show loading indicator during filter
 * - data-filter-persist to save filter state to localStorage
 * - data-filter-debounce to configure debounce delay for search inputs
 * - data-filter-autofill="true" to enable automatic option population for select elements (disabled by default)
 * - data-filter-autofill-all to include/exclude "All" option in autofilled selects
 * - data-filter-all-value and data-filter-all-text to customize the "All" option
 * - data-filter-autofill-refresh to force refresh of autofilled options
 */

import { getInstance } from "./filters";
import { getCache, updateCache } from "./cache";
import { applyFilters } from "./apply";
import { restoreFromLocalStorage, restoreFromUrl } from "./persistence";
import { initializeControls, initializeClear } from "./controls";
import { filterAPI } from "./api";
import { initializeAutofill, refreshAutofill } from "./autofill";

let isInitialized = false;
let controlsInitialized = false;
let clearInitialized = false;
let observerInitialized = false;

/**
 * Internal initialization function
 */
function initializeFilterModule(): void {
  // Initialize all filter lists
  const initializeLists = (): void => {
    document.querySelectorAll("[data-filter-list]").forEach((listElement) => {
      const el = listElement as HTMLElement;
      const instance = getInstance(el);

      // Restore from localStorage if enabled
      const persistKey = el.dataset.filterPersist;
      if (persistKey) {
        restoreFromLocalStorage(persistKey, instance);
      }

      // Restore from URL if enabled
      if (el.dataset.filterUrl === "true") {
        restoreFromUrl(instance);
      }

      // Add ARIA attributes for accessibility
      el.setAttribute("role", "region");
      el.setAttribute("aria-label", "Filtered list");
      if (!el.id) {
        el.id = `filter-list-${instance || "default"}-${Date.now()}`;
      }

      // Add aria-live region for announcements
      let liveRegion = document.querySelector(
        `#filter-live-${instance || "default"}`
      ) as HTMLElement;
      if (!liveRegion) {
        liveRegion = document.createElement("div");
        liveRegion.id = `filter-live-${instance || "default"}`;
        liveRegion.setAttribute("aria-live", "polite");
        liveRegion.setAttribute("aria-atomic", "true");
        liveRegion.className = "sr-only";
        liveRegion.style.cssText =
          "position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden;";
        document.body.appendChild(liveRegion);
      }

      // Update cache
      updateCache(instance, el);

      // Initialize autofill for select elements
      refreshAutofill(instance);

      applyFilters(el);
    });
  };

  // Expose API globally (only once)
  if (!isInitialized) {
    (window as any).filterAPI = filterAPI;
  }

  // Initialize controls (only once)
  if (!controlsInitialized) {
    initializeControls();
    controlsInitialized = true;
  }

  // Initialize autofill (only once, but will refresh per instance)
  initializeAutofill();

  // Initialize clear button (only once)
  if (!clearInitialized) {
    initializeClear();
    clearInitialized = true;
  }

  // Initialize lists
  initializeLists();

  // Set up MutationObserver for dynamic content (only once)
  if (!observerInitialized) {
    const observer = new MutationObserver(() => {
      document.querySelectorAll("[data-filter-list]").forEach((listElement) => {
        const el = listElement as HTMLElement;
        const instance = getInstance(el);
        updateCache(instance, el);
        // Refresh autofill when items are added/removed
        refreshAutofill(instance);
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    observerInitialized = true;
  }

  isInitialized = true;
}

/**
 * Initialize the filter module
 * Can be called manually, or will auto-initialize on DOMContentLoaded
 */
export function initFilter(): void {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeFilterModule);
  } else {
    // DOM is already ready
    initializeFilterModule();
  }
}

// Auto-initialize on DOMContentLoaded by default
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeFilterModule);
} else {
  // DOM is already ready, initialize immediately
  initializeFilterModule();
}
