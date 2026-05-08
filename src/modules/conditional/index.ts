/**
 * Conditional Module
 * Handles conditional visibility of elements based on dates, times, and URL parameters
 */

import { applyConditionalVisibility } from './core';

const CONDITIONAL_SELECTOR =
  '[data-conditional], [data-conditional-date], [data-conditional-url], [data-conditional-children]';

/** Debounce timer for DOM observer to avoid excessive re-evaluation */
let reEvaluateDebounce: ReturnType<typeof setTimeout> | null = null;

/** Elements we're updating this run; observer skips only when all mutations are on these (avoids feedback loop but still reacts to external DOM changes) */
let elementsUpdatedThisRun: Set<Element> | null = null;

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
 * Re-evaluates all conditional elements. Observer will ignore only mutations on these elements to avoid feedback loop, but will still schedule when other scripts change the DOM.
 */
function runReEvaluateConditions(): void {
  const elements = document.querySelectorAll(CONDITIONAL_SELECTOR);
  elementsUpdatedThisRun = new Set(Array.from(elements));
  try {
    elements.forEach((el) => {
      applyConditionalVisibility(el as HTMLElement);
    });
  } finally {
    setTimeout(() => {
      elementsUpdatedThisRun = null;
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
    const observer = new MutationObserver((mutations) => {
      if (elementsUpdatedThisRun !== null) {
        const onlyOurUpdates = mutations.every((m) =>
          elementsUpdatedThisRun!.has(m.target as Element),
        );
        if (onlyOurUpdates) return;
      }
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
