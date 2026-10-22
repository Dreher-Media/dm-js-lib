# Instagram Feed Module

Shows a customer's recent Instagram posts on a Webflow page, as a tile grid or a one-row carousel. A click on a tile opens the post in a popup that looks and moves like Instagram's mobile feed. The posts come from the Dreher.Media **instagram-connector**; the customer connects their account once in the Squidex editor, the page needs no token.

> **Note:** This is a standalone module. It's not included in the main library bundle and must be loaded separately.
>
> **Auto-initialization:** The module initializes itself when the DOM is ready. Manual initialization is only needed for feeds you add to the page later.

## What It Does

For every `[data-ig-feed]` element the module

1. renders placeholder tiles right away, so the box keeps its size,
2. fetches `GET <endpoint>/api/delivery/<slug>/instagram` from the connector,
3. replaces the placeholders with one tile per post (picture, a badge for videos and albums, the caption as a hover overlay),
4. makes every tile open the **post popup** on a click, and lets a video tile **preview its clip** while the mouse rests on it.

It is the Webflow counterpart of `InstagramFeed.astro` in `astro-client-template`: the same markup contract (`.ig-feed`, `.ig-pop`, …), the same CSS variables, the same popup and the same behaviour when the feed is not available. The popup logic is a port of that component's `popup.ts`.

### The post popup

A click on a tile (Enter on a focused one) opens a vertical **list of the feed's posts**, scrolled to the one clicked, each post as Instagram's mobile feed shows it: a header with the avatar, the username, "Follow" and the ×, the picture, album or clip edge to edge in its own proportion, the heart / bubble / plane with the counts, the caption, a link to all comments, the date. On a phone it is the whole screen; from 640 px a column of cards, at most 470 px wide, on a dark ground.

| The feed has                  | The popup shows                                                                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------------- |
| `account`                     | the header: avatar (the initial if there is none), username, "Follow", linking to the profile       |
| `children` (an album)         | slides you swipe, a `1/3` chip, dots, arrows for pointer devices; `←` / `→` turn it                 |
| `videoUrl` (a clip)           | a player: muted, looping, playing while on screen; tap to pause, a sound button, a seek line        |
| a clip without `videoUrl`     | the cover with a play disc; pressing it shows a notice with a link to the post on Instagram         |
| `likeCount` / `commentsCount` | the number beside the heart / the bubble (`1.284`, from 10,000 `12,3 Tsd.` / `12.3K`)               |
| `caption`                     | the username in bold, two lines and a grey "… more"; `#tags` and `@mentions` are links to Instagram |
| `timestamp`                   | under 7 days relative ("3 days ago"), then "14 April" or "18 May 2025"                              |
| `account.mediaCount` / `more` | a closing line: "56 more posts on Instagram", "That was every post", …, with a link to the profile  |

Nothing can be liked or commented here: the heart and the bubble link to the post on Instagram. **Share** copies the post's link (or hands it to `navigator.share`). Keys: `Page Up` / `Page Down` step from post to post, `Esc` closes, `Tab` stays inside; from 640 px with a pointer two round buttons do the same. Only the post in view and two on each side are built, so a long list stays light, and at most one clip plays. The popup is always light, as Instagram is, whatever the page's theme. A click with `Ctrl` / `Cmd` / `Shift` or a middle click still follows the link; without JavaScript a tile is a plain link to the post.

`data-ig-popup="false"` turns it off; a tile then stays a link to Instagram (new tab).

### Hover preview

A video tile that has a clip file plays it, muted, as a preview while the **mouse** rests on it (100 ms), without opening the popup. Only for pointers that hover, never with reduced motion or Save-Data, never on keyboard focus. One preview at a time, at least a second between two starts (the connector allows 8 streams at once and 120 video requests a minute per address). `data-ig-hover-preview="false"` turns it off.

### Media protection

By default the normal ways of taking a picture or a clip off the page are closed: no "Save image as" / "Open image in new tab" on a picture, no "Save video as", picture-in-picture or cast on a clip, no dragging a tile out of the page, nothing selectable on the pictures, no media on paper. Text, links and the keyboard's menu key keep their menus. **This is a courtesy against the casual copy, not a lock**: a screenshot, the developer tools, the network panel or an extension always work, and the pictures are public on the account's Instagram profile anyway. Do not promise a client that the pictures cannot be copied. `data-ig-protect-media="false"` turns it off.

---

## Privacy: no consent gate needed

The visitor's browser talks to the connector (`instagram-connector.services.dreher-media.de`, our own infrastructure), **never to Meta**: the connector holds the token and serves the pictures and clips through its own routes. The only contact with Instagram is a visitor following a link out of a tile or the popup (new tab, `rel="noopener noreferrer"`). The connector does see the visitor's IP address like any server would; mention it in the site's privacy policy.

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

The popup moves to `<body>` when it opens, so its variables are copied from the feed element onto the dialog: set them on the element or a parent, as above. All of them are optional; the defaults are Instagram's own values.

| Variable                                             | Default                                    | What                                                 |
| ---------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------- |
| `--ig-popup-font`                                    | Instagram's system font stack              | The popup's font                                     |
| `--ig-popup-text` / `-secondary` / `-link` / `-line` | `#000` / `#737373` / `#4150f7` / `#dbdbdb` | Text, grey text, links and the focus ring, hairlines |
| `--ig-popup-bg` / `--ig-popup-backdrop`              | `#fff` / `rgb(0 0 0 / 0.65)`               | The card, and the dark ground behind it from 640 px  |
| `--ig-popup-max-width` / `-radius`                   | `470px` / `8px`                            | The cards' width and corners from 640 px             |
| `--ig-popup-media-max-h` / `-min-h`                  | `min(85svh, 46rem)` / `8rem`               | The highest and the lowest a post's picture box gets |
| `--ig-popup-media-bg`                                | `#000`                                     | The ground behind a picture                          |
| `--ig-popup-chip-bg` / `-chip-color`                 | `rgb(43 48 54 / 0.8)` / `#fff`             | Album counter, sound button, play disc               |
| `--ig-popup-nav-bg` / `-nav-color`                   | `rgb(255 255 255 / 0.7)` / `#262626`       | Album arrows and the two round step buttons          |
| `--ig-popup-z`                                       | `2147483000`                               | `z-index` of the popup: above a Webflow navbar       |
| `--ig-inset`                                         | `16px`                                     | The popup's one measure: card edge → text and icons  |

```css
.my-instagram-section [data-ig-feed] {
  --ig-gap: 8px;
  --ig-radius: 12px;
  --ig-popup-max-width: 520px;
}
```

Every rule in the stylesheet is one or two classes deep, so a rule of your own that comes later overrides it. A small reset (all `:where()`, specificity zero) keeps a Webflow page's global rules for lists, links, images and buttons out of the feed and the popup. Markup contract (the same as the Astro component's):

```
div.ig-feed[data-layout][data-status]                    role="group"
  div.ig-feed__stage > ul.ig-feed__track > li.ig-feed__item
        > a.ig-feed__tile[data-ig-open=<post id>] > img.ig-feed__img (+ .ig-feed__overlay, .ig-feed__badge)
    button.ig-feed__nav (carousel only)
  div.ig-feed__footer > a.ig-feed__follow
  template[data-ig-dialog]  →  div.ig-pop[data-modal] (moved to <body> on the first click)
  template[data-ig-post=<id>]*                           one per post of the popup's list
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

Each feed fires a bubbling `ig-feed:loaded` event on its element, `detail.status` being the status above. Opening the popup fires `ig:popup-open` on `document`.

## What the module checks

The response is not trusted. A post is only rendered if its id is a media id, its link is an `https` Instagram URL, and its picture is **this project's** connector image URL. A clip, an album's pictures and the avatar must live under the project's `/api/delivery/<slug>/instagram/` path on the connector, counts must be whole non-negative numbers, an album has at most ten items, the profile link must stay on instagram.com; anything else is dropped (a bad clip URL costs the clip, not the post). Captions are inserted as text, never as markup, and only `#hashtags` and `@mentions` found in them become links. The request carries no cookies and no referrer.

## Differences from the Astro component

- **One picture size.** Astro serves tiles through the image optimizer in several widths; the connector serves one size, so the tiles of a Webflow page load a larger file than they show. `loading="lazy"` keeps the ones below the fold back; the first row loads at once.
- **A fetch in the browser.** Astro renders the feed on the server; this module fetches it when the page loads, so the tiles show as placeholders for a moment. The connector's answer is cached for five minutes at its CDN edge.
- **No site-kit.** The modal mechanics (`Esc`, backdrop click, Tab trap, scroll lock, `inert`) are a small copy in `modal.ts`; this package is public and has no dependencies.

## Requirements on the connector

The connector's delivery routes answer cross-origin requests (`Access-Control-Allow-Origin: *` on the feed route). The pictures and clips are loaded by `<img>` and `<video>` and need no CORS. A connector that predates the clip and album fields still works: the popup shows covers.
