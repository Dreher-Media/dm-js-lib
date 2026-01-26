/**
 * Filter Module - Type Definitions
 */

export interface FilterCache {
  listElement: HTMLElement;
  items: HTMLElement[];
  controls: HTMLElement[];
  countElements: HTMLElement[];
  emptyElement: HTMLElement | null;
  loadingElement: HTMLElement | null;
  lastUpdate: number;
}
