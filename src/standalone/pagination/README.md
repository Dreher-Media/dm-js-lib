# Pagination Module

Client-side pagination for generic DOM lists. Inspired by Finsweet-style list controls, but designed to work with any HTML output (including your own CMS), and to integrate cleanly with the existing `filter` standalone module.

> **Note:** This is a standalone module. It's not included in the main library bundle and must be loaded separately.
>
> **Auto-initialization:** The pagination module automatically initializes when the DOM is ready. Manual initialization is optional.

## What It Does

This module paginates a list of items in the browser. It supports:

- **Numbered pagination** – classic pages with previous/next/first/last and numbered buttons.
- **Load more** – progressively reveals more items when a button is clicked.
- **Infinite scroll** – automatically loads more items as the user scrolls near the end.

It works on any DOM list (e.g. `ul`, `div`, `section`) and is driven entirely by `data-` attributes.

## Basic Usage

### 1. Mark Your List

Add `data-pagination-list` to the container whose children should be paginated:

```html
<ul data-pagination-list data-pagination-page-size="9">
  <li>Item 1</li>
  <li>Item 2</li>
  <li>Item 3</li>
  <!-- ...more items... -->
</ul>
```

By default, all **direct children** of the list are treated as items. You can also mark specific items with `data-pagination-item`:

```html
<div data-pagination-list>
  <div data-pagination-item>Item 1</div>
  <div data-pagination-item>Item 2</div>
  <div class="pagination-exclude">Static header (never paginated)</div>
</div>
```

- Elements with `.pagination-exclude` are **never** paginated.

### 2. Choose a Mode

Set the mode on the list or on a wrapper via `data-pagination-mode`:

```html
<!-- Numbered pagination (default) -->
<div data-pagination-instance="projects" data-pagination-mode="numbers">
  <ul data-pagination-list>
    <!-- items -->
  </ul>

  <!-- Controls -->
  <nav aria-label="Projects pagination">
    <button data-pagination-control="prev">Previous</button>
    <button data-pagination-page="1">1</button>
    <button data-pagination-page="2">2</button>
    <button data-pagination-control="next">Next</button>
  </nav>
</div>
```

Available modes:

- `numbers` (default)
- `load-more`
- `infinite`

```html
<!-- Load more -->
<div data-pagination-mode="load-more">
  <ul data-pagination-list data-pagination-page-size="6">
    <!-- items -->
  </ul>

  <button data-pagination-control="load-more">
    Load more
  </button>
</div>
```

```html
<!-- Infinite scroll -->
<div data-pagination-mode="infinite">
  <ul data-pagination-list data-pagination-page-size="6">
    <!-- items -->
  </ul>

  <!-- Optional sentinel (falls back to load-more button if present) -->
  <div data-pagination-sentinel></div>
</div>
```

### 3. Add Status Elements (Optional)

You can show pagination status using data attributes:

```html
<p>
  Page <span data-pagination-current-page>1</span>
  of <span data-pagination-total-pages>1</span>,
  showing <span data-pagination-visible-items>0</span>
  of <span data-pagination-total-items>0</span> items
</p>
```

These values are kept in sync automatically.

## Attributes Reference

### Instances & Scoping

Use `data-pagination-instance` to support multiple independent paginations on one page:

```html
<section data-pagination-instance="projects">
  <ul data-pagination-list>...</ul>
  <!-- controls/status automatically scoped to this instance -->
</section>

<section data-pagination-instance="articles">
  <ul data-pagination-list>...</ul>
</section>
```

Rules:

- The instance for any element is resolved from:
  1. Its own `data-pagination-instance`, or
  2. The closest ancestor with `data-pagination-instance`, or
  3. The default instance `"default"`.

### List & Items

| Attribute | Where | Description |
|----------|-------|-------------|
| `data-pagination-list` | List container | Marks the list whose children are paginated |
| `data-pagination-item` | Item elements | Explicitly marks an element as a paginated item |
| `.pagination-exclude` | Item elements | Excluded from pagination (never counted or hidden) |

If no `data-pagination-item` elements are found inside the list, **all direct children** of the list are treated as items.

Items hidden by the `filter` module via `.filter-hidden` are automatically excluded from pagination.

### Modes & Page Size

| Attribute | Values | Default | Description |
|----------|--------|---------|-------------|
| `data-pagination-mode` | `"numbers"`, `"load-more"`, `"infinite"` | `"numbers"` | Pagination mode |
| `data-pagination-page-size` | positive integer | `12` | Number of items per page |
| `data-pagination-first-page-size` | positive integer | _(unset)_ | Number of items on page 1 (defaults to `data-pagination-page-size`) |
| `data-pagination-start-page` | positive integer | `1` | Initial page (before URL/storage overrides) |
| `data-pagination-hide-load-more-when-complete` | `"true"`, `"false"` | `"true"` | Hide the load-more button when everything is visible |

Can be set on the list or on an ancestor with `data-pagination-instance`.

### Controls

| Attribute | Values | Description |
|----------|--------|-------------|
| `data-pagination-control` | `"prev"` | Go to previous page |
| `data-pagination-control` | `"next"` | Go to next page |
| `data-pagination-control` | `"first"` | Go to first page |
| `data-pagination-control` | `"last"` | Go to last page |
| `data-pagination-control` | `"load-more"` | Load next page (load-more / infinite only) |
| `data-pagination-page` | integer | Go to specific page (numbered mode) |

Behavior:

- Controls are automatically **scoped to their instance** using `data-pagination-instance` resolution.
- Current page button gets:
  - `.pagination-active` and `.is-active` classes
  - `aria-current="page"`
- Disabled controls get:
  - `.pagination-disabled` and `.is-disabled` classes
  - `aria-disabled="true"`
- In numbered mode, `prev` is hidden on the first page and `next` is hidden on the last page.

For `load-more`:

- When no more pages are available, the button is disabled and receives `data-pagination-complete="true"`.
- By default, the button is hidden (`display: none`) once complete. Set `data-pagination-hide-load-more-when-complete="false"` to keep it visible (disabled).

### Infinite Scroll

| Attribute | Values | Default | Description |
|----------|--------|---------|-------------|
| `data-pagination-sentinel` | element | — | Element observed by `IntersectionObserver` to trigger loading the next page |
| `data-pagination-infinite-offset` | number (0–1) | `0.5` | Observer threshold; smaller loads earlier |

If no sentinel is found, the module will observe the `load-more` button (if present).

### Status / Meta

| Attribute | Description |
|----------|-------------|
| `data-pagination-current-page` | Displays current page number |
| `data-pagination-total-pages` | Displays total pages |
| `data-pagination-total-items` | Displays total number of items (after filter) |
| `data-pagination-visible-items` | Displays currently visible item count |

### URL & Persistence

| Attribute | Values | Description |
|----------|--------|-------------|
| `data-pagination-url` | `"true"` | Sync current page to URL query string (`page_<instance>` key) |
| `data-pagination-persist` | string key | Persist current page to `localStorage` (`pagination_<key>`) |

Order of precedence for the initial page:

1. `localStorage` (`data-pagination-persist`)
2. URL query string (`data-pagination-url`)
3. `data-pagination-start-page`

## Integration with Filter Module

The pagination module is designed to work seamlessly with the `filter` standalone module:

- Items hidden by the filter (`.filter-hidden`) are automatically excluded from pagination.
- When a `filter:change` event fires on a `data-filter-list` that is also a pagination list, pagination:
  - Rebuilds its item list from the DOM.
  - Resets to page 1.
  - Reapplies visibility rules.

Example combined setup:

```html
<div data-filter-instance="projects" data-pagination-instance="projects">
  <!-- Filter controls -->
  <div>
    <input type="checkbox" data-filter-field="category" value="design"> Design
    <input type="checkbox" data-filter-field="category" value="development"> Development
  </div>

  <!-- Status -->
  <p>
    Page <span data-pagination-current-page>1</span>
    of <span data-pagination-total-pages>1</span>,
    showing <span data-pagination-visible-items>0</span>
    of <span data-pagination-total-items>0</span> projects
  </p>

  <!-- Filter + Pagination list -->
  <ul
    data-filter-list
    data-pagination-list
    data-pagination-mode="numbers"
    data-pagination-page-size="12"
  >
    <li data-filter-value="design">Design Project 1</li>
    <li data-filter-value="development">Dev Project 1</li>
    <!-- ... -->
  </ul>

  <!-- Pagination controls -->
  <nav aria-label="Projects pagination">
    <button data-pagination-control="prev">Previous</button>
    <button data-pagination-page="1">1</button>
    <button data-pagination-page="2">2</button>
    <button data-pagination-control="next">Next</button>
  </nav>
</div>
```

## Programmatic API

The module exposes a global `paginationAPI` object and a standalone namespace when loaded from the CDN.

### Global API (`window.paginationAPI`)

```javascript
// Go to a specific page (null = default instance)
paginationAPI.goToPage(null, 2);

// Next / previous
paginationAPI.next(null);
paginationAPI.prev(null);

// Refresh pagination after DOM changes
paginationAPI.refresh(null);

// Read current state
const state = paginationAPI.getState(null);
console.log(state?.currentPage, state?.totalPages);
```

For named instances:

```javascript
paginationAPI.goToPage('projects', 3);
paginationAPI.next('projects');
```

### Standalone Namespace

When loaded via the standalone bundle:

```html
<script src="https://cdn.jsdelivr.net/npm/@dreher-media/dm-js-lib@latest/dist/standalone/pagination.min.js"></script>
<script>
  // Optional: manually initialize (auto-initializes by default)
  Pagination.initPagination();

  // Access the API
  Pagination.paginationAPI.goToPage(null, 2);
</script>
```

The standalone build exposes:

- `Pagination.initPagination()` – manual initialization (auto-init also runs).
- `Pagination.paginationAPI` – same object as `window.paginationAPI`.

## Events

Listen for pagination changes:

```javascript
const list = document.querySelector('[data-pagination-list]');

list?.addEventListener('pagination:change', (event) => {
  const detail = event.detail;
  console.log('Page changed:', detail.currentPage, 'of', detail.totalPages);
});

list?.addEventListener('pagination:end', (event) => {
  console.log('Reached last page', event.detail);
});
```

## Styling

The module adds/toggles classes you can style:

```css
.pagination-hidden {
  display: none;
}

.pagination-active,
.is-active {
  /* Active page button */
}

.pagination-disabled,
.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}
```

You have full control over layout and design; the module only manages classes and attributes.

## Standalone Usage

Include the standalone script from a CDN:

```html
<script src="https://cdn.jsdelivr.net/npm/@dreher-media/dm-js-lib@latest/dist/standalone/pagination.min.js"></script>
```

**Auto-initialization:** Pagination auto-initializes when the DOM is ready.

**Manual initialization (optional):**

```html
<script src="https://cdn.jsdelivr.net/npm/@dreher-media/dm-js-lib@latest/dist/standalone/pagination.min.js"></script>
<script>
  // Optional: re-run initialization (e.g. after injecting new markup)
  Pagination.initPagination();
</script>
```

## Notes

- Works with any HTML structure; your CMS just needs to output the right attributes.
- Designed to be independent of Webflow CMS while still fitting naturally into Webflow-built layouts.
- Integrates with the `filter` standalone module via DOM classes and custom events.
- Safe to call `Pagination.initPagination()` multiple times (subsequent calls refresh existing instances). 

