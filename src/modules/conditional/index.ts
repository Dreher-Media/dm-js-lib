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
  });

  // Handle case where DOM is already loaded when script runs
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    reEvaluateConditions();
  }
}
