/**
 * Language Module - Core Logic
 * Main language switching and restoration functionality
 */

import { getLangFromElement, getBrowserLanguage, isLanguageAvailable } from "./utils";

/**
 * Switches to the specified language using the attribute-based system
 * @param lang - The language code to switch to
 */
export function switchLanguage(lang: string): void {
  // Store selected language in session storage
  sessionStorage.setItem("selected_lang", lang);

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

  // Update tab link active states
  document.querySelectorAll("[data-lang-link]").forEach((linkEl) => {
    const link = linkEl as HTMLElement;
    const linkLang = getLangFromElement(link);
    if (linkLang === lang) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
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
    const attrLangLink = document.querySelector(
      `[data-lang-link="${selectedLang}"]`
    ) as HTMLElement | null;
    if (attrLangLink) {
      attrLangLink.click();
      return;
    }

    // If no link found, directly switch the language
    switchLanguage(selectedLang);
  }
}
