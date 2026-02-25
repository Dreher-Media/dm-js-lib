/**
 * Conditional Module
 * Handles conditional visibility of elements based on dates, times, and URL parameters
 */

import { applyConditionalVisibility } from './core';

/** Debounce timer for DOM observer to avoid excessive re-evaluation */
let reEvaluateDebounce: ReturnType<typeof setTimeout> | null = null;

/** True while we are applying visibility; observer ignores self-caused mutations to avoid feedback loop / flicker */
let isApplyingVisibility = false;

/**
 * Schedules a re-evaluation after a short delay (debounced).
 */
function scheduleReEvaluate(): void {
  if (reEvaluateDebounce !== null) {
    clearTimeout(reEvaluateDebounce);
  }
  reEvaluateDebounce = setTimeout(() => {
    reEvaluateDebounce = null;
    runReEvaluateConditions();
  }, 50);
}

/**
 * Re-evaluates all conditional elements. Ignores observer callbacks caused by our own style/class updates.
 */
function runReEvaluateConditions(): void {
  isApplyingVisibility = true;
  try {
    document
      .querySelectorAll('[data-conditional], [data-conditional-date], [data-conditional-url], [data-conditional-children]')
      .forEach((el) => {
        applyConditionalVisibility(el as HTMLElement);
      });
  } finally {
    // Clear flag after observer callbacks (microtasks) so we don't schedule from our own mutations
    setTimeout(() => {
      isApplyingVisibility = false;
    }, 0);
  }
}

/**
 * Initializes the conditional module
 */
export function initConditional(): void {
  document.addEventListener('DOMContentLoaded', () => {
    // Initial evaluation
    runReEvaluateConditions();

    // Re-evaluate when URL changes (back/forward navigation)
    window.addEventListener('popstate', () => {
      runReEvaluateConditions();
    });

    // Re-evaluate when URL hash changes (some frameworks use this)
    window.addEventListener('hashchange', () => {
      runReEvaluateConditions();
    });

    // Re-evaluate when DOM changes (new/removed nodes or class/style affecting visibility)
    const observer = new MutationObserver(() => {
      if (isApplyingVisibility) return;
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
    runReEvaluateConditions();
  }
}
