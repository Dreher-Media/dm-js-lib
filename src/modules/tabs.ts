/**
 * Tabs Module
 * Handles tab link functionality for switching between tab content
 */
export function initTabs(): void {
  document.addEventListener("DOMContentLoaded", () => {
    // Handle general tab links
    document.querySelectorAll(".tab-link").forEach((el) => {
      el.addEventListener("click", (event) => {
        const target = event.currentTarget as HTMLElement;
        const parent = target.parentNode as HTMLElement | null;

        if (parent) {
          const activeTab = parent.querySelector(".tab-link.active");
          if (activeTab) {
            activeTab.classList.remove("active");
          }
          target.classList.add("active");
        }
      });
    });
  });
}
