/**
 * Conditional Module
 * Handles conditional visibility of elements based on dates, times, and URL parameters
 */

import { applyConditionalVisibility } from './core';

/**
 * Re-evaluates all conditional elements
 */
function reEvaluateConditions(): void {
  document
    .querySelectorAll('[data-conditional], [data-conditional-date], [data-conditional-url], [data-conditional-children]')
    .forEach((el) => {
      applyConditionalVisibility(el as HTMLElement);
    });
}

/** Debounce timer for DOM observer to avoid excessive re-evaluation */
let reEvaluateDebounce: ReturnType<typeof setTimeout> | null = null;

/**
 * Schedules a re-evaluation after a short delay (debounced).
 */
function scheduleReEvaluate(): void {
  if (reEvaluateDebounce !== null) {
    clearTimeout(reEvaluateDebounce);
  }
  reEvaluateDebounce = setTimeout(() => {
    reEvaluateDebounce = null;
    reEvaluateConditions();
  }, 50);
}

/**
 * Initializes the conditional module
 */
export function initConditional(): void {
  document.addEventListener('DOMContentLoaded', () => {
    // Initial evaluation
    reEvaluateConditions();

    // Re-evaluate when URL changes (back/forward navigation)
    window.addEventListener('popstate', () => {
      reEvaluateConditions();
    });

    // Re-evaluate when URL hash changes (some frameworks use this)
    window.addEventListener('hashchange', () => {
      reEvaluateConditions();
    });

    // Re-evaluate when DOM changes (new/removed nodes or class/style affecting visibility)
    const observer = new MutationObserver(() => {
      scheduleReEvaluate();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden'],
    });
  });

  // Handle case where DOM is already loaded when script runs
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    reEvaluateConditions();
  }
}
