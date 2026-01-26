# @dreher-media/dm-js-lib

A comprehensive JavaScript library for modern websites. Add powerful functionality to your site with simple HTML attributes - no JavaScript knowledge required!

## Quick Start

Add this script tag to your HTML (before the closing `</body>` tag):

```html
<script src="https://cdn.jsdelivr.net/npm/@dreher-media/dm-js-lib@latest/dist/dm-js-lib.min.js"></script>
```

That's it! All modules are now available on your page. No configuration needed.

## What This Library Does

This library provides 5 built-in modules that add common website functionality. Simply add HTML attributes to your elements, and the library handles the rest automatically.

Additionally, there are standalone modules available that can be loaded separately when needed.

## Built-in Modules

### 🛠️ Utilities
**A collection of four small utility functions**

Combines four simple utilities that work automatically:
- **Active Link** - Automatically highlights active navigation links
- **File Download** - Enables file downloads from any element
- **Separators** - Automatically inserts separators between elements
- **Webflow Init** - Webflow-specific initialization (copyright year)

**Perfect for:** Common website tasks that need minimal setup

**Examples:**
```html
<!-- Active Link (automatic) -->
<nav>
  <a href="/">Home</a>
  <a href="/about">About</a>
</nav>

<!-- File Download -->
<button data-download-href="/files/document.pdf">Download</button>

<!-- Separators -->
<div data-separator=", ">
  <span>Tag 1</span>
  <span>Tag 2</span>
</div>

<!-- Webflow Copyright Year -->
<p>&copy; <span class="copyright-year">2024</span> Company</p>
```

[📖 Full Documentation →](./src/modules/utilities/README.md)

---

### 🍪 Cookie Consent
**Shows or hides content based on cookie preferences**

Integrates with Finsweet Cookie Consent to automatically show/hide content based on user consent choices. Perfect for GDPR compliance.

**Perfect for:** Analytics scripts, marketing embeds, tracking pixels

**Example:**
```html
<div fs-cc="analytics">
  <!-- Shown when analytics consent is given -->
  <script>/* Google Analytics */</script>
</div>
```

[📖 Full Documentation →](./src/modules/cookieConsent/README.md)

---

### 🌍 Language
**Multi-language content switching**

Create multi-language pages with automatic browser language detection. Users can switch languages, and their preference is remembered.

**Perfect for:** International websites, bilingual content, localized pages

**Example:**
```html
<button data-lang-link="en">English</button>
<button data-lang-link="de">Deutsch</button>

<div data-lang-content="en">English content</div>
<div data-lang-content="de">Deutsche Inhalte</div>
```

[📖 Full Documentation →](./src/modules/lang/README.md)

---

### 📑 Tabs
**Interactive tab interfaces**

Create tabbed content sections with support for multiple tab groups, URL control, and automatic activation.

**Perfect for:** Product details, FAQ sections, feature comparisons, content organization

**Example:**
```html
<div class="tabs">
  <button class="tab-link" data-tab-target="tab1">Tab 1</button>
  <button class="tab-link" data-tab-target="tab2">Tab 2</button>
</div>

<div data-tab-content="tab1">Content 1</div>
<div data-tab-content="tab2">Content 2</div>
```

[📖 Full Documentation →](./src/modules/tabs/README.md)

---

### 🎥 Video Players
**Unified video player management**

Supports YouTube, Vimeo, Dailymotion, and HTML5 videos (Plyr). Automatically pauses other videos when one plays. Integrates with Swiper carousels. **Also automatically upgrades YouTube thumbnail quality** for crisp, clear thumbnails.

**Perfect for:** Video galleries, product demos, tutorial pages, media libraries

**Example:**
```html
<div class="youtube" 
     data-type="youtube"
     data-video-id="dQw4w9WgXcQ"
     data-id="player1">
  <img src="thumbnail.jpg" alt="Video">
</div>
```

YouTube thumbnails are automatically upgraded to the highest available quality - no setup needed!

[📖 Full Documentation →](./src/modules/videoPlayers/README.md)


---

## Standalone Modules

These modules are not included in the main bundle and must be loaded separately when needed. They're perfect for when you only need specific functionality.

### 🔍 Filter
**Powerful filtering system for lists and collections**

Create advanced filter interfaces with checkboxes, search boxes, dropdowns, and more. Supports multiple filter types, URL persistence, and localStorage.

**Perfect for:** Product catalogs, portfolio galleries, blog archives, directory listings

**Installation:**
```html
<script src="https://cdn.jsdelivr.net/npm/@dreher-media/dm-js-lib@latest/dist/standalone/filter.min.js"></script>
```

The filter module auto-initializes on page load. Manual initialization is optional (useful for dynamic content):

```html
<script>
  // Optional: Manually initialize if needed
  Filter.initFilter();
</script>
```

**Example:**
```html
<!-- Filter controls -->
<input type="checkbox" data-filter-field="category" value="design"> Design
<input type="text" data-filter-field="search" placeholder="Search...">

<!-- Filterable list -->
<ul data-filter-list>
  <li data-filter-value="design">Design Project</li>
  <li data-filter-value="development">Dev Project</li>
</ul>
```

[📖 Full Documentation →](./src/standalone/filter/README.md)

---

### 🔄 Preview Detail Switcher
**Switch between preview and detail views**

Create interactive interfaces where clicking preview elements shows corresponding detail views. Only one detail view is visible at a time.

**Perfect for:** Product galleries, portfolio showcases, content switchers

**Installation:**
```html
<script src="https://cdn.jsdelivr.net/npm/@dreher-media/dm-js-lib@latest/dist/standalone/previewDetailSwitcher.min.js"></script>
<script>
  // Initialize
  PreviewDetailSwitcher.initPreviewDetailSwitcher({
    container: '.my-container'
  });
</script>
```

**Example:**
```html
<div class="gallery">
  <button data-preview-id="item1">Preview 1</button>
  <button data-preview-id="item2">Preview 2</button>
  
  <div data-detail-item data-detail-id="item1">Detail 1</div>
  <div data-detail-item data-detail-id="item2">Detail 2</div>
</div>
```

[📖 Full Documentation →](./src/standalone/previewDetailSwitcher/README.md)

---

## CDN Installation

### Recommended: Auto-update on patches

```html
<script src="https://cdn.jsdelivr.net/npm/@dreher-media/dm-js-lib@1.2.x/dist/dm-js-lib.min.js"></script>
```

Automatically receives bug fixes and patches, but won't break on major updates.

### Pin to specific version

```html
<script src="https://cdn.jsdelivr.net/npm/@dreher-media/dm-js-lib@1.2.3/dist/dm-js-lib.min.js"></script>
```

Frozen at this version - no automatic updates.

### Always latest

```html
<script src="https://cdn.jsdelivr.net/npm/@dreher-media/dm-js-lib@latest/dist/dm-js-lib.min.js"></script>
```

Always uses the newest version (use with caution in production).

## How It Works

1. **Add the script** - Include the library via CDN
2. **Add attributes** - Use data attributes on your HTML elements
3. **It works!** - The library automatically initializes everything

No JavaScript coding required. Everything works through HTML attributes.

## Browser Support

Works in all modern browsers:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Requirements

Most modules work standalone. Some modules have optional dependencies:

- **Cookie Consent** - Requires [Finsweet Cookie Consent](https://www.finsweet.com/cookie-consent)
- **Video Players** - Automatically loads required APIs (YouTube, Vimeo, etc.)
- **Webflow Init** - Requires Webflow to be loaded

## Getting Help

Each module has detailed documentation with examples. Click on any module name above to see:
- Complete usage examples
- All available options
- Styling tips
- Common use cases

## For Developers

If you're contributing to this library or need technical details about the codebase, architecture, build system, or release process, see the [Developer Documentation](./src/README.md).

## License

MIT License - Use freely in personal and commercial projects.
