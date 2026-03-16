/**
 * Filter Module - Programmatic API
 * Functions for programmatically controlling filters
 */

import { getInstance } from "./filters";
import { getAllFilters } from "./filters";
import { getCache, updateCache } from "./cache";
import { applyFilters } from "./apply";
import { refreshAutofill } from "./autofill";

/**
 * Programmatic API for filter control
 */
export const filterAPI = {
  setFilter: (instance: string | null, field: string, value: string): void => {
    const baseSelector = `[data-filter-field="${field}"]`;
    const selector = instance
      ? `[data-filter-instance="${instance}"] ${baseSelector}, ${baseSelector}[data-filter-instance="${instance}"]`
      : `${baseSelector}:not([data-filter-instance])`;

    document.querySelectorAll(selector).forEach((control) => {
      const el = control as HTMLElement;
      const tagName = el.tagName.toLowerCase();

      if (tagName === "input") {
        const input = el as HTMLInputElement;
        if (input.type === "checkbox" || input.type === "radio") {
          input.checked = input.value.toLowerCase() === value.toLowerCase();
        } else {
          input.value = value;
        }
      } else if (tagName === "select") {
        (el as HTMLSelectElement).value = value;
      }
    });

    const baseListSelector = "[data-filter-list]";
    const listSelector = instance
      ? `[data-filter-instance="${instance}"] ${baseListSelector}, ${baseListSelector}[data-filter-instance="${instance}"]`
      : `${baseListSelector}:not([data-filter-instance])`;

    const listElement = document.querySelector(listSelector) as HTMLElement;
    if (listElement) {
      applyFilters(listElement);
    }
  },

  clear: (instance: string | null): void => {
    const baseListSelector = "[data-filter-list]";
    const listSelector = instance
      ? `[data-filter-instance="${instance}"] ${baseListSelector}, ${baseListSelector}[data-filter-instance="${instance}"]`
      : `${baseListSelector}:not([data-filter-instance])`;

    const listElement = document.querySelector(listSelector) as HTMLElement;
    if (listElement) {
      const baseSelector = "[data-filter-field]";
      const selector = instance
        ? `[data-filter-instance="${instance}"] ${baseSelector}, ${baseSelector}[data-filter-instance="${instance}"]`
        : `${baseSelector}:not([data-filter-instance])`;

      document.querySelectorAll(selector).forEach((control) => {
        const el = control as HTMLElement;
        const tagName = el.tagName.toLowerCase();

        if (tagName === "input") {
          const input = el as HTMLInputElement;
          if (input.type === "checkbox" || input.type === "radio") {
            input.checked = false;
          } else {
            input.value = "";
          }
        } else if (tagName === "select") {
          (el as HTMLSelectElement).selectedIndex = 0;
        } else {
          el.classList.remove("active");
        }
      });

      applyFilters(listElement);
    }
  },

  getActiveFilters: (instance: string | null): Record<string, string[]> => {
    const { filters } = getAllFilters(instance);
    return filters;
  },

  refresh: (instance: string | null): void => {
    const baseListSelector = "[data-filter-list]";
    const listSelector = instance
      ? `[data-filter-instance="${instance}"] ${baseListSelector}, ${baseListSelector}[data-filter-instance="${instance}"]`
      : `${baseListSelector}:not([data-filter-instance])`;

    const listElement = document.querySelector(listSelector) as HTMLElement;
    if (listElement) {
      updateCache(instance, listElement);
      refreshAutofill(instance);
      applyFilters(listElement);
    }
  },
};
