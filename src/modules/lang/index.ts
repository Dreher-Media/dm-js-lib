/**
 * Language Module
 * Handles language switching with attribute-based localization (data-lang-link / data-lang-content)
 * Includes session storage persistence for selected language
 */

import { getLangFromElement } from './utils';
import { switchLanguage, restoreLanguage } from './core';

/**
 * Initializes the language module
 */
export function initLang(): void {
  document.addEventListener('DOMContentLoaded', () => {
    // Handle attribute-based language links
    document.querySelectorAll('[data-lang-link]').forEach((el) => {
      el.addEventListener('click', (event) => {
        event.preventDefault();
        const target = event.currentTarget as HTMLElement;
        const lang = getLangFromElement(target);

        if (!lang) return;

        switchLanguage(lang);
      });
    });

    // Restore language on page load
    restoreLanguage();
  });

  // Handle case where DOM is already loaded when script runs
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    restoreLanguage();
  }
}
