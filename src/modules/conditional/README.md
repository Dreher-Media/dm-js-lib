# Conditional Elements Module

Show or hide elements based on dates, times, and URL parameters. Perfect for time-sensitive content, calendar events, preview modes, and dynamic content display.

## What It Does

This module conditionally displays content based on various client-side conditions. Elements are automatically shown or hidden when conditions are met, without requiring any JavaScript coding.

## Basic Usage

Simply add data attributes to elements you want to conditionally show or hide:

```html
<!-- Show before a specific date -->
<div data-conditional-date="before:2025-12-31">Limited time offer!</div>

<!-- Show on weekdays -->
<div data-conditional-date="day:weekday">Weekday content</div>

<!-- Combine date and time in one attribute -->
<div data-conditional-date="before:2025-12-31 day:weekday">Before end of year, weekdays only</div>

<!-- Show when preview parameter exists -->
<div data-conditional-url="param:preview">Preview mode</div>
```

## Data Attributes

### Main Attributes

- `data-conditional` - Marks an element as conditional (optional, module auto-detects other attributes)
- `data-conditional-date` - Date and time conditions (handles both dates and times)
- `data-conditional-url` - URL parameter conditions
- `data-conditional-mode` - Optional: `"show"` (default) or `"hide"` - determines visibility behavior

**Note:** The `data-conditional-date` attribute handles both date and time conditions. The module automatically detects whether each condition is a date or time based on the condition syntax.

## Date and Time Conditions

Date and time conditions are combined in the `data-conditional-date` attribute. The module automatically detects whether each condition is a date or time based on the syntax.

### Condition Syntax Summary

- **Date conditions**: `before:YYYY-MM-DD`, `after:YYYY-MM-DD`, `between:YYYY-MM-DD,YYYY-MM-DD`, `on:YYYY-MM-DD`
- **Date with time**: `before:YYYY-MM-DD HH:MM`, `after:YYYY-MM-DD HH:MM`, `between:YYYY-MM-DD HH:MM,YYYY-MM-DD HH:MM`, `on:YYYY-MM-DD HH:MM`
- **Time conditions**: `before:HH:MM`, `after:HH:MM`, `between:HH:MM,HH:MM`
- **Day conditions**: `day:weekday`, `day:weekend`, `day:monday|friday`

### Absolute Dates

Use `YYYY-MM-DD` format for specific dates, or include time with `YYYY-MM-DD HH:MM` or ISO format `YYYY-MM-DDTHH:MM`:

```html
<!-- Show before a specific date -->
<div data-conditional-date="before:2025-12-31">End of year offer</div>

<!-- Show before a specific date and time -->
<div data-conditional-date="before:2025-12-31 23:59">End of year, before midnight</div>
<div data-conditional-date="before:2025-12-31T23:59">ISO format also works</div>

<!-- Show after a specific date -->
<div data-conditional-date="after:2025-01-01">New year content</div>

<!-- Show after a specific date and time -->
<div data-conditional-date="after:2025-01-01 09:00">After New Year's Day 9 AM</div>

<!-- Show between two dates (inclusive) -->
<div data-conditional-date="between:2025-06-01,2025-08-31">Summer special</div>

<!-- Show between two datetimes (use comma as separator) -->
<div data-conditional-date="between:2025-06-01 09:00,2025-08-31 17:00">Summer business hours</div>

<!-- Show on a specific date -->
<div data-conditional-date="on:2025-12-25">Christmas message</div>

<!-- Show on a specific date and time -->
<div data-conditional-date="on:2025-12-25 12:00">Christmas noon</div>
```

**Note:** 
- When time is included, comparisons use full datetime. When only date is provided, comparisons use date-only (midnight).
- The `between:` operator uses comma (`,`) as separator: `between:START,END`


### Absolute Times

Use `HH:MM` format (24-hour) for specific times:

```html
<!-- Show before 6 PM -->
<div data-conditional-date="before:18:00">Before evening</div>

<!-- Show after 9 AM -->
<div data-conditional-date="after:09:00">Morning content</div>

<!-- Show between 9 AM and 5 PM (comma-separated) -->
<div data-conditional-date="between:09:00,17:00">Business hours</div>
```

**Note:** The `between:` operator uses comma (`,`) as separator to avoid conflicts with time colons.


### Day of Week

Show/hide based on day of week:

```html
<!-- Show on specific days -->
<div data-conditional-date="day:monday">Monday special</div>
<div data-conditional-date="day:monday|friday">Monday or Friday</div>

<!-- Show on weekdays (Mon-Fri) -->
<div data-conditional-date="day:weekday">Weekday content</div>

<!-- Show on weekends (Sat-Sun) -->
<div data-conditional-date="day:weekend">Weekend content</div>
```

### Combining Date and Time in One Attribute

You can combine multiple date and time conditions in the `data-conditional-date` attribute:

```html
<!-- Show before date AND on weekdays -->
<div data-conditional-date="before:2025-12-31 day:weekday">Before end of year, weekdays only</div>

<!-- Show between dates AND during business hours -->
<div data-conditional-date="between:2025-06-01,2025-08-31 between:09:00,17:00">Summer business hours</div>

<!-- Show after date AND on specific days -->
<div data-conditional-date="after:2025-01-01 day:monday|friday">After Jan 1, Mondays and Fridays</div>
```

## URL Parameter Conditions

Show/hide based on URL query parameters:

```html
<!-- Show when parameter equals value -->
<div data-conditional-url="param:preview=true">Preview content</div>

<!-- Show when parameter exists (any value) -->
<div data-conditional-url="param:debug">Debug information</div>

<!-- Show when parameter does NOT exist -->
<div data-conditional-url="param:!preview">Non-preview content</div>

<!-- Show when parameter does NOT equal value -->
<div data-conditional-url="param:mode!=production">Development mode</div>
```

## Combining Conditions

Multiple condition types can be combined on the same element. All conditions must be true (AND logic) for the element to be shown:

```html
<!-- Combine date/time and URL conditions -->
<div data-conditional-date="after:2025-01-01 day:weekday"
     data-conditional-url="param:preview=true">
  Conditional content
</div>

<!-- Multiple date/time conditions -->
<div data-conditional-date="between:2025-01-01,2025-12-31 day:weekday"
     data-conditional-url="param:preview=true">
  This year on weekdays when preview=true
</div>
```

### Multiple Conditions of Same Type

Use pipe (`|`) to separate multiple conditions of the same type for OR logic:

```html
<!-- Show on Monday OR Friday -->
<div data-conditional-date="day:monday|friday">Monday or Friday</div>

<!-- Show before Dec 31 OR after Jan 1 -->
<div data-conditional-date="before:2025-12-31|after:2026-01-01">Holiday period</div>
```

## Mode Attribute

By default, elements are shown when conditions are met. Use `data-conditional-mode="hide"` to reverse this behavior:

```html
<!-- Hidden before Dec 31, 2025, shown after -->
<div data-conditional-date="before:2025-12-31" data-conditional-mode="hide">
  Shown after Dec 31
</div>

<!-- Hidden when preview parameter exists -->
<div data-conditional-url="param:preview" data-conditional-mode="hide">
  Hidden in preview mode
</div>
```

## Use Cases

### Calendar Events

Show calendar events based on dates:

```html
<!-- Show event before a specific date -->
<div data-conditional-date="before:2025-12-31">
  <h3>Upcoming Event</h3>
  <p>Event details...</p>
</div>

<!-- Show event on specific date -->
<div data-conditional-date="on:2025-12-25">
  <h3>Christmas Event</h3>
  <p>Join us on Christmas!</p>
</div>
```

### Time-Sensitive Promotions

Display limited-time offers:

```html
<!-- Show before end of year -->
<div data-conditional-date="before:2025-12-31" class="promotion-banner">
  Limited time: 20% off everything!
</div>

<!-- Show during business hours -->
<div data-conditional-date="between:09:00,17:00">
  Call us now: 1-800-123-4567
</div>
```

### Preview/Debug Modes

Show content only in preview or debug modes:

```html
<!-- Preview mode content -->
<div data-conditional-url="param:preview=true">
  <p>This content is only visible in preview mode.</p>
</div>

<!-- Debug information -->
<div data-conditional-url="param:debug">
  <pre>Debug: {{ debug_info }}</pre>
</div>
```

### Seasonal Content

Display content during specific seasons:

```html
<!-- Summer content -->
<div data-conditional-date="between:2025-06-01,2025-08-31">
  Summer sale - 30% off!
</div>

<!-- Winter content -->
<div data-conditional-date="between:2025-12-01,2026-02-28">
  Winter collection now available
</div>
```

### Business Hours

Show different content based on time of day:

```html
<!-- Business hours -->
<div data-conditional-date="between:09:00,17:00 day:weekday">
  <p>We're open! Call us now.</p>
</div>

<!-- After hours -->
<div data-conditional-date="after:17:00 day:weekday">
  <p>We're closed. Please leave a message.</p>
</div>

<!-- Weekend -->
<div data-conditional-date="day:weekend">
  <p>We're closed on weekends.</p>
</div>
```

## How It Works

1. **Auto-initialization**: The module automatically initializes when the DOM is ready
2. **Condition evaluation**: All conditions are evaluated on page load
3. **Re-evaluation**: Conditions are re-evaluated when:
   - URL changes (back/forward navigation)
   - Hash changes
4. **Visibility toggle**: Elements are shown/hidden based on condition results

## CSS Classes

The module adds CSS classes to elements for styling:

- `conditional-active` - Added when element is shown
- `conditional-hidden` - Added when element is hidden

You can use these classes for styling:

```css
.conditional-active {
  animation: fadeIn 0.3s ease-in;
}

.conditional-hidden {
  display: none;
}
```

## Technical Details

### Date Comparisons

- Dates are compared at midnight (00:00:00) for date-only comparisons
- When time is included (YYYY-MM-DD HH:MM), full datetime comparison is used
- Supports ISO format (YYYY-MM-DDTHH:MM) or space-separated format (YYYY-MM-DD HH:MM)
- Timezone: Uses local browser timezone
- The `between:` operator uses comma (`,`) as separator: `between:START,END`

### Time Comparisons

- Times use 24-hour format (HH:MM)
- Day of week uses lowercase day names (monday, tuesday, etc.)
- The `between:` operator uses comma (`,`) as separator: `between:START,END`

### URL Parameters

- Parameters are read from `window.location.search`
- Case-sensitive matching
- Supports standard URLSearchParams syntax

### Error Handling

- Invalid date/time formats: Element is hidden (fails gracefully)
- Missing attributes: Ignored (doesn't affect other conditions)
- Invalid condition syntax: Element is hidden

## Browser Support

Works in all modern browsers:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

Requires:
- ES2020+ support
- URLSearchParams API (available in all modern browsers)

## Examples

### Complex Example: Event Calendar

```html
<!-- Show event if it's before a date and on a weekday -->
<div data-conditional-date="before:2025-12-31 day:weekday">
  <h3>Upcoming Weekday Event</h3>
  <p>Join us for this special event!</p>
</div>

<!-- Show event on specific date -->
<div data-conditional-date="on:2025-12-25">
  <h3>Christmas Special Event</h3>
  <p>Celebrate with us on Christmas!</p>
</div>
```

### Complex Example: Preview Mode with Time Restriction

```html
<!-- Show preview content only during business hours when preview=true -->
<div data-conditional-date="between:09:00,17:00 day:weekday"
     data-conditional-url="param:preview=true">
  <p>Preview mode active - Business hours only</p>
</div>
```

### Complex Example: Seasonal Promotion

```html
<!-- Show promotion before a date, excluding weekends -->
<div data-conditional-date="before:2025-12-31 day:weekday">
  <div class="promotion">
    <h2>Weekday Special!</h2>
    <p>Valid Monday through Friday only</p>
  </div>
</div>
```
