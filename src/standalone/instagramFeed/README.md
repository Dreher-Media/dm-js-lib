# Instagram Feed Module

Shows a customer's recent Instagram posts on a Webflow page, as a tile grid or a one-row carousel. The posts come from the Dreher.Media **instagram-connector**; the customer connects their account once in the Squidex editor, the page needs no token.

> **Note:** This is a standalone module. It's not included in the main library bundle and must be loaded separately.
>
> **Auto-initialization:** The module initializes itself when the DOM is ready. Manual initialization is only needed for feeds you add to the page later.

## What It Does

For every `[data-ig-feed]` element the module

1. renders placeholder tiles right away, so the box keeps its size,
2. fetches `GET <endpoint>/api/delivery/<slug>/instagram` from the connector,
3. replaces the placeholders with one tile per post. A tile is a link to the post on Instagram (new tab), with the caption as a hover overlay and a badge for videos and albums.

It is the Webflow counterpart of `InstagramFeed.astro` in `astro-client-template`: same markup contract (`.ig-feed`, `.ig-feed__tile`, …), same CSS variables, same behaviour when the feed is not available.

## Privacy: no consent gate needed

The visitor's browser talks to the connector (`instagram-connector.services.dreher-media.de`, our own infrastructure), **never to Meta**: the connector holds the token and serves the pictures through its own image route. The only contact with Instagram is a visitor clicking a tile. The connector does see the visitor's IP address like any server would; mention it in the site's privacy policy.

## Basic Usage

### 1. Load the script

Webflow → Project settings → Custom code → **Footer code** (or a page's footer code):

```html
<script src="https://cdn.jsdelivr.net/npm/@dreher-media/dm-js-lib@latest/dist/standalone/instagramFeed.min.js"></script>
```

### 2. Add an Embed element

Drop an **Embed** element where the feed should appear. `data-ig-slug` is the project's Squidex app name:

```html
<div data-ig-feed data-ig-slug="my-client"></div>
```

That is a grid of one row: 3 tiles on phones, 4 from 768 px, 6 from 1024 px. Style the surrounding section in the Designer as usual.

### 3. Connect the account

The customer connects their Instagram account in the Squidex editor. Until then the feed reports `unconfigured` and the page shows the placeholder tiles.

## Options

All options are `data-ig-*` attributes on the element.

| Attribute              | Default                             | What                                                                                |
| ---------------------- | ----------------------------------- | ----------------------------------------------------------------------------------- |
| `data-ig-slug`         | – (required)                        | Squidex app name of the project                                                     |
| `data-ig-endpoint`     | the production connector            | Origin of another connector (https, or `http://localhost` for dev)                  |
| `data-ig-limit`        | `12`                                | Posts to fetch (1–25)                                                               |
| `data-ig-layout`       | `grid`                              | `grid` or `carousel`                                                                |
| `data-ig-columns-base` | `3`                                 | Tiles per row below 768 px                                                          |
| `data-ig-columns-md`   | `4`                                 | Tiles per row from 768 px                                                           |
| `data-ig-columns-lg`   | `6`                                 | Tiles per row from 1024 px                                                          |
| `data-ig-rows`         | `1`                                 | Rows in the `grid` layout (tiles beyond rows × columns are hidden)                  |
| `data-ig-ratio`        | `3 / 4`                             | Tile aspect ratio, CSS `aspect-ratio` syntax (`1 / 1`, `4 / 5`, …)                  |
| `data-ig-overlay`      | `hover`                             | `hover`: caption over the tile on hover/focus; `none`                               |
| `data-ig-placeholder`  | `tiles`                             | What to show when the feed is not available: grey `tiles`, or `hide`                |
| `data-ig-profile-link` | `true`                              | `false` removes the "Follow on Instagram" link                                      |
| `data-ig-profile-url`  | the account the API reported        | Target of that link                                                                 |
| `data-ig-hidden`       | –                                   | Comma list of media ids to leave out                                                |
| `data-ig-pinned`       | –                                   | Comma list of media ids to show first                                               |
| `data-ig-lang`         | nearest `lang` attribute, else `de` | `de` or `en`: language of the built-in labels                                       |
| `data-ig-label-*`      | built-in German / English           | Override a label: `region`, `open-post`, `video`, `album`, `follow`, `prev`, `next` |

Example, a carousel of square tiles:

```html
<div
  data-ig-feed
  data-ig-slug="my-client"
  data-ig-layout="carousel"
  data-ig-ratio="1 / 1"
  data-ig-columns-base="2"
  data-ig-columns-md="3"
  data-ig-columns-lg="4"
  data-ig-limit="16"
></div>
```

## Styling

The module injects one small stylesheet. Change the look with CSS variables on the element, on a Webflow class or in the page's custom code:

| Variable             | Default          | What                            |
| -------------------- | ---------------- | ------------------------------- |
| `--ig-gap`           | `8px`            | Gap between tiles               |
| `--ig-radius`        | `0`              | Tile corner radius              |
| `--ig-tile-bg`       | translucent grey | Tile / placeholder background   |
| `--ig-overlay-bg`    | 55 % black       | Hover overlay background        |
| `--ig-overlay-color` | `#fff`           | Hover overlay text, video badge |
| `--ig-nav-bg`        | `#fff`           | Carousel arrow background       |
| `--ig-nav-color`     | `#111`           | Carousel arrow glyph            |

```css
.my-instagram-section [data-ig-feed] {
  --ig-gap: 16px;
  --ig-radius: 12px;
}
```

Every rule in the stylesheet is a single class, so a rule of your own that comes later overrides it. Markup contract:

```
div.ig-feed[data-layout][data-status]
  div.ig-feed__stage
    ul.ig-feed__track
      li.ig-feed__item > a.ig-feed__tile > img.ig-feed__img (+ .ig-feed__overlay, .ig-feed__badge)
    button.ig-feed__nav (carousel only)
  div.ig-feed__footer > a.ig-feed__follow
```

`data-status` is `loading`, `ok`, `stale` (the connector served its last good feed while Instagram was down), `unconfigured` or `unavailable`.

## When the feed is not available

The module never throws and never blocks the page. With no connected account, an unreachable connector, or a response it cannot read, the element shows grey placeholder tiles (or is hidden with `data-ig-placeholder="hide"`). An account that answered but has no posts renders nothing. Requests time out after 8 seconds.

## JavaScript API

```javascript
// Feeds added after page load (Webflow interactions, lightbox content, …)
InstagramFeed.initInstagramFeed(containerElement);

// Reload one feed after changing its data-ig-* attributes
InstagramFeed.instagramFeedAPI.refresh(element);
```

Each feed fires a bubbling `ig-feed:loaded` event on its element, `detail.status` being the status above.

## What the module checks

The response is not trusted: a post is only rendered if its link is an `https` Instagram URL and its picture is served by the connector's own origin. Captions are inserted as text, never as markup. The request carries no cookies and no referrer.

## Requirements on the connector

The connector's delivery routes must answer cross-origin requests from the site (`Access-Control-Allow-Origin`). Without it the browser blocks the response and the page shows the placeholder.
