/**
 * Tabs Module
 * Handles tab link functionality for switching between tab content
 */

import { getUrlParams, getTabTargetValue, findAllTabContentByAttribute } from './utils';
import { activateTab } from './core';
import { getTabContentValuesForGroup, getTabContentValuesForParent } from './utils';

export function initTabs(): void {
  document.addEventListener("DOMContentLoaded", () => {
    // Handle URL parameters for setting default tab
    const urlParams = getUrlParams();
    const urlTab = urlParams.get("tab");
    const urlTabGroup = urlParams.get("tabGroup");

    if (urlTab) {
      // Find tab link by target value
      let targetTabLink: HTMLElement | null = null;

      if (urlTabGroup) {
        // If tabGroup is specified, find tab link within that group
        document
          .querySelectorAll(
            `.tab-link[data-tab-group="${urlTabGroup}"]:not([data-lang-link]):not([data-lang]), [data-tab-link][data-tab-group="${urlTabGroup}"]`
          )
          .forEach((link) => {
            const targetValue = getTabTargetValue(link as HTMLElement);
            if (targetValue === urlTab) {
              targetTabLink = link as HTMLElement;
            }
          });

        // Explicitly hide all other tabs in the same group before activating
        // This ensures all tabs in the group are properly deactivated
        document
          .querySelectorAll(
            `.tab-link[data-tab-group="${urlTabGroup}"]:not([data-lang-link]):not([data-lang]), [data-tab-link][data-tab-group="${urlTabGroup}"]`
          )
          .forEach((link) => {
            link.classList.remove("active");
          });

        // Hide all content elements for this tab group
        // First, hide all content elements that have the data-tab-group attribute matching this group
        document
          .querySelectorAll(`[data-tab-content][data-tab-group="${urlTabGroup}"]`)
          .forEach((contentEl) => {
            (contentEl as HTMLElement).style.display = "none";
            contentEl.classList.remove("active");
          });

        // Also hide content elements based on tab link target values
        const contentValues = getTabContentValuesForGroup(urlTabGroup);
        contentValues.forEach((contentValue) => {
          const contentEls = findAllTabContentByAttribute(contentValue);
          contentEls.forEach((contentEl) => {
            contentEl.style.display = "none";
            contentEl.classList.remove("active");
          });
        });
      } else {
        // Find tab link without group restriction
        document
          .querySelectorAll(".tab-link:not([data-lang-link]):not([data-lang]), [data-tab-link]")
          .forEach((link) => {
            const targetValue = getTabTargetValue(link as HTMLElement);
            if (targetValue === urlTab) {
              targetTabLink = link as HTMLElement;
            }
          });
      }

      // Activate the tab if found
      if (targetTabLink) {
        activateTab(targetTabLink);
      }
    }

    // Handle general tab links (both class-based and attribute-based)
    document
      .querySelectorAll(".tab-link:not([data-lang-link]):not([data-lang]), [data-tab-link]")
      .forEach((el) => {
        el.addEventListener("click", (event) => {
          event.preventDefault();
          const target = event.currentTarget as HTMLElement;
          activateTab(target);
        });
      });

    // Handle tabs that already have the "active" class in HTML
    // Only process if no URL parameters were set (URL params take precedence)
    if (!urlTab) {
      document
        .querySelectorAll(
          ".tab-link.active:not([data-lang-link]):not([data-lang]), [data-tab-link].active"
        )
        .forEach((link) => {
          const tabLink = link as HTMLElement;
          const tabGroup = tabLink.dataset.tabGroup;
          const tabTargetValue = getTabTargetValue(tabLink);
          const targetTabContents = tabTargetValue
            ? findAllTabContentByAttribute(tabTargetValue)
            : [];

          // Show the corresponding tab content
          if (targetTabContents.length > 0) {
            // Hide other tabs in the same group or parent
            if (tabGroup) {
              // Hide all content elements that have the data-tab-group attribute matching this group
              document
                .querySelectorAll(`[data-tab-content][data-tab-group="${tabGroup}"]`)
                .forEach((contentEl) => {
                  // Only hide if it's not one of the target tab contents
                  if (!targetTabContents.includes(contentEl as HTMLElement)) {
                    (contentEl as HTMLElement).style.display = "none";
                    contentEl.classList.remove("active");
                  }
                });

              // Also hide content elements based on tab link target values
              const contentValues = getTabContentValuesForGroup(tabGroup);
              contentValues.forEach((contentValue) => {
                const contentEls = findAllTabContentByAttribute(contentValue);
                contentEls.forEach((contentEl) => {
                  // Only hide if it's not one of the target tab contents
                  if (!targetTabContents.includes(contentEl)) {
                    contentEl.style.display = "none";
                    contentEl.classList.remove("active");
                  }
                });
              });
            } else {
              const parent = tabLink.parentNode as HTMLElement | null;
              if (parent) {
                const contentValues = getTabContentValuesForParent(parent);
                contentValues.forEach((contentValue) => {
                  const contentEls = findAllTabContentByAttribute(contentValue);
                  contentEls.forEach((contentEl) => {
                    // Only hide if it's not one of the target tab contents
                    if (!targetTabContents.includes(contentEl)) {
                      contentEl.style.display = "none";
                      contentEl.classList.remove("active");
                    }
                  });
                });
              }
            }

            // Show all active tab content elements
            targetTabContents.forEach((targetTabContent) => {
              targetTabContent.style.display = "block";
              targetTabContent.classList.add("active");
            });
          }
        });
    }

    // Handle initial active state for tab links with data-tab-first-active
    // Only run if no URL parameters were set
    if (!urlTab) {
      const processedGroups = new Set<string>();

      // Handle data-tab-first-active on tab links directly
      document
        .querySelectorAll(
          ".tab-link[data-tab-first-active]:not([data-lang-link]):not([data-lang]), [data-tab-link][data-tab-first-active]"
        )
        .forEach((link) => {
          const tabLink = link as HTMLElement;
          const tabGroup = tabLink.dataset.tabGroup;

          // Skip if URL parameter specified this tab group
          if (urlTabGroup && tabGroup === urlTabGroup) {
            return;
          }

          // Skip if this tab is already active
          if (tabLink.classList.contains("active")) {
            return;
          }

          if (tabGroup) {
            // Skip if this group was already processed
            if (processedGroups.has(tabGroup)) {
              return;
            }

            // Skip if a tab in this group is already active
            const hasActiveTabInGroup =
              document.querySelector(
                `.tab-link.active[data-tab-group="${tabGroup}"]:not([data-lang-link]):not([data-lang]), [data-tab-link].active[data-tab-group="${tabGroup}"]`
              ) !== null;

            if (hasActiveTabInGroup) {
              processedGroups.add(tabGroup);
              return;
            }

            processedGroups.add(tabGroup);

            // Activate the first tab in the group
            const firstTabLink = document.querySelector(
              `.tab-link[data-tab-group="${tabGroup}"]:not([data-lang-link]):not([data-lang]), [data-tab-link][data-tab-group="${tabGroup}"]`
            ) as HTMLElement | null;

            if (firstTabLink) {
              activateTab(firstTabLink);
            }
          } else {
            // No group, check if any tab in parent is already active
            const parent = tabLink.parentNode as HTMLElement | null;
            if (parent) {
              const hasActiveTabInParent =
                parent.querySelector(
                  ".tab-link.active:not([data-lang-link]):not([data-lang]), [data-tab-link].active"
                ) !== null;

              if (!hasActiveTabInParent) {
                // Activate this tab
                activateTab(tabLink);
              }
            } else {
              // No parent, just activate this tab
              activateTab(tabLink);
            }
          }
        });

      // Handle data-tab-first-active on containers with data-tab-group
      document.querySelectorAll("[data-tab-first-active][data-tab-group]").forEach((element) => {
        const tabGroup = (element as HTMLElement).dataset.tabGroup;
        if (!tabGroup) {
          return;
        }

        // Skip if URL parameter specified this tab group
        if (urlTabGroup && tabGroup === urlTabGroup) {
          return;
        }

        // Skip if this group was already processed
        if (processedGroups.has(tabGroup)) {
          return;
        }

        // Skip if a tab in this group is already active
        const hasActiveTabInGroup =
          document.querySelector(
            `.tab-link.active[data-tab-group="${tabGroup}"]:not([data-lang-link]):not([data-lang]), [data-tab-link].active[data-tab-group="${tabGroup}"]`
          ) !== null;

        if (hasActiveTabInGroup) {
          processedGroups.add(tabGroup);
          return;
        }

        processedGroups.add(tabGroup);

        // Find the first tab link in this group
        const firstTabLink = document.querySelector(
          `.tab-link[data-tab-group="${tabGroup}"]:not([data-lang-link]):not([data-lang]), [data-tab-link][data-tab-group="${tabGroup}"]`
        ) as HTMLElement | null;

        if (firstTabLink) {
          activateTab(firstTabLink);
        }
      });
    }
  });
}
