/**
 * Tabs Module
 * Handles tab link functionality for switching between tab content
 */
export function initTabs(): void {
  document.addEventListener("DOMContentLoaded", () => {
    // Helper function to get tab target value from a tab link element
    const getTabTargetValue = (link: HTMLElement): string | null => {
      const tabTarget = link.dataset.tabTarget;
      if (tabTarget) {
        return tabTarget;
      }
      const href = link.getAttribute("href");
      if (href?.startsWith("#")) {
        return href.slice(1);
      }
      return null;
    };

    // Helper function to find tab content element by attribute
    const findTabContentByAttribute = (value: string): HTMLElement | null => {
      return document.querySelector(`[data-tab-content="${value}"]`) as HTMLElement | null;
    };

    // Helper function to get all tab content values for a given tab group
    const getTabContentValuesForGroup = (group: string): string[] => {
      const contentValues: string[] = [];
      document
        .querySelectorAll(
          `.tab-link[data-tab-group="${group}"], [data-tab-link][data-tab-group="${group}"]`
        )
        .forEach((link) => {
          const targetValue = getTabTargetValue(link as HTMLElement);
          if (targetValue) {
            contentValues.push(targetValue);
          }
        });
      return contentValues;
    };

    // Helper function to get all tab content values for links within a parent element
    const getTabContentValuesForParent = (parent: HTMLElement): string[] => {
      const contentValues: string[] = [];
      parent.querySelectorAll(".tab-link, [data-tab-link]").forEach((link) => {
        const targetValue = getTabTargetValue(link as HTMLElement);
        if (targetValue) {
          contentValues.push(targetValue);
        }
      });
      return contentValues;
    };

    // Handle general tab links (both class-based and attribute-based)
    document.querySelectorAll(".tab-link, [data-tab-link]").forEach((el) => {
      el.addEventListener("click", (event) => {
        event.preventDefault();
        const target = event.currentTarget as HTMLElement;
        const tabGroup = target.dataset.tabGroup;

        // Get the target tab content value from data-tab-target or href attribute
        const tabTargetValue = getTabTargetValue(target);

        // Find the corresponding tab content element by attribute
        const targetTabContent: HTMLElement | null = tabTargetValue
          ? findTabContentByAttribute(tabTargetValue)
          : null;

        if (tabGroup) {
          // Handle tab groups via data-tab-group attribute
          // Remove active class from all tab links in the same group
          document
            .querySelectorAll(
              `.tab-link[data-tab-group="${tabGroup}"], [data-tab-link][data-tab-group="${tabGroup}"]`
            )
            .forEach((link) => {
              link.classList.remove("active");
            });

          // Get all content values for this tab group and hide them
          const contentValues = getTabContentValuesForGroup(tabGroup);
          contentValues.forEach((contentValue) => {
            const contentEl = findTabContentByAttribute(contentValue);
            if (contentEl) {
              contentEl.style.display = "none";
              contentEl.classList.remove("active");
            }
          });
        } else {
          // Fallback to parent-based approach
          const parent = target.parentNode as HTMLElement | null;
          if (parent) {
            // Remove active class from all tab links in the same parent
            parent.querySelectorAll(".tab-link, [data-tab-link]").forEach((link) => {
              link.classList.remove("active");
            });

            // Get all content values for links in this parent and hide them
            const contentValues = getTabContentValuesForParent(parent);
            contentValues.forEach((contentValue) => {
              const contentEl = findTabContentByAttribute(contentValue);
              if (contentEl) {
                contentEl.style.display = "none";
                contentEl.classList.remove("active");
              }
            });
          }
        }

        // Activate the clicked tab link
        target.classList.add("active");

        // Show the corresponding tab content
        if (targetTabContent) {
          targetTabContent.style.display = "block";
          targetTabContent.classList.add("active");
        }
      });
    });
  });
}
