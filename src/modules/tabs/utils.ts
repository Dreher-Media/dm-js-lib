/**
 * Tabs Module - Utility Functions
 * Helper functions for tab target resolution and content finding
 */

/**
 * Helper function to get URL parameters
 */
export function getUrlParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

/**
 * Helper function to get tab target value from a tab link element
 */
export function getTabTargetValue(link: HTMLElement): string | null {
  // Priority 1: data-tab-target attribute
  const tabTarget = link.dataset.tabTarget;
  if (tabTarget) {
    return tabTarget;
  }
  // Priority 2: data-tab-link attribute value (for attribute-based tabs)
  const tabLink = link.dataset.tabLink;
  if (tabLink) {
    return tabLink;
  }
  // Priority 3: href attribute starting with #
  const href = link.getAttribute('href');
  if (href?.startsWith('#')) {
    return href.slice(1);
  }
  return null;
}

/**
 * Helper function to find tab content element by attribute
 */
export function findTabContentByAttribute(value: string): HTMLElement | null {
  return document.querySelector(`[data-tab-content="${value}"]`) as HTMLElement | null;
}

/**
 * Helper function to find all tab content elements by attribute
 */
export function findAllTabContentByAttribute(value: string): HTMLElement[] {
  return Array.from(document.querySelectorAll(`[data-tab-content="${value}"]`)) as HTMLElement[];
}

/**
 * Helper function to find the tab content elements for a tab value, scoped to a tab group.
 * When a group is given, panels matching both value and group win, so two groups can share
 * a content value without colliding. Falls back to the unscoped lookup when no panel carries
 * the group (keeps markup whose panels lack data-tab-group working).
 */
export function findTabContents(value: string, group?: string): HTMLElement[] {
  if (group) {
    const scoped = Array.from(
      document.querySelectorAll(`[data-tab-content="${value}"][data-tab-group="${group}"]`),
    ) as HTMLElement[];
    if (scoped.length > 0) {
      return scoped;
    }
  }
  return findAllTabContentByAttribute(value);
}

/**
 * Helper function to get all tab content values for a given tab group
 */
export function getTabContentValuesForGroup(group: string): string[] {
  const contentValues: string[] = [];
  document
    .querySelectorAll(
      `.tab-link[data-tab-group="${group}"]:not([data-lang-link]):not([data-lang]), [data-tab-link][data-tab-group="${group}"]`,
    )
    .forEach((link) => {
      const targetValue = getTabTargetValue(link as HTMLElement);
      if (targetValue) {
        contentValues.push(targetValue);
      }
    });
  return contentValues;
}

/**
 * Helper function to get all tab content values for links within a parent element
 */
export function getTabContentValuesForParent(parent: HTMLElement): string[] {
  const contentValues: string[] = [];
  parent
    .querySelectorAll('.tab-link:not([data-lang-link]):not([data-lang]), [data-tab-link]')
    .forEach((link) => {
      const targetValue = getTabTargetValue(link as HTMLElement);
      if (targetValue) {
        contentValues.push(targetValue);
      }
    });
  return contentValues;
}
