# Language Module

Handles multi-language content switching with automatic browser language detection and session persistence.

## What It Does

This module allows you to create multi-language content on a single page. Users can switch between languages, and their preference is remembered for the session. The module also automatically detects the browser's preferred language.

## Usage

### Attribute-Based System (Recommended)

**Language Links:**
Add `data-lang-link` to language switcher buttons/links:

```html
<div class="language-switcher">
  <button data-lang-link="en">English</button>
  <button data-lang-link="de">Deutsch</button>
  <button data-lang-link="fr">Français</button>
</div>
```

**Language Content:**
Add `data-lang-content` to content blocks:

```html
<div data-lang-content="en">
  <h1>Welcome</h1>
  <p>This is the English version.</p>
</div>

<div data-lang-content="de">
  <h1>Willkommen</h1>
  <p>Dies ist die deutsche Version.</p>
</div>

<div data-lang-content="fr">
  <h1>Bienvenue</h1>
  <p>Ceci est la version française.</p>
</div>
```

## Features

### Automatic Language Detection

The module automatically detects the user's browser language and switches to it if available. If the browser language isn't available, it falls back to English (if available).

### Session Persistence

The selected language is saved in session storage, so it persists as users navigate through your site during the same session.

### Active State Management

Language links automatically get the `active` class when their language is selected, making it easy to style the current language.

## How It Works

1. On page load, the module checks for a saved language preference
2. If none exists, it detects the browser's preferred language
3. It shows content matching the selected language and hides others
4. When a language link is clicked, it switches the visible content
5. The preference is saved for the session

## Styling

Style active language links:

```css
[data-lang-link].active {
  font-weight: bold;
  color: #007bff;
}
```

Style visible content:

```css
[data-lang-content] {
  display: none;
}

[data-lang-content].lang-active {
  display: block;
}
```

## Language Codes

Use standard two-letter language codes (ISO 639-1):
- `en` - English
- `de` - German
- `fr` - French
- `es` - Spanish
- etc.

## Notes

- Language preference is stored in session storage (cleared when browser closes)
