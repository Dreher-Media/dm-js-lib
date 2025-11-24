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
        const tabGroup = target.dataset.tabGroup;

        if (tabGroup) {
          // Handle tab groups via data-tab-group attribute
          document
            .querySelector(`.tab-link.active[data-tab-group="${tabGroup}"]`)
            ?.classList?.remove("active");
        } else {
          // Fallback to parent-based approach
          const parent = target.parentNode as HTMLElement | null;
          parent?.querySelector(".tab-link.active")?.classList?.remove("active");
        }

        target.classList.add("active");
      });
    });
  });
}
