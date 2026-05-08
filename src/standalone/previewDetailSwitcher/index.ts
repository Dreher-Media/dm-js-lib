/**
 * Preview Detail Switcher Module
 * Handles switching between preview and detail views.
 * Only one detail view is shown at a time. Preview buttons select which detail view to display.
 */

export interface PreviewDetailSwitcherOptions {
  /**
   * Container element or selector to scope this instance to.
   * When provided, only elements within this container will be affected.
   * Allows multiple instances on the same page.
   */
  container?: HTMLElement | string;
  /**
   * Selector for the detail view items. Only one is shown at a time.
   * @default '[data-disco-item]'
   */
  itemSelector?: string;
  /**
   * Attribute name on preview elements (clickable preview buttons that select which detail view to show)
   * @default 'data-preview-id'
   */
  previewIdAttribute?: string;
  /**
   * Attribute name on detail view elements. Must match the preview-id value to be shown.
   * @default 'data-detail-id'
   */
  detailIdAttribute?: string;
  /**
   * Index of the item to show initially (0-based)
   * @default 0
   */
  initialIndex?: number;
  /**
   * Display value to use when showing items
   * @default 'block'
   */
  displayValue?: string;
}

/**
 * Initializes the preview detail switcher functionality.
 * Only one detail view is shown at a time. Clicking preview buttons selects which detail view to display.
 * @param options - Configuration options for the preview detail switcher
 */
export function initPreviewDetailSwitcher(options: PreviewDetailSwitcherOptions = {}): void {
  const {
    container,
    itemSelector = '[data-detail-item]',
    previewIdAttribute = 'data-preview-id',
    detailIdAttribute = 'data-detail-id',
    initialIndex = 0,
    displayValue = 'block',
  } = options;

  // Resolve container element
  const getContainer = (): HTMLElement | Document => {
    if (!container) return document;
    if (typeof container === 'string') {
      const element = document.querySelector<HTMLElement>(container);
      return element || document;
    }
    return container;
  };

  const scope = getContainer();

  const handleClick = (event: Event): void => {
    const previewElement = event.currentTarget as HTMLElement;
    if (!previewElement) return;

    const previewId = previewElement.getAttribute(previewIdAttribute);
    if (!previewId) return;

    // Find the detail view item with matching detail-id within the container scope
    // The detail item must also match the item selector
    const detailItem = scope.querySelector(
      `${itemSelector}[${detailIdAttribute}="${previewId}"]`,
    ) as HTMLElement | null;

    if (!detailItem) return;

    // Hide all detail view items (only one is shown at a time)
    const allDetailItems = scope.querySelectorAll<HTMLElement>(itemSelector);
    allDetailItems.forEach((item) => {
      if (item) {
        item.style.display = 'none';
      }
    });

    // Show only the selected detail view item
    detailItem.style.display = displayValue;
  };

  // Initialize on DOM ready
  const init = (): void => {
    const detailItems = scope.querySelectorAll<HTMLElement>(itemSelector);

    if (detailItems.length === 0) return;

    // Hide all detail view items first
    detailItems.forEach((item) => {
      if (item) {
        item.style.display = 'none';
      }
    });

    // Show initial detail view item (only one is shown at a time)
    const initialDetailItem = detailItems[initialIndex];
    if (initialDetailItem) {
      // Show only the initial detail view item
      initialDetailItem.style.display = displayValue;
    } else {
      // Show the first detail view item
      if (detailItems[0]) {
        detailItems[0].style.display = displayValue;
      }
    }

    // Set up click handlers on preview elements within the container scope
    const previewElements = scope.querySelectorAll<HTMLElement>(`[${previewIdAttribute}]`);

    previewElements.forEach((element) => {
      if (element) {
        element.addEventListener('click', handleClick);
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

/**
 * Automatically initializes preview detail switchers for all containers matching the selector.
 * Useful for initializing multiple instances on the same page.
 * @param containerSelector - Selector for container elements (e.g., '.preview-detail-switcher-container')
 * @param options - Configuration options for each preview detail switcher instance
 */
export function initPreviewDetailSwitchers(
  containerSelector: string,
  options: Omit<PreviewDetailSwitcherOptions, 'container'> = {},
): void {
  const init = (): void => {
    const containers = document.querySelectorAll<HTMLElement>(containerSelector);
    containers.forEach((container) => {
      if (container) {
        initPreviewDetailSwitcher({
          ...options,
          container,
        });
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
