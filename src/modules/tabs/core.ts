/**
 * Tabs Module - Core Logic
 * Main tab activation and management functionality
 */

import {
  getTabTargetValue,
  findAllTabContentByAttribute,
  getTabContentValuesForGroup,
  getTabContentValuesForParent,
} from './utils';

/**
 * Helper function to activate a tab programmatically
 */
export function activateTab(tabLink: HTMLElement): void {
  const tabGroup = tabLink.dataset.tabGroup;
  const tabTargetValue = getTabTargetValue(tabLink);
  const targetTabContents = tabTargetValue ? findAllTabContentByAttribute(tabTargetValue) : [];

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
      const contentEls = findAllTabContentByAttribute(contentValue);
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
}
