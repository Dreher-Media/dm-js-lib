/**
 * Tabs Module - Core Logic
 * Main tab activation and management functionality
 */

import {
  getTabTargetValue,
  findAllTabContentByAttribute,
  findTabContents,
  getTabContentValuesForGroup,
  getTabContentValuesForParent,
} from './utils';

export interface ActivateTabOptions {
  /**
   * Scroll the activated tab link into view after activation. Off by default so a
   * plain click (the target is already on-screen) keeps its current behaviour;
   * callers landing on a tab from elsewhere (e.g. the `?tab=&tabGroup=` deep link)
   * opt in explicitly. Uses the same `scrollIntoView({ behavior: 'smooth', block:
   * 'start' })` call as the filter module's anchor scroll, so it honours a
   * `scroll-margin-top` set for a fixed header the same way.
   */
  scrollIntoView?: boolean;
}

/**
 * Helper function to activate a tab programmatically
 */
export function activateTab(tabLink: HTMLElement, options: ActivateTabOptions = {}): void {
  const tabGroup = tabLink.dataset.tabGroup;
  const tabTargetValue = getTabTargetValue(tabLink);
  const targetTabContents = tabTargetValue ? findTabContents(tabTargetValue, tabGroup) : [];

  if (tabGroup) {
    // Handle tab groups via data-tab-group attribute
    // Remove active class from all tab links in the same group (across entire document)
    document
      .querySelectorAll(
        `.tab-link[data-tab-group="${tabGroup}"]:not([data-lang-link]):not([data-lang]), [data-tab-link][data-tab-group="${tabGroup}"]`,
      )
      .forEach((link) => {
        link.classList.remove('active');
      });

    // Hide all content elements that have the data-tab-group attribute matching this group
    document
      .querySelectorAll(`[data-tab-content][data-tab-group="${tabGroup}"]`)
      .forEach((contentEl) => {
        (contentEl as HTMLElement).style.display = 'none';
        contentEl.classList.remove('active');
      });

    // Also hide content elements based on tab link target values
    const contentValues = getTabContentValuesForGroup(tabGroup);
    contentValues.forEach((contentValue) => {
      const contentEls = findTabContents(contentValue, tabGroup);
      contentEls.forEach((contentEl) => {
        contentEl.style.display = 'none';
        contentEl.classList.remove('active');
      });
    });
  } else {
    // Fallback to parent-based approach
    const parent = tabLink.parentNode as HTMLElement | null;
    if (parent) {
      // Remove active class from all tab links in the same parent
      parent
        .querySelectorAll('.tab-link:not([data-lang-link]):not([data-lang]), [data-tab-link]')
        .forEach((link) => {
          link.classList.remove('active');
        });

      // Get all content values for links in this parent and hide all matching content elements
      const contentValues = getTabContentValuesForParent(parent);
      contentValues.forEach((contentValue) => {
        const contentEls = findAllTabContentByAttribute(contentValue);
        contentEls.forEach((contentEl) => {
          contentEl.style.display = 'none';
          contentEl.classList.remove('active');
        });
      });
    }
  }

  // Activate the tab link
  tabLink.classList.add('active');

  // Show all corresponding tab content elements
  targetTabContents.forEach((targetTabContent) => {
    targetTabContent.style.display = 'block';
    targetTabContent.classList.add('active');
  });

  if (options.scrollIntoView) {
    requestAnimationFrame(() => {
      tabLink.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}
