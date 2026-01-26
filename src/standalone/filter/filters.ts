/**
 * Filter Module - Filter Logic
 * Functions for extracting filter values and matching items
 */

import type { FilterCache } from './types';

/**
 * Get filter instance identifier
 */
export function getInstance(element: HTMLElement): string | null {
  // Check element and parents for instance identifier
  let current: HTMLElement | null = element;
  while (current) {
    const instance = current.dataset.filterInstance;
    if (instance) return instance;
    current = current.parentElement;
  }
  return null;
}

/**
 * Get filter value from various input types
 */
export function getFilterValue(element: HTMLElement): string | null {
  const tagName = element.tagName.toLowerCase();
  
  if (tagName === 'input') {
    const type = (element as HTMLInputElement).type;
    if (type === 'checkbox' || type === 'radio') {
      return (element as HTMLInputElement).checked
        ? (element as HTMLInputElement).value || 'true'
        : null;
    }
    if (type === 'text' || type === 'search') {
      const value = (element as HTMLInputElement).value.trim();
      return value || null;
    }
    return (element as HTMLInputElement).value || null;
  }
  
  if (tagName === 'select') {
    return (element as HTMLSelectElement).value || null;
  }
  
  // For buttons/links, use data-filter-value or text content
  const dataValue = element.dataset.filterValue;
  if (dataValue) return dataValue;
  
  return null;
}

/**
 * Get all active filter values for a field
 */
export function getFieldFilters(
  field: string,
  instance: string | null
): string[] {
  const filters: string[] = [];
  const baseSelector = `[data-filter-field="${field}"]`;
  const selector = instance
    ? `[data-filter-instance="${instance}"] ${baseSelector}, ${baseSelector}[data-filter-instance="${instance}"]`
    : `${baseSelector}:not([data-filter-instance])`;
  
  document.querySelectorAll(selector).forEach((control) => {
    const value = getFilterValue(control as HTMLElement);
    if (value) {
      filters.push(value.toLowerCase());
    }
  });
  
  return filters;
}

/**
 * Check if a field is a search field (text/search input)
 */
export function isSearchField(field: string, instance: string | null): boolean {
  const baseSelector = `[data-filter-field="${field}"]`;
  const selector = instance
    ? `[data-filter-instance="${instance}"] ${baseSelector}, ${baseSelector}[data-filter-instance="${instance}"]`
    : `${baseSelector}:not([data-filter-instance])`;
  
  const control = document.querySelector(selector) as HTMLElement | null;
  if (!control) return false;
  
  const tagName = control.tagName.toLowerCase();
  if (tagName === 'input') {
    const type = (control as HTMLInputElement).type;
    return type === 'text' || type === 'search';
  }
  
  return false;
}

/**
 * Parse comma-separated field list
 */
export function parseFieldList(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

/**
 * Get all filter fields and their values for an instance
 */
export function getAllFilters(
  instance: string | null
): {
  filters: Record<string, string[]>;
  multifieldSearches: Record<string, string[]>;
} {
  const filters: Record<string, string[]> = {};
  const multifieldSearches: Record<string, string[]> = {};
  const baseSelector = '[data-filter-field]';
  const selector = instance
    ? `[data-filter-instance="${instance}"] ${baseSelector}, ${baseSelector}[data-filter-instance="${instance}"]`
    : `${baseSelector}:not([data-filter-instance])`;
  
  document.querySelectorAll(selector).forEach((control) => {
    const el = control as HTMLElement;
    const field = el.dataset.filterField;
    if (field) {
      const value = getFilterValue(el);
      // Only add non-empty values (empty string, null, or whitespace-only means no filter)
      if (value && value.trim().length > 0) {
        // Check if data-filter-search is specified (can be single or multiple fields)
        const searchFields = parseFieldList(el.dataset.filterSearch);
        if (searchFields.length > 0) {
          // Use data-filter-search to determine which fields to search
          multifieldSearches[field] = searchFields;
        }
        // Store the filter value
        if (!filters[field]) {
          filters[field] = [];
        }
        filters[field].push(value.toLowerCase());
      }
    }
  });
  
  return { filters, multifieldSearches };
}

/**
 * Get field value from a list item for a specific field identifier
 */
export function getItemFieldValue(
  item: HTMLElement,
  field: string
): string[] {
  // First check if item itself has the field
  const itemField = item.dataset.filterField;
  if (itemField === field) {
    const value = item.dataset.filterValue || item.textContent?.trim() || '';
    return value.split(',').map((v) => v.trim().toLowerCase()).filter(Boolean);
  }
  
  // Check for child element with matching field identifier
  const fieldElement = item.querySelector(
    `[data-filter-field="${field}"]`
  ) as HTMLElement | null;
  
  if (fieldElement) {
    const value =
      fieldElement.dataset.filterValue ||
      fieldElement.textContent?.trim() ||
      fieldElement.getAttribute('value') ||
      '';
    return value.split(',').map((v) => v.trim().toLowerCase()).filter(Boolean);
  }
  
  // Fallback: check data-filter-value on the item itself for this field
  // This allows filtering by attribute value without needing field-specific elements
  const itemFilterValue = item.dataset.filterValue;
  if (itemFilterValue) {
    // Check if the item has data-filter-field matching the field we're looking for
    // If not, use the value as a fallback for any field (useful for general filtering)
    const itemValues = itemFilterValue
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean);
    
    // Return the values - they can be matched against any filter
    return itemValues;
  }
  
  return [];
}

/**
 * Get general filterable values from a list item (for multifield search and general filtering)
 */
export function getItemFilterValues(item: HTMLElement): string[] {
  const values: string[] = [];
  
  // Get data-filter-value attribute (comma-separated) - works for all filter types
  const filterValue = item.dataset.filterValue;
  if (filterValue) {
    values.push(
      ...filterValue
        .split(',')
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean)
    );
  }
  
  return values;
}

/**
 * Check if list item matches all active filters
 */
export function matchesFilters(
  item: HTMLElement,
  filters: Record<string, string[]>,
  multifieldSearches: Record<string, string[]>,
  instance: string | null
): boolean {
  // Filter out empty filter arrays
  const activeFilters: Record<string, string[]> = {};
  for (const [field, filterValues] of Object.entries(filters)) {
    if (filterValues.length > 0) {
      activeFilters[field] = filterValues;
    }
  }

  // No filters active, show everything
  if (Object.keys(activeFilters).length === 0) {
    return true;
  }

  // Check each filter field
  for (const [field, filterValues] of Object.entries(activeFilters)) {
    
    // Check if this is a multifield search
    const searchFields = multifieldSearches[field];
    if (searchFields && searchFields.length > 0) {
      // Multifield search: check if search term matches ANY of the specified fields
      const matches = filterValues.some((filterValue) => {
        // Check each field in the search fields list
        const fieldMatches = searchFields.some((searchField) => {
          const itemValues = getItemFieldValue(item, searchField);
          // Use partial matching for search
          return itemValues.some((itemValue) =>
            itemValue.includes(filterValue) || filterValue.includes(itemValue)
          );
        });
        
        // Also check data-filter-value attribute if field search didn't match
        if (!fieldMatches) {
          const generalValues = getItemFilterValues(item);
          return generalValues.some((generalValue) =>
            generalValue.includes(filterValue) || filterValue.includes(generalValue)
          );
        }
        
        return fieldMatches;
      });
      
      if (!matches) {
        return false;
      }
    } else {
      // Regular single-field filter
      let itemValues = getItemFieldValue(item, field);
      
      // If no field-specific values found, check general data-filter-value as fallback
      if (itemValues.length === 0) {
        itemValues = getItemFilterValues(item);
      }
      
      if (itemValues.length === 0) {
        return false; // Item doesn't have this field or any filterable values
      }
      
      const isSearch = isSearchField(field, instance);
      
      // Match if any filter value matches any item value
      const matches = filterValues.some((filterValue) =>
        itemValues.some((itemValue) => {
          // For search fields, use partial matching
          if (isSearch) {
            return itemValue.includes(filterValue) || filterValue.includes(itemValue);
          }
          // For checkboxes/radios/selects, use exact matching
          return itemValue === filterValue;
        })
      );
      
      if (!matches) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Update count displays
 */
export function updateCounts(
  listElement: HTMLElement,
  total: number,
  visible: number,
  instance: string | null,
  cache?: FilterCache
): void {
  const countElements = cache?.countElements || [];
  if (countElements.length === 0) {
    const baseSelector = '[data-filter-count], [data-filter-results]';
    const selector = instance
      ? `[data-filter-instance="${instance}"] ${baseSelector}, ${baseSelector}[data-filter-instance="${instance}"]`
      : `${baseSelector}:not([data-filter-instance])`;
    countElements.push(...(Array.from(document.querySelectorAll(selector)) as HTMLElement[]));
  }

  countElements.forEach((element) => {
    const el = element as HTMLElement;
    if (el.dataset.filterCount !== undefined) {
      el.textContent = total.toString();
      el.setAttribute('aria-label', `Total items: ${total}`);
    }
    if (el.dataset.filterResults !== undefined) {
      el.textContent = visible.toString();
      el.setAttribute('aria-label', `Showing ${visible} of ${total} items`);
    }
  });
}
