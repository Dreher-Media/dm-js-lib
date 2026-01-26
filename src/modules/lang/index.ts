/**
 * Language Module
 * Handles language switching with support for both attribute-based and classname-based localization
 * Includes session storage persistence for selected language
 */

import { getLangFromElement } from './utils';
import { switchLanguage, restoreLanguage } from './core';

/**
 * Initializes the language module
 */
export function initLang(): void {
  document.addEventListener("DOMContentLoaded", () => {
    // Handle attribute-based language links
    document.querySelectorAll("[data-lang-link]").forEach((el) => {
      el.addEventListener("click", (event) => {
        event.preventDefault();
        const target = event.currentTarget as HTMLElement;
        const lang = getLangFromElement(target);

        if (!lang) return;

        switchLanguage(lang);
      });
    });

    // Handle legacy classname-based language links
    document
      .querySelectorAll(
        ".biography-lang-links .tab-link[data-lang]:not([data-lang-link])[data-lang]"
      )
      .forEach((el) => {
        el.addEventListener("click", (event) => {
          event.preventDefault();
          const target = event.currentTarget as HTMLElement;
          const lang = target.dataset?.lang;

          if (!lang) return;

          switchLanguage(lang);
        });
      });

    // Restore language on page load
    restoreLanguage();
  });

  // Handle case where DOM is already loaded when script runs
  if (document.readyState === "interactive" || document.readyState === "complete") {
    restoreLanguage();
  }
}
