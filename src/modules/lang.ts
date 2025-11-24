/**
 * Language Module
 * Handles language switching with support for both attribute-based and classname-based localization
 * Includes session storage persistence for selected language
 */

/**
 * Gets the language value from an element, using data-lang-link attribute or textContent as fallback
 * @param element - The element to get the language from
 * @returns The language code or null if not found
 */
function getLangFromElement(element: HTMLElement): string | null {
  const langAttr = element.dataset.langLink;
  if (langAttr) {
    return langAttr;
  }
  // Fallback to textContent converted to lowercase
  const textContent = element.textContent?.trim().toLowerCase();
  return textContent || null;
}

/**
 * Switches to the specified language using both attribute-based and classname-based systems
 * @param lang - The language code to switch to
 */
function switchLanguage(lang: string): void {
  // Store selected language in session storage
  sessionStorage.setItem("selected_lang", lang);

  // === Attribute-based localization (new system) ===
  // Hide all language content except the selected language
  document.querySelectorAll("[data-lang-content]").forEach((el) => {
    const contentEl = el as HTMLElement;
    const contentLang = contentEl.dataset.langContent;
    if (contentLang === lang) {
      contentEl.style.display = "block";
      contentEl.classList.add("active");
    } else {
      contentEl.style.display = "none";
      contentEl.classList.remove("active");
    }
  });

  // === Classname-based localization (legacy system) ===
  // Hide all biography texts except the selected language
  document.querySelectorAll(`.biography-text:not(.${lang})`).forEach((bioEl) => {
    (bioEl as HTMLElement).style.display = "none";
  });

  // Show biography texts for the selected language
  document.querySelectorAll(`.biography-text.${lang}`).forEach((bioEl) => {
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
    .querySelectorAll(`.biography-lang-links .tab-link:not([data-lang="${lang}"])`)
    .forEach((tabEl) => {
      tabEl.classList.remove("active");
    });

  document
    .querySelectorAll(`.biography-lang-links .tab-link[data-lang="${lang}"]`)
    .forEach((tabEl) => {
      tabEl.classList.add("active");
    });
}

/**
 * Extracts the two-letter language code from a browser language string
 * @param langString - The language string from navigator (e.g., "en-US", "de-DE")
 * @returns The two-letter language code or null
 */
function getTwoLetterLangCode(langString: string): string | null {
  const match = langString.match(/^([a-z]{2})(?:-|$)/i);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Gets the browser's preferred language as a two-letter code
 * @returns The two-letter language code or null
 */
function getBrowserLanguage(): string | null {
  // Try navigator.languages first (preferred languages array)
  if (navigator.languages && navigator.languages.length > 0) {
    for (const lang of navigator.languages) {
      const code = getTwoLetterLangCode(lang);
      if (code) {
        return code;
      }
    }
  }

  // Fallback to navigator.language
  if (navigator.language) {
    return getTwoLetterLangCode(navigator.language);
  }

  return null;
}

/**
 * Checks if a language is available on the page
 * @param lang - The language code to check
 * @returns True if the language is available, false otherwise
 */
function isLanguageAvailable(lang: string): boolean {
  // Check attribute-based links
  const attrLangLink = document.querySelector(`[data-lang-link="${lang}"]`);
  if (attrLangLink) {
    return true;
  }

  // Check attribute-based content
  const attrLangContent = document.querySelector(`[data-lang-content="${lang}"]`);
  if (attrLangContent) {
    return true;
  }

  // Check legacy classname-based links
  const legacyLangLink = document.querySelector(
    `.biography-lang-links .tab-link[data-lang="${lang}"]`
  );
  if (legacyLangLink) {
    return true;
  }

  // Check legacy classname-based content
  const legacyLangContent = document.querySelector(`.biography-text.${lang}`);
  if (legacyLangContent) {
    return true;
  }

  return false;
}

/**
 * Restores the selected language from session storage or browser preferences
 */
function restoreLanguage(): void {
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
      `.biography-lang-links .tab-link[data-lang="${selectedLang}"]`
    ) as HTMLElement | null;
    if (legacyLangLink) {
      legacyLangLink.click();
      return;
    }

    // If no link found, directly switch the language
    switchLanguage(selectedLang);
  }
}

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
    document.querySelectorAll(".biography-lang-links .tab-link[data-lang]").forEach((el) => {
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
