/**
 * Accordion Module
 * Standalone-first accordion behavior with optional item wrappers.
 */

type AccordionMode = 'single' | 'multi';
type TriggerAction = 'toggle' | 'open' | 'close';

interface AccordionItem {
  container: HTMLElement;
  itemElement: HTMLElement;
  triggers: HTMLElement[];
  panel: HTMLElement;
  mode: AccordionMode;
  duration: number;
  easing: string;
  scopeKey: string;
  isAnimating: boolean;
  isOpen: boolean;
}

const CONTAINER_SELECTOR = '[data-accordion]';
const ITEM_SELECTOR = '[data-accordion-item]';
const TRIGGER_SELECTOR = '[data-accordion-trigger]';
const PANEL_SELECTOR = '[data-accordion-panel]';
const REMOTE_TRIGGER_SELECTOR = '[data-accordion-remote], [data-accordion-remote-item]';

let containerCounter = 0;
let panelCounter = 0;

const accordionItemsByScope = new Map<string, AccordionItem[]>();
const panelTransitionHandlers = new WeakMap<HTMLElement, (event: TransitionEvent) => void>();
const panelAnimationFrameIds = new WeakMap<HTMLElement, number>();
const panelBasePaddingTop = new WeakMap<HTMLElement, string>();
const panelBasePaddingBottom = new WeakMap<HTMLElement, string>();
const accordionItemsByContainerRemote = new Map<string, AccordionItem[]>();
const accordionItemByRemoteItem = new Map<string, AccordionItem>();

function toNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function getMode(container: HTMLElement): AccordionMode {
  const mode = container.dataset.accordionMode;
  return mode === 'single' ? 'single' : 'multi';
}

function getTriggerAction(trigger: HTMLElement): TriggerAction {
  const action = trigger.dataset.accordionAction;
  if (action === 'open' || action === 'close') {
    return action;
  }

  return 'toggle';
}

function getScopeKey(container: HTMLElement): string {
  const explicitGroup = container.dataset.accordionGroup?.trim();
  if (explicitGroup) {
    return `group:${explicitGroup}`;
  }

  if (!container.dataset.accordionUid) {
    containerCounter += 1;
    container.dataset.accordionUid = `accordion-${containerCounter}`;
  }

  return `container:${container.dataset.accordionUid}`;
}

function getItemGroups(
  container: HTMLElement,
): Array<{ itemElement: HTMLElement; triggers: HTMLElement[]; panel: HTMLElement }> {
  const wrappedItems = Array.from(container.querySelectorAll(ITEM_SELECTOR));
  if (wrappedItems.length > 0) {
    return wrappedItems
      .map((item) => {
        const triggers = Array.from(item.querySelectorAll(TRIGGER_SELECTOR)) as HTMLElement[];
        const panel = item.querySelector(PANEL_SELECTOR) as HTMLElement | null;
        if (!panel || triggers.length === 0) {
          return null;
        }

        return { itemElement: item as HTMLElement, triggers, panel };
      })
      .filter(
        (
          value,
        ): value is { itemElement: HTMLElement; triggers: HTMLElement[]; panel: HTMLElement } =>
          value !== null,
      );
  }

  // Standalone mode: one dropdown per container.
  // Multiple dropdowns must use explicit data-accordion-item wrappers.
  const triggers = Array.from(container.querySelectorAll(TRIGGER_SELECTOR)) as HTMLElement[];
  const panel = container.querySelector(PANEL_SELECTOR) as HTMLElement | null;

  if (!panel || triggers.length === 0) {
    return [];
  }

  return [{ itemElement: container, triggers, panel }];
}

function registerRemoteTargets(item: AccordionItem): void {
  const containerRemoteKey = item.container.dataset.accordionRemote?.trim();
  if (containerRemoteKey) {
    const existing = accordionItemsByContainerRemote.get(containerRemoteKey) ?? [];
    accordionItemsByContainerRemote.set(containerRemoteKey, [...existing, item]);
  }

  const itemRemoteKey =
    item.itemElement.dataset.accordionRemoteItem?.trim() ??
    item.panel.dataset.accordionRemoteItem?.trim();
  if (itemRemoteKey) {
    accordionItemByRemoteItem.set(itemRemoteKey, item);
  }
}

function preparePanel(item: { panel: HTMLElement; duration: number; easing: string }): void {
  const { panel, duration, easing } = item;
  const computed = window.getComputedStyle(panel);
  panelBasePaddingTop.set(panel, computed.paddingTop);
  panelBasePaddingBottom.set(panel, computed.paddingBottom);
  panel.style.overflow = 'hidden';
  panel.style.boxSizing = 'border-box';
  panel.style.transition = `height ${duration}ms ${easing}, padding-top ${duration}ms ${easing}, padding-bottom ${duration}ms ${easing}`;
  // Default accordion baseline: collapsed until explicitly opened.
  panel.style.height = '0px';
  panel.style.paddingTop = '0px';
  panel.style.paddingBottom = '0px';
  panel.style.visibility = 'hidden';
  panel.style.pointerEvents = 'none';
}

function getPanelPadding(panel: HTMLElement): { top: string; bottom: string } {
  return {
    top: panelBasePaddingTop.get(panel) ?? '0px',
    bottom: panelBasePaddingBottom.get(panel) ?? '0px',
  };
}

function clearPanelAnimation(panel: HTMLElement): void {
  const existingHandler = panelTransitionHandlers.get(panel);
  if (existingHandler) {
    panel.removeEventListener('transitionend', existingHandler);
    panelTransitionHandlers.delete(panel);
  }

  const frameId = panelAnimationFrameIds.get(panel);
  if (frameId !== undefined) {
    cancelAnimationFrame(frameId);
    panelAnimationFrameIds.delete(panel);
  }
}

function onHeightTransitionEnd(item: AccordionItem, onDone: () => void): void {
  const { panel } = item;
  clearPanelAnimation(panel);

  const handler = (event: TransitionEvent) => {
    if (event.propertyName !== 'height') {
      return;
    }

    clearPanelAnimation(panel);
    onDone();
  };

  panelTransitionHandlers.set(panel, handler);
  panel.addEventListener('transitionend', handler);
}

function ensurePanelId(panel: HTMLElement): string {
  if (!panel.id) {
    panelCounter += 1;
    panel.id = `dm-accordion-panel-${panelCounter}`;
  }

  return panel.id;
}

function setAria(item: AccordionItem, isOpen: boolean): void {
  item.triggers.forEach((trigger) => {
    trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
  item.panel.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
}

function syncTriggerVisibility(item: AccordionItem, openStateOverride?: boolean): void {
  const isOpen = openStateOverride ?? item.isOpen;
  item.triggers.forEach((trigger) => {
    const action = getTriggerAction(trigger);

    if (action === 'open') {
      trigger.style.display = isOpen ? 'none' : '';
      return;
    }

    if (action === 'close') {
      trigger.style.display = isOpen ? '' : 'none';
      return;
    }

    trigger.style.display = '';
  });
}

function finalizeOpen(item: AccordionItem): void {
  const { top, bottom } = getPanelPadding(item.panel);
  item.panel.style.height = `${item.panel.scrollHeight}px`;
  item.panel.style.paddingTop = top;
  item.panel.style.paddingBottom = bottom;
  item.panel.style.visibility = 'visible';
  item.panel.style.pointerEvents = '';
  item.panel.classList.add('active');
  item.triggers.forEach((trigger) => {
    trigger.classList.add('active');
  });
  item.isAnimating = false;
  item.isOpen = true;
  setAria(item, true);
  syncTriggerVisibility(item);
}

function finalizeClose(item: AccordionItem): void {
  item.panel.style.height = '0px';
  item.panel.style.paddingTop = '0px';
  item.panel.style.paddingBottom = '0px';
  item.panel.style.visibility = 'hidden';
  item.panel.style.pointerEvents = 'none';
  item.panel.classList.remove('active');
  item.triggers.forEach((trigger) => {
    trigger.classList.remove('active');
  });
  item.isAnimating = false;
  item.isOpen = false;
  setAria(item, false);
  syncTriggerVisibility(item);
}

function openItem(item: AccordionItem, instant = false): void {
  const { panel } = item;
  const { top, bottom } = getPanelPadding(panel);

  if (item.isOpen && !item.isAnimating) {
    return;
  }

  item.isAnimating = true;
  clearPanelAnimation(panel);
  panel.classList.add('active');
  item.triggers.forEach((trigger) => {
    trigger.classList.add('active');
  });
  panel.style.visibility = 'visible';
  panel.style.pointerEvents = '';
  // Switch dedicated open/close controls at animation start.
  syncTriggerVisibility(item, true);

  if (instant) {
    panel.style.paddingTop = top;
    panel.style.paddingBottom = bottom;
    panel.style.height = `${panel.scrollHeight}px`;
    panel.classList.add('active');
    item.triggers.forEach((trigger) => {
      trigger.classList.add('active');
    });
    item.isAnimating = false;
    item.isOpen = true;
    setAria(item, true);
    syncTriggerVisibility(item);
    return;
  }

  // Always start opening animation from a collapsed state.
  panel.style.paddingTop = '0px';
  panel.style.paddingBottom = '0px';
  panel.style.height = '0px';
  // Ensure browser applies start height before target height.
  void panel.offsetHeight;
  panel.style.paddingTop = top;
  panel.style.paddingBottom = bottom;
  const targetHeight = panel.scrollHeight;

  if (targetHeight <= 0) {
    finalizeOpen(item);
    return;
  }

  onHeightTransitionEnd(item, () => {
    finalizeOpen(item);
  });

  const frameId = requestAnimationFrame(() => {
    panel.style.height = `${targetHeight}px`;
  });
  panelAnimationFrameIds.set(panel, frameId);
}

function closeItem(item: AccordionItem, instant = false): void {
  const { panel } = item;
  const { top, bottom } = getPanelPadding(panel);

  if (!item.isOpen && !item.isAnimating) {
    return;
  }

  item.isAnimating = true;
  clearPanelAnimation(panel);
  panel.classList.remove('active');
  item.triggers.forEach((trigger) => {
    trigger.classList.remove('active');
  });
  // Switch dedicated open/close controls at animation start.
  syncTriggerVisibility(item, false);

  if (instant) {
    finalizeClose(item);
    return;
  }

  panel.style.visibility = 'visible';
  panel.style.pointerEvents = '';
  panel.style.paddingTop = top;
  panel.style.paddingBottom = bottom;
  const currentHeight = panel.getBoundingClientRect().height;
  const startHeight = currentHeight > 0 ? currentHeight : panel.scrollHeight;
  panel.style.height = `${startHeight}px`;
  // Ensure browser applies start height before collapsing.
  void panel.offsetHeight;

  if (startHeight <= 0) {
    finalizeClose(item);
    return;
  }

  onHeightTransitionEnd(item, () => {
    finalizeClose(item);
  });

  const frameId = requestAnimationFrame(() => {
    panel.style.height = '0px';
    panel.style.paddingTop = '0px';
    panel.style.paddingBottom = '0px';
  });
  panelAnimationFrameIds.set(panel, frameId);
}

function toggleItem(item: AccordionItem): void {
  if (item.mode === 'single' && !item.isOpen) {
    const scopedItems = accordionItemsByScope.get(item.scopeKey) ?? [];
    scopedItems.forEach((scopedItem) => {
      if (scopedItem !== item) {
        closeItem(scopedItem);
      }
    });
  }

  if (item.isOpen) {
    closeItem(item);
    return;
  }

  openItem(item);
}

function executeTriggerAction(item: AccordionItem, action: TriggerAction): void {
  if (action === 'close') {
    closeItem(item);
    return;
  }

  if (action === 'open') {
    if (item.mode === 'single') {
      const scopedItems = accordionItemsByScope.get(item.scopeKey) ?? [];
      scopedItems.forEach((scopedItem) => {
        if (scopedItem !== item) {
          closeItem(scopedItem);
        }
      });
    }
    openItem(item);
    return;
  }

  toggleItem(item);
}

function executeContainerRemoteAction(items: AccordionItem[], action: TriggerAction): void {
  if (items.length === 0) {
    return;
  }

  const mode = items[0].mode;

  if (mode === 'single') {
    const targetItem = items[0];
    executeTriggerAction(targetItem, action);
    return;
  }

  if (action === 'close') {
    items.forEach((item) => {
      closeItem(item);
    });
    return;
  }

  if (action === 'open') {
    items.forEach((item) => {
      openItem(item);
    });
    return;
  }

  const hasOpenItem = items.some((item) => item.isOpen);
  if (hasOpenItem) {
    items.forEach((item) => {
      closeItem(item);
    });
    return;
  }

  items.forEach((item) => {
    openItem(item);
  });
}

function bindRemoteTrigger(trigger: HTMLElement): void {
  if (trigger.dataset.accordionRemoteBound === 'true') {
    return;
  }
  trigger.dataset.accordionRemoteBound = 'true';

  const runRemoteAction = (event: Event) => {
    event.preventDefault();
    const action = getTriggerAction(trigger);

    const remoteItemKey = trigger.dataset.accordionRemoteItem?.trim();
    if (remoteItemKey) {
      const item = accordionItemByRemoteItem.get(remoteItemKey);
      if (item) {
        executeTriggerAction(item, action);
      }
      return;
    }

    const remoteContainerKey = trigger.dataset.accordionRemote?.trim();
    if (!remoteContainerKey) {
      return;
    }

    const items = accordionItemsByContainerRemote.get(remoteContainerKey) ?? [];
    executeContainerRemoteAction(items, action);
  };

  trigger.addEventListener('click', runRemoteAction);
  trigger.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Space') {
      runRemoteAction(event);
    }
  });
}

function updateActionTriggerVisibilityForScope(scopeKey: string): void {
  const scopedItems = accordionItemsByScope.get(scopeKey) ?? [];
  scopedItems.forEach((item) => {
    syncTriggerVisibility(item);
  });
}

function initializeAccordionContainer(container: HTMLElement): void {
  if (container.dataset.accordionInitialized === 'true') {
    return;
  }

  container.dataset.accordionInitialized = 'true';
  const mode = getMode(container);
  const duration = toNumber(container.dataset.accordionDuration, 300);
  const easing = container.dataset.accordionEasing ?? 'ease';
  const scopeKey = getScopeKey(container);
  const groups = getItemGroups(container);

  if (groups.length === 0) {
    return;
  }

  const items: AccordionItem[] = groups.map(({ itemElement, triggers, panel }) => {
    preparePanel({
      panel,
      duration,
      easing,
    });

    const panelId = ensurePanelId(panel);
    panel.setAttribute('role', 'region');
    triggers.forEach((trigger) => {
      trigger.setAttribute('aria-controls', panelId);

      if (trigger.tagName !== 'BUTTON') {
        trigger.setAttribute('role', 'button');
        if (!trigger.hasAttribute('tabindex')) {
          trigger.setAttribute('tabindex', '0');
        }
      }
    });

    const isInitiallyOpen =
      triggers.some(
        (trigger) =>
          trigger.classList.contains('active') || trigger.getAttribute('aria-expanded') === 'true',
      ) ||
      panel.classList.contains('active') ||
      panel.getAttribute('aria-hidden') === 'false';

    const item: AccordionItem = {
      container,
      itemElement,
      triggers,
      panel,
      mode,
      duration,
      easing,
      scopeKey,
      isAnimating: false,
      isOpen: false,
    };

    if (isInitiallyOpen) {
      openItem(item, true);
    } else {
      closeItem(item, true);
    }

    triggers.forEach((trigger) => {
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        executeTriggerAction(item, getTriggerAction(trigger));
      });

      trigger.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ' || event.key === 'Space') {
          event.preventDefault();
          executeTriggerAction(item, getTriggerAction(trigger));
        }
      });
    });

    return item;
  });

  const existingItems = accordionItemsByScope.get(scopeKey) ?? [];
  accordionItemsByScope.set(scopeKey, [...existingItems, ...items]);
  items.forEach((item) => {
    registerRemoteTargets(item);
  });

  if (mode === 'single') {
    let foundOpen = false;
    const scopedItems = accordionItemsByScope.get(scopeKey) ?? [];
    scopedItems.forEach((item) => {
      if (item.isOpen && !foundOpen) {
        foundOpen = true;
        return;
      }
      if (item.isOpen) {
        closeItem(item, true);
      }
    });
  }

  updateActionTriggerVisibilityForScope(scopeKey);
}

/**
 * Initializes accordion behavior for elements using data attributes.
 */
export function initAccordion(): void {
  const runInit = () => {
    accordionItemsByScope.clear();
    accordionItemsByContainerRemote.clear();
    accordionItemByRemoteItem.clear();

    document.querySelectorAll(CONTAINER_SELECTOR).forEach((container) => {
      initializeAccordionContainer(container as HTMLElement);
    });

    document.querySelectorAll(REMOTE_TRIGGER_SELECTOR).forEach((trigger) => {
      bindRemoteTrigger(trigger as HTMLElement);
    });
  };

  document.addEventListener('DOMContentLoaded', runInit);

  // Handle late script execution when DOM is already available.
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    runInit();
  }
}
