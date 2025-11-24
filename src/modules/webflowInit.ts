/**
 * Webflow Initialization Module
 * Handles Webflow-specific initialization tasks
 */
export function initWebflow(): void {
  if (typeof window.Webflow !== "undefined") {
    window.Webflow.push(() => {
      // Update copyright year
      const copyrightElements = document.querySelectorAll(".copyright-year");
      copyrightElements.forEach((el) => {
        el.textContent = new Date().getFullYear().toString();
      });

      // Restore selected language from session storage
      const selectedLang = sessionStorage.getItem("selected_lang");
      if (selectedLang) {
        const langLink = document.querySelector(
          `.biography-lang-links .tab-link[data-lang="${selectedLang}"]`
        ) as HTMLElement | null;
        langLink?.click?.();
      }
    });
  }
}

