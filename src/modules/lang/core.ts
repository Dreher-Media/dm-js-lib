/**
 * Language Module - Core Logic
 * Main language switching and restoration functionality
 */

import { getLangFromElement, getBrowserLanguage, isLanguageAvailable } from './utils';

/**
 * Switches to the specified language using both attribute-based and classname-based systems
 * @param lang - The language code to switch to
 */
export function switchLanguage(lang: string): void {
  // Store selected language in session storage
  sessionStorage.setItem("selected_lang", lang);

  // === Attribute-based localization (new system) ===
  // Process elements that use the attribute-based system
  document.querySelectorAll("[data-lang-content]").forEach((el) => {
    const contentEl = el as HTMLElement;
    const contentLang = contentEl.dataset.langContent;
    if (contentLang === lang) {
      contentEl.style.display = "";
      contentEl.classList.add("lang-active");
    } else {
      contentEl.style.display = "none";
      contentEl.classList.remove("lang-active");
    }
  });

  // === Classname-based localization (legacy system) ===
  // Process .biography-text elements that don't use the attribute-based system
  document
    .querySelectorAll(`.biography-text:not([data-lang-content]):not(.${lang})`)
    .forEach((bioEl) => {
      (bioEl as HTMLElement).style.display = "none";
    });

  document.querySelectorAll(`.biography-text:not([data-lang-content]).${lang}`).forEach((bioEl) => {
    (bioEl as HTMLElement).style.display = "block";
  });

  // Update tab link active states (supports both systems)
  // Attribute-based links
  document.querySelectorAll("[data-lang-link]").forEach((linkEl) => {
    const link = linkEl as HTMLElement;
    const linkLang = getLangFromElement(link);
    if (linkLang === lang) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });

  // Legacy classname-based links
  document
    .querySelectorAll(
      `.biography-lang-links .tab-link[data-lang]:not([data-lang-link]):not([data-lang="${lang}"])`
    )
    .forEach((tabEl) => {
      tabEl.classList.remove("active");
    });

  document
    .querySelectorAll(
      `.biography-lang-links .tab-link[data-lang]:not([data-lang-link])[data-lang="${lang}"]`
    )
    .forEach((tabEl) => {
      tabEl.classList.add("active");
    });
}

/**
 * Restores the selected language from session storage or browser preferences
 */
export function restoreLanguage(): void {
  let selectedLang = sessionStorage.getItem("selected_lang");

  // If no language in session storage, try browser language
  if (!selectedLang) {
    const browserLang = getBrowserLanguage();
    if (browserLang && isLanguageAvailable(browserLang)) {
      selectedLang = browserLang;
    } else if (isLanguageAvailable("en")) {
      // Fallback to English if available
      selectedLang = "en";
    } else {
      // No available language found, don't change anything
      return;
    }
  }

  if (selectedLang) {
    // Try to find and click the language link
    // Attribute-based link
    const attrLangLink = document.querySelector(
      `[data-lang-link="${selectedLang}"]`
    ) as HTMLElement | null;
    if (attrLangLink) {
      attrLangLink.click();
      return;
    }

    // Legacy classname-based link
    const legacyLangLink = document.querySelector(
      `.biography-lang-links .tab-link[data-lang]:not([data-lang-link])[data-lang="${selectedLang}"]`
    ) as HTMLElement | null;
    if (legacyLangLink) {
      legacyLangLink.click();
      return;
    }

    // If no link found, directly switch the language
    switchLanguage(selectedLang);
  }
}
