export type PaginationMode = 'numbers' | 'load-more' | 'infinite';
export type PaginationAnimationEngine = 'js' | 'css';
export type PaginationAnimationStyle = 'fade' | 'slide-up' | 'slide-left' | 'scale' | 'none';
export type PaginationAnimationScope = 'list' | 'items' | 'both';

export interface PaginationElements {
  list: HTMLElement;
  items: HTMLElement[];
  controls: {
    prev: HTMLElement[];
    next: HTMLElement[];
    first: HTMLElement[];
    last: HTMLElement[];
    loadMore: HTMLElement[];
  };
  status: {
    currentPage: HTMLElement[];
    totalPages: HTMLElement[];
    totalItems: HTMLElement[];
    visibleItems: HTMLElement[];
  };
  sentinel?: HTMLElement | null;
}

export interface PaginationOptions {
  mode: PaginationMode;
  pageSize: number;
  firstPageSize?: number;
  startPage: number;
  urlKey?: string;
  persistKey?: string;
  infiniteOffset?: number;
  hideLoadMoreWhenComplete?: boolean;
  animate: boolean;
  animationEngine: PaginationAnimationEngine;
  animationStyle: PaginationAnimationStyle;
  animationScope: PaginationAnimationScope;
  animationDuration: number;
  animationStagger: number;
  animationEasing: string;
}

export interface PaginationInstanceState {
  id: string;
  elements: PaginationElements;
  options: PaginationOptions;
  currentPage: number;
  totalPages: number;
  observer?: IntersectionObserver;
  animationToken?: number;
  activeAnimations?: Animation[];
}
