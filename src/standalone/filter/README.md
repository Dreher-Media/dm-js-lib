# Filter Module

A powerful, flexible filtering system for lists and collections. Filter items by multiple criteria using checkboxes, radio buttons, selects, or search inputs.

> **Note:** This is a standalone module. It's not included in the main library bundle and must be loaded separately.
> 
> **Auto-initialization:** The filter module automatically initializes when the DOM is ready. No manual setup required!

## What It Does

This module enables advanced filtering of list items based on multiple criteria. It supports various filter types, search functionality, URL persistence, localStorage, and more.

## Basic Usage

### 1. Mark Your List

Add `data-filter-list` to the container holding your filterable items:

```html
<ul data-filter-list>
  <li data-filter-field="category" data-filter-value="design">Design Project</li>
  <li data-filter-field="category" data-filter-value="development">Development Project</li>
  <li data-filter-field="category" data-filter-value="marketing">Marketing Project</li>
</ul>
```

### 2. Add Filter Controls

Add `data-filter-field` to your filter controls (checkboxes, radios, selects, inputs):

```html
<div>
  <label>
    <input type="checkbox" data-filter-field="category" value="design">
    Design
  </label>
  <label>
    <input type="checkbox" data-filter-field="category" value="development">
    Development
  </label>
  <label>
    <input type="checkbox" data-filter-field="category" value="marketing">
    Marketing
  </label>
</div>
```

## Filter Types

### Checkboxes (Multiple Selection)

```html
<input type="checkbox" data-filter-field="category" value="design">
```

### Radio Buttons (Single Selection)

```html
<input type="radio" data-filter-field="category" value="design" name="category">
```

### Tab-link Buttons (Single Selection)

Button or link elements can act as radio-style selectors (only one active per group). Add `data-filter-type="radio"` so the filter treats them as a single-choice group. Use the `active` class to indicate the selected option.

```html
<div role="tablist">
  <button type="button" data-filter-field="category" data-filter-type="radio" data-filter-value="design" class="active">Design</button>
  <button type="button" data-filter-field="category" data-filter-type="radio" data-filter-value="development">Development</button>
  <button type="button" data-filter-field="category" data-filter-type="radio" data-filter-value="">All</button>
</div>
```

- Same `data-filter-field` = same group; only one can have `active` at a time.
- Use `data-filter-value=""` (or omit value) for an "All" option that applies no filter for that field.
- Styling is up to you; the module only toggles the `active` class.

### Select Dropdowns

```html
<select data-filter-field="category">
  <option value="">All Categories</option>
  <option value="design">Design</option>
  <option value="development">Development</option>
</select>
```

**Autofill Options (Optional):**

Select dropdowns can automatically populate with all available options from your list items. This must be explicitly enabled:

```html
<!-- Enable autofill to populate with all unique values from list items -->
<select data-filter-field="category" data-filter-autofill="true">
  <!-- Options will be auto-generated -->
</select>
```

The autofill feature:
- Scans all list items for unique values matching the field
- Automatically creates options for each unique value
- Sorts options alphabetically
- Includes an optional "All" option
- Preserves manually added options (won't overwrite them)
- Updates automatically when items are added/removed

**Manual Options (Default):**

By default, select elements use manually defined options:

```html
<select data-filter-field="category">
  <option value="">All Categories</option>
  <option value="design">Design</option>
  <option value="development">Development</option>
</select>
```

**Customize "All" Option:**

```html
<select 
  data-filter-field="category"
  data-filter-all-value=""
  data-filter-all-text="Show All">
  <!-- Auto-generated options with custom "All" option -->
</select>
```

**Disable "All" Option:**

```html
<select 
  data-filter-field="category"
  data-filter-autofill-all="false">
  <!-- Auto-generated options without "All" option -->
</select>
```

**Force Refresh:**

To regenerate options (useful when items are added dynamically):

```html
<select 
  data-filter-field="category"
  data-filter-autofill-refresh="true">
  <!-- Options will be regenerated on each refresh -->
</select>
```

### Search Inputs

```html
<input type="text" data-filter-field="search" placeholder="Search...">
```

## Advanced Features

### Multiple Filter Instances

Use `data-filter-instance` to have multiple independent filters on one page. **You only need it on a parent** (e.g. a wrapper div); the module resolves the instance by walking up the DOM, and finds controls/lists as descendants of that parent. No need to put it on every list and control.

**Override per control or list:** You can set `data-filter-instance` on any individual control or on the list element to override the parent. The instance is resolved from the element first, then from its ancestors, so an attribute on the control/list wins.

```html
<!-- First filter: instance on wrapper is enough -->
<div data-filter-instance="products">
  <ul data-filter-list>...</ul>
  <input data-filter-field="category" value="electronics">
</div>

<!-- Second filter -->
<div data-filter-instance="articles">
  <ul data-filter-list>...</ul>
  <input data-filter-field="category" value="tech">
</div>

<!-- Override: this control belongs to "products" even if moved under "articles" -->
<div data-filter-instance="articles">
  <input data-filter-field="category" data-filter-instance="products" value="tech">
</div>
```

### Search Across Multiple Fields

Use `data-filter-search` to search across multiple fields:

```html
<input 
  type="text" 
  data-filter-field="search" 
  data-filter-search="title,description,tags"
  placeholder="Search...">
```

### Item Count Display

Show total and filtered item counts:

```html
<span data-filter-count>0</span> <!-- Total items -->
<span data-filter-results>0</span> <!-- Filtered items -->
```

### Empty State

Show a message when no results are found:

```html
<div data-filter-empty>
  <p>No items match your filters.</p>
</div>
```

Custom empty message:

```html
<div data-filter-empty data-filter-empty-text="No results found. Try different filters.">
  <!-- Message will be inserted here -->
</div>
```

### Clear Button

Add a button to reset all filters:

```html
<button data-filter-clear>Clear Filters</button>
```

### URL Persistence

Save filter state to URL:

```html
<ul data-filter-list data-filter-url="true">...</ul>
```

Filters will be saved as URL parameters and restored on page load.

### LocalStorage Persistence

Save filter state to browser storage:

```html
<ul data-filter-list data-filter-persist="myFilters">...</ul>
```

### Loading Indicator

Show a loading state during filtering:

```html
<div data-filter-loading>Loading...</div>
```

### Scroll Management

Automatically scroll to top when filtering:

```html
<ul data-filter-list data-filter-scroll="top">...</ul>
```

Or scroll to a specific anchor:

```html
<ul data-filter-list data-filter-scroll="anchor" data-filter-scroll-anchor="#results">...</ul>
```

### Debounce Search

Configure debounce delay for search inputs (default: 300ms):

```html
<input 
  type="text" 
  data-filter-field="search" 
  data-filter-debounce="500"
  placeholder="Search...">
```

## Item Marking

### Using data-filter-field

Mark items with the same field identifier as your controls:

```html
<li data-filter-field="category" data-filter-value="design">Design Project</li>
```

### Using data-filter-value

Provide filterable values directly:

```html
<li data-filter-value="design,ui,web">Design Project</li>
```

Multiple values (comma-separated) allow items to match multiple filters.

## Programmatic API

Control filters via JavaScript:

```javascript
// Set a filter value
filterAPI.setFilter(null, 'category', 'design');

// Clear all filters
filterAPI.clear(null);

// Get active filters
const active = filterAPI.getActiveFilters(null);

// Refresh filter (useful after adding items dynamically)
filterAPI.refresh(null);
// This also refreshes autofill options for select elements
```

For multiple instances:

```javascript
filterAPI.setFilter('products', 'category', 'electronics');
```

## Events

Listen for filter changes:

```javascript
document.querySelector('[data-filter-list]').addEventListener('filter:change', (e) => {
  console.log('Filters changed:', e.detail.filters);
  console.log('Visible items:', e.detail.visibleCount);
});

document.querySelector('[data-filter-list]').addEventListener('filter:empty', (e) => {
  console.log('No results found');
});
```

## Styling

The module adds classes you can style:

```css
.filter-hidden {
  display: none;
}

.filter-active {
  /* Visible items */
}

.filter-loading-active {
  /* Loading state */
}

.filter-empty-active {
  /* Empty state visible */
}
```

## Complete Example

```html
<!-- Filter Controls -->
<div>
  <!-- Autofilled select - options generated automatically -->
  <select data-filter-field="category" data-filter-autofill="true">
    <!-- Options auto-populated from list items -->
  </select>
  
  <input type="checkbox" data-filter-field="status" value="active"> Active
  <input type="text" data-filter-field="search" data-filter-search="title,description" placeholder="Search...">
  <button data-filter-clear>Clear</button>
</div>

<!-- Results Count -->
<p>Showing <span data-filter-results>0</span> of <span data-filter-count>0</span> items</p>

<!-- Filterable List -->
<ul data-filter-list data-filter-url="true" data-filter-persist="projects">
  <li data-filter-value="design,ui" data-filter-field="title">Design Project 1</li>
  <li data-filter-value="development,js" data-filter-field="title">Development Project 1</li>
  <li data-filter-value="design,branding" data-filter-field="title">Design Project 2</li>
</ul>

<!-- Empty State -->
<div data-filter-empty>
  <p>No projects match your filters.</p>
</div>
```

## Standalone Usage

This module is available as a standalone script:

```html
<script src="https://cdn.jsdelivr.net/npm/@dreher-media/dm-js-lib@latest/dist/standalone/filter.min.js"></script>
```

**Auto-initialization:** The filter module automatically initializes when the DOM is ready. No manual initialization needed!

**Manual initialization (optional):** If you need to initialize filters after the DOM is ready (e.g., for dynamically added content), you can call:

```html
<script src="https://cdn.jsdelivr.net/npm/@dreher-media/dm-js-lib@latest/dist/standalone/filter.min.js"></script>
<script>
  // Optional: Manually initialize (useful for dynamic content)
  Filter.initFilter();
  
  // Access the programmatic API
  Filter.filterAPI.setFilter(null, 'category', 'design');
  Filter.filterAPI.clear(null);
</script>
```

The standalone build exposes:
- `Filter.initFilter()` - Manually initialize the filter module (auto-initializes by default)
- `Filter.filterAPI` - Programmatic API for controlling filters

## Autofill Attributes Reference

| Attribute | Values | Description |
|-----------|--------|-------------|
| `data-filter-autofill` | `"true"`, `"false"` (default) | Enable/disable autofill for select elements |
| `data-filter-autofill-all` | `"true"` (default), `"false"` | Include/exclude "All" option in autofilled selects |
| `data-filter-all-value` | string | Value for the "All" option (default: empty string) |
| `data-filter-all-text` | string | Text for the "All" option (default: "All") |
| `data-filter-autofill-refresh` | `"true"`, `"false"` (default) | Force refresh of options on each update |

## Notes

- Filters work with AND logic (all active filters must match)
- Search fields use partial matching
- Checkbox/radio/select fields use exact matching
- The module automatically handles dynamic content via MutationObserver
- Multiple filter instances are completely independent
- Select autofill is disabled by default - enable with `data-filter-autofill="true"` to scan list items for unique values
- Autofill preserves manually added options and won't overwrite them
- This is a standalone module - not included in the main library bundle
