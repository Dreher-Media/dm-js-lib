# Preview Detail Switcher Module

A standalone module for switching between preview and detail views. Only one detail group is shown at a time, and clicking preview buttons selects which detail group to display. Multiple detail items can share the same `detail-id`; they form a group and are shown together.

## What It Does

This module creates an interactive interface where users can click preview elements to show corresponding detail views. It's perfect for product galleries, portfolio showcases, or any scenario where you need to switch between preview and detailed content.

## Usage

### Basic Setup

**HTML Structure:**

```html
<div class="preview-detail-container">
  <!-- Preview buttons -->
  <button data-preview-id="item1">Preview 1</button>
  <button data-preview-id="item2">Preview 2</button>
  <button data-preview-id="item3">Preview 3</button>

  <!-- Detail views -->
  <div data-detail-item data-detail-id="item1">
    <h2>Detail View 1</h2>
    <p>Content for item 1</p>
  </div>
  <div data-detail-item data-detail-id="item2">
    <h2>Detail View 2</h2>
    <p>Content for item 2</p>
  </div>
  <div data-detail-item data-detail-id="item3">
    <h2>Detail View 3</h2>
    <p>Content for item 3</p>
  </div>
</div>
```

**JavaScript:**

```javascript
// Initialize with default options
initPreviewDetailSwitcher({
  container: '.preview-detail-container',
});
```

### Custom Options

```javascript
initPreviewDetailSwitcher({
  container: '.preview-detail-container',
  itemSelector: '[data-detail-item]', // Selector for detail items
  previewIdAttribute: 'data-preview-id', // Attribute on preview buttons
  detailIdAttribute: 'data-detail-id', // Attribute on detail items
  initialIndex: 0, // Which item to show initially
  displayValue: 'block', // CSS display value
});
```

### Multiple Instances

Initialize multiple switchers on the same page:

```javascript
// Initialize all containers with class 'switcher'
initPreviewDetailSwitchers('.switcher', {
  itemSelector: '[data-detail-item]',
  initialIndex: 0,
});
```

## Options

| Option               | Type                    | Default                | Description                                          |
| -------------------- | ----------------------- | ---------------------- | ---------------------------------------------------- |
| `container`          | `HTMLElement \| string` | `document`             | Container element or selector to scope this instance |
| `itemSelector`       | `string`                | `'[data-detail-item]'` | Selector for detail view items                       |
| `previewIdAttribute` | `string`                | `'data-preview-id'`    | Attribute name on preview elements                   |
| `detailIdAttribute`  | `string`                | `'data-detail-id'`     | Attribute name on detail view elements               |
| `initialIndex`       | `number`                | `0`                    | Index of the item to show initially (0-based)        |
| `displayValue`       | `string`                | `'block'`              | CSS display value to use when showing items          |

## How It Works

1. The module finds all detail items within the container
2. Hides all detail items initially
3. Determines the detail group from the item at `initialIndex` (or the first item if the index is invalid) and shows every item sharing that `detail-id`
4. Sets up click handlers on preview elements
5. When a preview is clicked, it hides all detail items and shows every item whose `detail-id` matches the clicked preview's `preview-id`

## Examples

### Product Gallery

```html
<div class="product-gallery">
  <div class="product-previews">
    <img src="product1.jpg" data-preview-id="product1" alt="Product 1" />
    <img src="product2.jpg" data-preview-id="product2" alt="Product 2" />
  </div>

  <div class="product-details">
    <div data-detail-item data-detail-id="product1">
      <h3>Product 1</h3>
      <p>Description and details for product 1</p>
    </div>
    <div data-detail-item data-detail-id="product2">
      <h3>Product 2</h3>
      <p>Description and details for product 2</p>
    </div>
  </div>
</div>
```

### Portfolio Showcase

```html
<div class="portfolio">
  <nav>
    <a href="#" data-preview-id="project1">Project 1</a>
    <a href="#" data-preview-id="project2">Project 2</a>
  </nav>

  <section>
    <article data-detail-item data-detail-id="project1">
      <!-- Project 1 content -->
    </article>
    <article data-detail-item data-detail-id="project2">
      <!-- Project 2 content -->
    </article>
  </section>
</div>
```

## Standalone Usage

This module is available as a standalone script:

```html
<script src="https://cdn.jsdelivr.net/npm/@dreher-media/dm-js-lib@latest/dist/standalone/previewDetailSwitcher.min.js"></script>
<script>
  // Use the global function
  PreviewDetailSwitcher.initPreviewDetailSwitcher({
    container: '.my-container',
  });
</script>
```

## Notes

- Only one detail group is visible at a time
- Multiple detail items can share the same `detail-id` — they are shown and hidden together as a group
- The module automatically handles DOM ready state
- Multiple instances can coexist on the same page
- Preview and detail IDs must match for the switcher to work
- The module uses inline styles for show/hide (display property)

### Grouped Detail Items

Give several detail items the same `data-detail-id` to show them simultaneously when the matching preview is clicked:

```html
<div class="preview-detail-container">
  <button data-preview-id="item1">Preview 1</button>
  <button data-preview-id="item2">Preview 2</button>

  <!-- Both items share detail-id "item1" → shown together -->
  <div data-detail-item data-detail-id="item1">Detail 1a</div>
  <div data-detail-item data-detail-id="item1">Detail 1b</div>

  <div data-detail-item data-detail-id="item2">Detail 2</div>
</div>
```
