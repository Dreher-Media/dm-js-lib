# Tabs Module

Creates interactive tab interfaces for organizing and switching between content sections.

## What It Does

This module enables tab functionality, allowing users to switch between different content sections. It supports multiple tab groups on a single page and can be controlled via URL parameters.

## Usage

### Basic Tabs

**Tab Links:**
Add the `tab-link` class and specify the target content:

```html
<div class="tabs">
  <a href="#" class="tab-link" data-tab-target="tab1">Tab 1</a>
  <a href="#" class="tab-link" data-tab-target="tab2">Tab 2</a>
  <a href="#" class="tab-link" data-tab-target="tab3">Tab 3</a>
</div>
```

**Tab Content:**
Add `data-tab-content` to content sections:

```html
<div data-tab-content="tab1">
  <h2>Content for Tab 1</h2>
  <p>This is the first tab's content.</p>
</div>

<div data-tab-content="tab2">
  <h2>Content for Tab 2</h2>
  <p>This is the second tab's content.</p>
</div>

<div data-tab-content="tab3">
  <h2>Content for Tab 3</h2>
  <p>This is the third tab's content.</p>
</div>
```

### Attribute-Based Tabs

You can also use the `data-tab-link` attribute instead of classes:

```html
<button data-tab-link="tab1">Tab 1</button>
<button data-tab-link="tab2">Tab 2</button>
```

### Tab Groups

Use `data-tab-group` to create multiple independent tab sets on one page:

```html
<!-- First tab group -->
<div data-tab-group="products">
  <button class="tab-link" data-tab-target="product1" data-tab-group="products">Product 1</button>
  <button class="tab-link" data-tab-target="product2" data-tab-group="products">Product 2</button>
</div>

<div data-tab-content="product1" data-tab-group="products">...</div>
<div data-tab-content="product2" data-tab-group="products">...</div>

<!-- Second tab group -->
<div data-tab-group="features">
  <button class="tab-link" data-tab-target="feature1" data-tab-group="features">Feature 1</button>
  <button class="tab-link" data-tab-target="feature2" data-tab-group="features">Feature 2</button>
</div>
```

### URL Parameters

You can set the active tab via URL:

```
?tab=tab2
```

For tab groups:

```
?tab=product1&tabGroup=products
```

### Auto-Activate First Tab

Add `data-tab-first-active` to automatically activate the first tab in a group:

```html
<div data-tab-group="products" data-tab-first-active>
  <button class="tab-link" data-tab-target="product1">Product 1</button>
  <button class="tab-link" data-tab-target="product2">Product 2</button>
</div>
```

## Styling

Style active tabs:

```css
.tab-link.active {
  background-color: #007bff;
  color: white;
}

[data-tab-content] {
  display: none;
}

[data-tab-content].active {
  display: block;
}
```

## Features

- **Multiple Tab Groups**: Support for multiple independent tab sets on one page
- **URL Control**: Set active tab via URL parameters
- **Auto-Activation**: Automatically activate first tab or tabs marked with `active` class
- **Flexible Targeting**: Use `data-tab-target`, `data-tab-link`, or `href` attributes

## Notes

- Tab links with `data-lang-link` or `data-lang` are excluded (used by language module)
- The module respects existing `active` classes in HTML
- URL parameters take precedence over HTML `active` classes
