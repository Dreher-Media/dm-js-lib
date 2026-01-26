# Cookie Consent Module

Manages the visibility of content based on cookie consent preferences using Finsweet Cookie Consent (FsCC).

## What It Does

This module automatically shows or hides content based on whether users have given consent for specific cookie categories. It integrates with Finsweet Cookie Consent to toggle visibility of elements.

## How It Works

The module monitors consent changes and automatically:

1. Hides elements marked with `fs-cc-reject` when consent is given
2. Shows elements marked with `fs-cc` when consent is given
3. Reverses visibility when consent is withdrawn

## Usage

### Basic Setup

Add the `fs-cc-reject` attribute to elements that should be hidden when consent is given:

```html
<div fs-cc-reject="analytics">
  <p>This content is shown when analytics cookies are NOT accepted.</p>
</div>
```

Add the `fs-cc` attribute to elements that should be shown when consent is given:

```html
<div fs-cc="analytics">
  <p>This content is shown when analytics cookies ARE accepted.</p>
</div>
```

### Example Use Cases

**Google Analytics Script:**
```html
<!-- Show this only when analytics consent is given -->
<div fs-cc="analytics">
  <script>
    // Google Analytics code here
  </script>
</div>

<!-- Show this message when analytics is rejected -->
<div fs-cc-reject="analytics">
  <p>Analytics tracking is disabled.</p>
</div>
```

**Video Embeds:**
```html
<!-- YouTube embed - requires marketing consent -->
<div fs-cc="marketing">
  <iframe src="..."></iframe>
</div>
```

## Cookie Categories

The category names (like `analytics`, `marketing`, `functional`) depend on how you've configured Finsweet Cookie Consent. Use the same category names in your `fs-cc` and `fs-cc-reject` attributes.

## Requirements

This module requires [Finsweet Cookie Consent](https://www.finsweet.com/cookie-consent) to be loaded on your page.
