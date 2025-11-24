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
    });
  }
}
