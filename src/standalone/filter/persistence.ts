/**
 * Filter Module - Persistence
 * Functions for URL and localStorage persistence
 */

/**
 * Update URL parameters with filter state
 */
export function updateUrlParams(instance: string | null, filters: Record<string, string[]>): void {
  const params = new URLSearchParams(window.location.search);
  const prefix = instance ? `filter_${instance}_` : 'filter_';

  // Clear existing filter params
  const keysToDelete: string[] = [];
  params.forEach((_value, key) => {
    if (key.startsWith(prefix)) keysToDelete.push(key);
  });
  keysToDelete.forEach((key) => params.delete(key));

  // Add current filter params
  Object.entries(filters).forEach(([field, values]) => {
    if (values.length > 0) {
      params.set(`${prefix}${field}`, values.join(','));
    }
  });

  const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`;
  window.history.pushState({}, '', newUrl);
}

/**
 * Restore filters from URL parameters
 */
export function restoreFromUrl(instance: string | null): void {
  const params = new URLSearchParams(window.location.search);
  const prefix = instance ? `filter_${instance}_` : 'filter_';

  params.forEach((value, key) => {
    if (key.startsWith(prefix)) {
      const field = key.replace(prefix, '');
      const values = value.split(',').map((v) => v.trim());

      applyRestoredValues(field, values, instance);
    }
  });
}

/**
 * Save filter state to localStorage
 */
export function saveToLocalStorage(
  key: string,
  instance: string | null,
  filters: Record<string, string[]>,
): void {
  try {
    const storageKey = `filter_${key}_${instance || 'default'}`;
    localStorage.setItem(storageKey, JSON.stringify(filters));
  } catch (e) {
    // localStorage may be disabled
    console.warn('Failed to save filter state to localStorage', e);
  }
}

/**
 * Restore filter state from localStorage
 */
export function restoreFromLocalStorage(key: string, instance: string | null): void {
  try {
    const storageKey = `filter_${key}_${instance || 'default'}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const filters = JSON.parse(saved) as Record<string, string[]>;
      Object.entries(filters).forEach(([field, values]) => {
        applyRestoredValues(field, values, instance);
      });
    }
  } catch (e) {
    console.warn('Failed to restore filter state from localStorage', e);
  }
}

/**
 * Apply restored filter values onto controls in the DOM. Handles native form
 * controls (input, select) and tab-link / button radios driven by an `active`
 * class — the latter were previously skipped, leaving URL/localStorage state
 * with no visible effect on reload.
 */
function applyRestoredValues(field: string, values: string[], instance: string | null): void {
  const normalizedValues = values.map((v) => v.toLowerCase());
  const baseSelector = `[data-filter-field="${field}"]`;
  const selector = instance
    ? `[data-filter-instance="${instance}"] ${baseSelector}, ${baseSelector}[data-filter-instance="${instance}"]`
    : `${baseSelector}:not([data-filter-instance])`;

  let tabLinkGroupCleared = false;

  document.querySelectorAll(selector).forEach((control) => {
    const el = control as HTMLElement;
    const tagName = el.tagName.toLowerCase();

    if (tagName === 'input') {
      const input = el as HTMLInputElement;
      const controlValue = input.value.toLowerCase();
      if (input.type === 'checkbox' || input.type === 'radio') {
        input.checked = normalizedValues.includes(controlValue);
      } else if (input.type === 'text' || input.type === 'search') {
        input.value = values[0] || '';
      }
    } else if (tagName === 'select') {
      const select = el as HTMLSelectElement;
      if (values.length > 0) {
        select.value = values[0];
      }
    } else if (el.dataset.filterType === 'radio') {
      // Tab-link / button radios: state lives in the `active` class.
      if (!tabLinkGroupCleared) {
        const groupSelector = instance
          ? `[data-filter-field="${field}"][data-filter-type="radio"][data-filter-instance="${instance}"], [data-filter-instance="${instance}"] [data-filter-field="${field}"][data-filter-type="radio"]`
          : `[data-filter-field="${field}"][data-filter-type="radio"]:not([data-filter-instance])`;
        document.querySelectorAll(groupSelector).forEach((sibling) => {
          (sibling as HTMLElement).classList.remove('active');
        });
        tabLinkGroupCleared = true;
      }
      const controlValue = (el.dataset.filterValue || '').toLowerCase();
      if (normalizedValues.includes(controlValue)) {
        el.classList.add('active');
      }
    }
  });
}
