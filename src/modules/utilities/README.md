# Utilities Module

A collection of small utility functions for common website tasks. This module combines four simple utilities that work automatically with minimal setup.

## What's Included

This module provides four utilities:

1. **Active Link** - Automatically highlights active navigation links
2. **File Download** - Enables file downloads from any element
3. **Separators** - Automatically inserts separators between elements
4. **Webflow Init** - Webflow-specific initialization tasks

---

## Active Link

Automatically highlights the active navigation link based on the current page URL.

### What It Does

This utility automatically adds the `w--current` class to navigation links that match the current page, making it easy to style active navigation items.

### Usage

No setup required! The utility works automatically on all `<a>` tags with `href` attributes.

**Example:**
```html
<nav>
  <a href="/">Home</a>
  <a href="/about">About</a>
  <a href="/contact">Contact</a>
</nav>
```

When you're on the `/about` page, the About link will automatically get the `w--current` class.

**Styling:**
```css
a.w--current {
  font-weight: bold;
  color: #007bff;
}
```

**Notes:**
- Only same-origin links are considered (external links are ignored)
- Hash links (`#anchor`) and JavaScript links are skipped
- The utility normalizes paths, so `/about` and `/about.html` are treated the same

---

## File Download

Enables file downloads by clicking on any element, not just links.

### What It Does

This utility allows you to trigger file downloads from any element (buttons, divs, images, etc.) by adding a simple data attribute.

### Usage

**Basic Download:**
```html
<button data-download-href="/files/document.pdf">
  Download PDF
</button>
```

**Custom Filename:**
```html
<button 
  data-download-href="/files/document.pdf"
  data-download-filename="my-custom-name.pdf">
  Download with Custom Name
</button>
```

**Examples:**
```html
<!-- Download Button -->
<a href="#" class="button" data-download-href="/files/report.pdf">
  Download Report
</a>

<!-- Image as Download Trigger -->
<img 
  src="/images/download-icon.png" 
  data-download-href="/files/brochure.pdf"
  alt="Download brochure"
  style="cursor: pointer;">

<!-- Card with Download -->
<div class="card" data-download-href="/files/presentation.pptx">
  <h3>Presentation</h3>
  <p>Click anywhere on this card to download</p>
</div>
```

**Notes:**
- Works with any file type (PDF, images, documents, etc.)
- If no filename is specified, the filename is extracted from the URL
- The download happens in the browser - no page navigation occurs

---

## Separators

Automatically inserts separator text between child elements.

### What It Does

This utility dynamically adds separator text (like commas, slashes, or custom text) between child elements, making it perfect for breadcrumbs, tag lists, or any list that needs visual separation.

### Usage

Add the `data-separator` attribute to a container element:

```html
<div data-separator=",">
  <span>Item 1</span>
  <span>Item 2</span>
  <span>Item 3</span>
</div>
```

This will render as: `Item 1 , Item 2 , Item 3`

**Common Examples:**

**Breadcrumbs:**
```html
<nav data-separator="/">
  <a href="/">Home</a>
  <a href="/products">Products</a>
  <a href="/products/item">Item</a>
</nav>
```

**Tag List:**
```html
<div data-separator=", ">
  <span>JavaScript</span>
  <span>TypeScript</span>
  <span>React</span>
</div>
```

**Pipe Separators:**
```html
<div data-separator=" | ">
  <a href="/about">About</a>
  <a href="/contact">Contact</a>
  <a href="/blog">Blog</a>
</div>
```

**Notes:**
- Only direct children are processed (nested elements are ignored)
- The separator is wrapped in non-breaking spaces (`&nbsp;`) for proper spacing
- Works with any HTML elements as children

---

## Webflow Init

Handles Webflow-specific initialization tasks.

### What It Does

This utility performs automatic initialization tasks for Webflow websites, such as updating copyright years.

### Usage

**Automatic Copyright Year:**

Simply add the `copyright-year` class to any element:

```html
<p>&copy; <span class="copyright-year">2024</span> Your Company</p>
```

The year will automatically update to the current year when the page loads.

**Requirements:**
- Requires Webflow to be loaded on your page
- It will only run if `window.Webflow` is available

---

## Summary

All utilities in this module work automatically - just include the library and they'll initialize on page load. No configuration or JavaScript coding required!
