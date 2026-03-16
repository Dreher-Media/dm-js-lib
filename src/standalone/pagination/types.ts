export type PaginationMode = "numbers" | "load-more" | "infinite";

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
}

export interface PaginationInstanceState {
  id: string;
  elements: PaginationElements;
  options: PaginationOptions;
  currentPage: number;
  totalPages: number;
  observer?: IntersectionObserver;
}
