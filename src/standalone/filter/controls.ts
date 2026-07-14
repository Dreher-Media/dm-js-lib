/**
 * Filter Module - Controls
 * Functions for initializing and handling filter controls
 */

import { getInstance, getFilterValue } from './filters';
import { applyFilters } from './apply';
import { updateUrlParams } from './persistence';

/**
 * Handle filter control changes
 */
function handleFilterChange(control: HTMLElement): void {
  // Find all associated lists (there may be multiple, e.g., in tabs)
  const instance = getInstance(control);
  const baseSelector = '[data-filter-list]';
  const listSelector = instance
    ? `[data-filter-instance="${instance}"] ${baseSelector}, ${baseSelector}[data-filter-instance="${instance}"]`
    : `${baseSelector}:not([data-filter-instance])`;

  const lists = document.querySelectorAll(listSelector);

  // Apply filters to all matching lists
  lists.forEach((listElement) => {
    applyFilters(listElement as HTMLElement);
  });
}

/**
 * Initialize filter controls
 */
export function initializeControls(): void {
  // Handle checkboxes
  document.querySelectorAll('input[type="checkbox"][data-filter-field]').forEach((input) => {
    const el = input as HTMLElement;
    // Skip list items - they are descendants of [data-filter-list] elements
    if (el.closest('[data-filter-list]') !== null) {
      return;
    }
    el.addEventListener('change', () => {
      handleFilterChange(el);
    });
  });

  // Handle radios with proper group handling
  document.querySelectorAll('input[type="radio"][data-filter-field]').forEach((input) => {
    const el = input as HTMLElement;
    // Skip list items - they are descendants of [data-filter-list] elements
    if (el.closest('[data-filter-list]') !== null) {
      return;
    }
    el.addEventListener('change', () => {
      const field = el.dataset.filterField;
      const instance = getInstance(el);
      const name = (el as HTMLInputElement).name;

      // Uncheck other radios in same group
      if (name) {
        document.querySelectorAll(`input[type="radio"][name="${name}"]`).forEach((radio) => {
          if (radio !== el) {
            (radio as HTMLInputElement).checked = false;
          }
        });
      } else if (field) {
        // Group by field if no name attribute
        const selector = instance
          ? `input[type="radio"][data-filter-field="${field}"][data-filter-instance="${instance}"], input[type="radio"][data-filter-field="${field}"][data-filter-instance="${instance}"]`
          : `input[type="radio"][data-filter-field="${field}"]:not([data-filter-instance])`;
        document.querySelectorAll(selector).forEach((radio) => {
          if (radio !== el) {
            (radio as HTMLInputElement).checked = false;
          }
        });
      }

      handleFilterChange(el);
    });
  });

  // Handle selects - use event delegation to support dynamically added selects
  document.addEventListener('change', (event) => {
    const target = event.target as HTMLElement;
    // Skip list items - they are descendants of [data-filter-list] elements
    if (
      target.tagName.toLowerCase() === 'select' &&
      target.hasAttribute('data-filter-field') &&
      target.closest('[data-filter-list]') === null
    ) {
      handleFilterChange(target);
    }
  });

  // Handle text inputs (search)
  document
    .querySelectorAll(
      'input[type="text"][data-filter-field], input[type="search"][data-filter-field]',
    )
    .forEach((input) => {
      const el = input as HTMLElement;
      // Skip list items - they are descendants of [data-filter-list] elements
      if (el.closest('[data-filter-list]') !== null) {
        return;
      }
      let timeout: ReturnType<typeof setTimeout>;
      const debounceDelay = el.dataset.filterDebounce
        ? parseInt(el.dataset.filterDebounce, 10) || 300
        : 300;
      el.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          handleFilterChange(el);
        }, debounceDelay);
      });
    });

  // Handle buttons/links with data-filter-field
  document.querySelectorAll('[data-filter-field]:not(input):not(select)').forEach((control) => {
    const el = control as HTMLElement;

    // Skip list items - they are descendants of [data-filter-list] elements
    if (el.closest('[data-filter-list]') !== null) {
      return;
    }

    // Add keyboard support
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');

    const isTabLinkRadio = el.dataset.filterType === 'radio';

    const handleActivation = (event: Event): void => {
      event.preventDefault();
      const input = el.querySelector('input[type="checkbox"], input[type="radio"]');
      if (input) {
        // If it contains a checkbox/radio, toggle it
        (input as HTMLInputElement).checked = !(input as HTMLInputElement).checked;
        handleFilterChange(input as HTMLElement);
      } else if (isTabLinkRadio) {
        // Tab-link / radio style: only one active in group
        const field = el.dataset.filterField;
        const instance = getInstance(el);
        if (field) {
          const groupSelector = instance
            ? `[data-filter-field="${field}"][data-filter-type="radio"][data-filter-instance="${instance}"], [data-filter-instance="${instance}"] [data-filter-field="${field}"][data-filter-type="radio"]`
            : `[data-filter-field="${field}"][data-filter-type="radio"]:not([data-filter-instance])`;
          document.querySelectorAll(groupSelector).forEach((other) => {
            const otherEl = other as HTMLElement;
            if (otherEl.closest('[data-filter-list]') !== null) return;
            otherEl.classList.remove('active');
          });
        }
        el.classList.add('active');
        handleFilterChange(el);
      } else {
        // Otherwise, toggle active class and use data-filter-value
        el.classList.toggle('active');
        handleFilterChange(el);
      }
    };

    el.addEventListener('click', handleActivation);
    el.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        handleActivation(event);
      }
    });
  });
}

/**
 * Initialize clear button
 */
export function initializeClear(): void {
  document.querySelectorAll('[data-filter-clear]').forEach((clearButton) => {
    clearButton.addEventListener('click', (event) => {
      event.preventDefault();
      const instance = getInstance(clearButton as HTMLElement);

      // Clear all filter controls in this instance
      const baseSelector = '[data-filter-field]';
      const selector = instance
        ? `[data-filter-instance="${instance}"] ${baseSelector}, ${baseSelector}[data-filter-instance="${instance}"]`
        : `${baseSelector}:not([data-filter-instance])`;

      document.querySelectorAll(selector).forEach((control) => {
        const el = control as HTMLElement;
        // Skip list items - they are descendants of [data-filter-list] elements
        if (el.closest('[data-filter-list]') !== null) {
          return;
        }
        const tagName = el.tagName.toLowerCase();

        if (tagName === 'input') {
          const input = el as HTMLInputElement;
          if (input.type === 'checkbox' || input.type === 'radio') {
            input.checked = false;
          } else {
            input.value = '';
          }
        } else if (tagName === 'select') {
          (el as HTMLSelectElement).selectedIndex = 0;
        } else {
          el.classList.remove('active');
        }
      });

      // Apply filters (will show all items)
      const baseListSelector = '[data-filter-list]';
      const listSelector = instance
        ? `[data-filter-instance="${instance}"] ${baseListSelector}, ${baseListSelector}[data-filter-instance="${instance}"]`
        : `${baseListSelector}:not([data-filter-instance])`;

      const listElement = document.querySelector(listSelector) as HTMLElement;
      if (listElement) {
        // Clear URL params if enabled
        if (listElement.dataset.filterUrl === 'true') {
          const params = new URLSearchParams(window.location.search);
          const prefix = instance ? `filter_${instance}_` : 'filter_';
          const keysToDelete: string[] = [];
          params.forEach((_value, key) => {
            if (key.startsWith(prefix)) keysToDelete.push(key);
          });
          keysToDelete.forEach((key) => params.delete(key));
          const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`;
          // replaceState (not pushState): keep filter clears out of history so
          // the back button returns to the previous page, not a prior filter state.
          window.history.replaceState({}, '', newUrl);
        }

        // Clear localStorage if enabled
        const persistKey = listElement.dataset.filterPersist;
        if (persistKey) {
          try {
            const storageKey = `filter_${persistKey}_${instance || 'default'}`;
            localStorage.removeItem(storageKey);
          } catch (e) {
            // localStorage may be disabled
          }
        }

        applyFilters(listElement);

        // Dispatch clear event
        const clearEvent = new CustomEvent('filter:clear', {
          detail: { instance },
        });
        listElement.dispatchEvent(clearEvent);
      }
    });
  });
}
