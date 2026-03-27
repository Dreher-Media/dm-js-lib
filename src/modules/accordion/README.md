# Accordion Module

Creates reusable accordion behavior for standalone blocks and classic accordion lists.

## What It Does

This module toggles content panels from trigger elements using data attributes. It supports both single-open and multi-open behavior, optional grouping across containers, and JavaScript-driven height animation.

It is designed for Webflow layouts where trigger and panel are not required to be siblings.

## Usage

### Standalone Dropdown (Recommended)

Use one `data-accordion` container for one standalone dropdown:

```html
<section data-accordion>
  <button data-accordion-trigger>What is included?</button>
  <div data-accordion-panel>
    <p>Everything needed to launch your project.</p>
  </div>
</section>
```

### Classic Accordion List

Use `data-accordion-item` when you prefer explicit item wrappers:

```html
<section data-accordion data-accordion-mode="multi">
  <article data-accordion-item>
    <h3 data-accordion-trigger>Question 1</h3>
    <div data-accordion-panel>Answer 1</div>
  </article>

  <article data-accordion-item>
    <h3 data-accordion-trigger>Question 2</h3>
    <div data-accordion-panel>Answer 2</div>
  </article>
</section>
```

### Grouping Multiple Containers

Add `data-accordion-group` to isolate or combine behavior across containers:

```html
<section data-accordion data-accordion-mode="single" data-accordion-group="faq-main">
  ...
</section>

<section data-accordion data-accordion-mode="single" data-accordion-group="faq-main">
  ...
</section>
```

Both containers above share the same single-open scope.

### Remote Triggers (Outside Target)

You can control accordions from anywhere in the DOM.

**Container-level remote target:**

```html
<section data-accordion data-accordion-remote="pricingDetails">
  <button data-accordion-trigger>Inside trigger</button>
  <div data-accordion-panel>Pricing details content...</div>
</section>

<button data-accordion-remote="pricingDetails" data-accordion-action="toggle">
  Toggle pricing details remotely
</button>
```

**Item-level remote target:**

```html
<section data-accordion>
  <article data-accordion-item data-accordion-remote-item="faq_shipping">
    <button data-accordion-trigger>Shipping</button>
    <div data-accordion-panel>Shipping answer...</div>
  </article>
</section>

<button data-accordion-remote-item="faq_shipping" data-accordion-action="open">
  Open shipping answer remotely
</button>
```

## Attributes

- `data-accordion`: Accordion container (required)
- `data-accordion-trigger`: Trigger element (required per item)
- `data-accordion-action="toggle|open|close"`: Trigger behavior (default: `toggle`)
- `data-accordion-panel`: Content panel element (required per item)
- `data-accordion-item`: Optional wrapper for explicit trigger/panel pairing
- `data-accordion-mode="single|multi"`: Open behavior (default: `multi`)
- `data-accordion-group="<name>"`: Optional scope key shared across containers
- `data-accordion-remote="<name>"`: Optional remote key for container-level remote control
- `data-accordion-remote-item="<name>"`: Optional remote key for item-level remote control
- `data-accordion-duration="<ms>"`: Animation duration in milliseconds (default: `300`)
- `data-accordion-easing="<css-easing>"`: Transition easing string (default: `ease`)

### Trigger Action Behavior

Set action on each trigger with `data-accordion-action`:

- `toggle` (default): opens if closed, closes if open
- `open`: only opens; does nothing when already open
- `close`: only closes; does nothing when already closed

Dedicated action visibility is automatic:

- `open` triggers are hidden while the panel is already open
- `close` triggers are hidden while the panel is already closed
- `toggle` triggers stay visible

Example:

```html
<button data-accordion-trigger data-accordion-action="open">Open details</button>
<button data-accordion-trigger data-accordion-action="close">Close details</button>
<div data-accordion-panel>Panel content...</div>
```

## Initial State

You can define initially open items by adding one of:

- `class="active"` on trigger
- `class="active"` on panel
- `aria-expanded="true"` on trigger

If no initial active state is set, items start closed.

## Accessibility

The module automatically manages:

- `aria-expanded` on triggers
- `aria-hidden` on panels
- keyboard support (Enter/Space) for non-button trigger elements

## Notes

- In standalone mode (no `data-accordion-item`), one `data-accordion` container represents one dropdown.
- If you need multiple dropdown items in the same container, use `data-accordion-item` wrappers (no scope guessing).
- Single mode closes other open items in the same scope (`data-accordion` container by default, or shared `data-accordion-group` when set).
- Remote triggers support both container-level (`data-accordion-remote`) and item-level (`data-accordion-remote-item`) targeting.
- The module does not apply visual panel/dropdown styling. `data-accordion-panel` should be treated as a plain wrapper for content.
- Add CSS for your visual design; this module handles interaction, state classes (`active`), and height animation.
