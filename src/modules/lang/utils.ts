/**
 * Language Module - Utility Functions
 * Helper functions for language detection and validation
 */

/**
 * Gets the language value from an element, using data-lang-link attribute or textContent as fallback
 * @param element - The element to get the language from
 * @returns The language code or null if not found
 */
export function getLangFromElement(element: HTMLElement): string | null {
  const langAttr = element.dataset.langLink;
  if (langAttr) {
    return langAttr;
  }
  // Fallback to textContent converted to lowercase
  const textContent = element.textContent?.trim().toLowerCase();
  return textContent || null;
}

/**
 * Extracts the two-letter language code from a browser language string
 * @param langString - The language string from navigator (e.g., "en-US", "de-DE")
 * @returns The two-letter language code or null
 */
export function getTwoLetterLangCode(langString: string): string | null {
  const match = langString.match(/^([a-z]{2})(?:-|$)/i);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Gets the browser's preferred language as a two-letter code
 * @returns The two-letter language code or null
 */
export function getBrowserLanguage(): string | null {
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
export function isLanguageAvailable(lang: string): boolean {
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

  return false;
}
