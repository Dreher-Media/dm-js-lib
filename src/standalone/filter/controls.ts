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
  // Find the associated list
  const instance = getInstance(control);
  const baseSelector = '[data-filter-list]';
  const listSelector = instance
    ? `[data-filter-instance="${instance}"] ${baseSelector}, ${baseSelector}[data-filter-instance="${instance}"]`
    : `${baseSelector}:not([data-filter-instance])`;
  
  const listElement = document.querySelector(listSelector) as HTMLElement;
  if (listElement) {
    applyFilters(listElement);
  }
}

/**
 * Initialize filter controls
 */
export function initializeControls(): void {
  // Handle checkboxes
  document.querySelectorAll('input[type="checkbox"][data-filter-field]').forEach((input) => {
    input.addEventListener('change', () => {
      handleFilterChange(input as HTMLElement);
    });
  });

  // Handle radios with proper group handling
  document.querySelectorAll('input[type="radio"][data-filter-field]').forEach((input) => {
    input.addEventListener('change', () => {
      const field = (input as HTMLElement).dataset.filterField;
      const instance = getInstance(input as HTMLElement);
      const name = (input as HTMLInputElement).name;

      // Uncheck other radios in same group
      if (name) {
        document.querySelectorAll(`input[type="radio"][name="${name}"]`).forEach((radio) => {
          if (radio !== input) {
            (radio as HTMLInputElement).checked = false;
          }
        });
      } else if (field) {
        // Group by field if no name attribute
        const selector = instance
          ? `input[type="radio"][data-filter-field="${field}"][data-filter-instance="${instance}"], input[type="radio"][data-filter-field="${field}"][data-filter-instance="${instance}"]`
          : `input[type="radio"][data-filter-field="${field}"]:not([data-filter-instance])`;
        document.querySelectorAll(selector).forEach((radio) => {
          if (radio !== input) {
            (radio as HTMLInputElement).checked = false;
          }
        });
      }

      handleFilterChange(input as HTMLElement);
    });
  });

  // Handle selects
  document.querySelectorAll('select[data-filter-field]').forEach((select) => {
    select.addEventListener('change', () => {
      handleFilterChange(select as HTMLElement);
    });
  });

  // Handle text inputs (search)
  document.querySelectorAll('input[type="text"][data-filter-field], input[type="search"][data-filter-field]').forEach((input) => {
    let timeout: ReturnType<typeof setTimeout>;
    const el = input as HTMLElement;
    const debounceDelay = el.dataset.filterDebounce
      ? parseInt(el.dataset.filterDebounce, 10) || 300
      : 300;
    input.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        handleFilterChange(el);
      }, debounceDelay);
    });
  });

  // Handle buttons/links with data-filter-field
  document.querySelectorAll('[data-filter-field]:not(input):not(select)').forEach((control) => {
    const el = control as HTMLElement;
    
    // Add keyboard support
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    
    const handleActivation = (event: Event): void => {
      event.preventDefault();
      const input = el.querySelector('input[type="checkbox"], input[type="radio"]');
      if (input) {
        // If it contains a checkbox/radio, toggle it
        (input as HTMLInputElement).checked = !(input as HTMLInputElement).checked;
        handleFilterChange(input as HTMLElement);
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
          Array.from(params.keys() as IterableIterator<string>).forEach((key: string) => {
            if (key.startsWith(prefix)) {
              params.delete(key);
            }
          });
          const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`;
          window.history.pushState({}, '', newUrl);
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
