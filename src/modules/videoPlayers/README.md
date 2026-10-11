# Video Players Module

Manages video players from multiple platforms (Plyr, YouTube, Vimeo, Dailymotion, ARD Mediathek, other) with automatic pause/play coordination.

## What It Does

This module automatically initializes and manages video players from different platforms. When one video plays, others automatically pause, ensuring a smooth viewing experience.

## Supported Platforms

- **Plyr** - HTML5 video player
- **YouTube** - YouTube embeds
- **Vimeo** - Vimeo embeds
- **Dailymotion** - Dailymotion embeds
- **ARD Mediathek** - ARD Mediathek iframe embeds (no external API; embed loads on click)
- **Other** - Any video URL; opens in a new tab on click (for platforms that can't be embedded)

## Usage

### Plyr (HTML5 Video)

Add the `_init-plyr` class to video elements:

```html
<video class="_init-plyr" controls>
  <source src="/video.mp4" type="video/mp4" />
</video>
```

### YouTube

```html
<div
  class="youtube"
  data-type="youtube"
  data-video-id="dQw4w9WgXcQ"
  data-id="player1"
  data-time="0"
>
  <img src="thumbnail.jpg" alt="Video thumbnail" />
</div>
```

**Attributes:**

- `data-type="youtube"` - Specifies YouTube player
- `data-video-id` - YouTube video ID
- `data-id` - Optional identifier; does not need to be unique. The library assigns its own unique key internally, so the same video can appear multiple times on a page.
- `data-time` - Start time in seconds (optional)

### Vimeo

```html
<div class="youtube" data-type="vimeo" data-video-id="123456789" data-id="player2" data-time="30">
  <img src="thumbnail.jpg" alt="Video thumbnail" />
</div>
```

### Dailymotion

```html
<div
  class="youtube"
  data-type="dailymotion"
  data-video-id="x123abc"
  data-id="player3"
  data-time="0"
>
  <img src="thumbnail.jpg" alt="Video thumbnail" />
</div>
```

### ARD Mediathek

```html
<div
  class="youtube"
  data-type="ardmediathek"
  data-video-id="Y3JpZDovL3N3ci5kZS9hZXgvbzExNjA0MTA"
  data-id="player4"
>
  <img src="thumbnail.jpg" alt="Video thumbnail" />
</div>
```

**Attributes:**

- `data-type="ardmediathek"` - Specifies ARD Mediathek embed
- `data-video-id` - ARD Mediathek video ID (base64-style from their URLs)
- `data-id` - Optional identifier; does not need to be unique. The library assigns its own unique key internally, so the same video can appear multiple times on a page.

On click, the thumbnail is replaced with an iframe embed. No external script is loaded.

**Play coordination:** Clicking an ARD embed triggers the same “on play” behavior as other players: other videos are paused and Swiper autoplay is stopped. Because ARD Mediathek does not expose a JavaScript API, the ARD iframe cannot be paused when another video is started, and Swiper autoplay is not resumed when the user pauses the ARD video.

### Other (open in new tab)

```html
<div
  class="youtube"
  data-type="other"
  data-video-id="https://example.com/video/123"
  data-id="player5"
>
  <img src="thumbnail.jpg" alt="Video thumbnail" />
</div>
```

**Attributes:**

- `data-type="other"` - Opens the URL in a new tab (no embed)
- `data-video-id` - Full URL to the video page
- `data-id` - Optional identifier; does not need to be unique. The library assigns its own unique key internally, so the same video can appear multiple times on a page.

Use this for platforms that can't be embedded (e.g. some streaming services). Clicking pauses other players and stops Swiper autoplay, then opens the URL in a new tab with `noopener,noreferrer`.

## Features

### Automatic YouTube Thumbnail Quality Upgrade

The module automatically upgrades YouTube thumbnail images to the highest available quality. No setup required - it works automatically on all YouTube thumbnails.

**How it works:**

1. Finds all images inside `.youtube` elements
2. Checks the current image quality
3. If the image is low quality (width < 120px), it tries to upgrade to higher quality versions
4. Attempts different thumbnail sizes in order:
   - `maxresdefault` (highest quality)
   - `sddefault`
   - `hqdefault`
   - `mqdefault`
   - `default` (fallback)

**Example:**
If you have a YouTube thumbnail URL like:

```
https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg
```

The module will automatically try to upgrade it to:

```
https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg
```

### Automatic Pause Coordination

When one video starts playing, all other videos automatically pause. This prevents multiple videos from playing simultaneously.

### Swiper Integration

If you're using Swiper carousels with videos, the module automatically pauses videos when slides change and stops autoplay when videos play.

### Custom Embeds

You can provide custom embed code that replaces the thumbnail when clicked:

```html
<div class="youtube" data-type="youtube" data-video-id="..." data-id="player1">
  <div data-custom-embed>
    <!-- Custom iframe or embed code here -->
  </div>
</div>
```

## Privacy: nothing is requested before the first click

Opening a page with video thumbnails makes **no request to YouTube, Vimeo, Dailymotion or the Plyr CDN**, so no visitor IP reaches those providers until somebody actually starts a video. The module only binds click handlers on page load. The thumbnails themselves are plain `<img>` tags from your own markup; the module loads no third-party script for them.

What a click does:

| Type           | On click                                                                                                                                                                                                                                                                                                    |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `youtube`      | Inserts the `youtube.com/embed/...?autoplay=1` iframe immediately (inside the click), then loads `https://www.youtube.com/iframe_api` once and attaches the API to that iframe for pause coordination. If the API cannot be loaded, the video still plays; it just is not paused when another video starts. |
| `vimeo`        | Same pattern with `player.vimeo.com/video/<id>?autoplay=1`, then `https://player.vimeo.com/api/player.js`.                                                                                                                                                                                                  |
| `dailymotion`  | Plain `dailymotion.com/embed/video/<id>?autoplay=1` iframe. No script is loaded. If the page itself provides `window.dailymotion.createPlayer` (Dailymotion's player library), that is used instead.                                                                                                        |
| `ardmediathek` | iframe embed, no script (unchanged).                                                                                                                                                                                                                                                                        |
| `other`        | Opens the URL in a new tab (unchanged).                                                                                                                                                                                                                                                                     |
| `._init-plyr`  | Plyr (`plyr.polyfilled.js` and `plyr.css` from `cdn.plyr.io`) is loaded when the visitor first clicks, presses Enter/Space on, or starts playback of the element; until then it is a plain native `<video>`. Autoplaying (muted) videos do not trigger the load.                                            |

Each API is loaded at most once and then cached. Several clicks while a script is still loading share the same request and never create a second player. A failed load is forgotten, so the next click retries (the 15 s load timeout counts as a failure). Elements being initialized expose `data-dm-player-state` (`idle` / `active`).

### Opting out: `data-dm-preload`

Add `data-dm-preload` to a `.youtube` or `._init-plyr` element to restore the old behavior for that element: its API is requested as soon as the page is ready.

```html
<div class="youtube" data-type="vimeo" data-video-id="123456789" data-dm-preload>...</div>
```

Use this only if the site gates scripts behind consent itself. It sends the visitor's IP to the provider on page load. `data-dm-preload="false"` is the same as leaving it out.

### Autoplay on iOS / mobile

Mobile browsers (iOS Safari in particular) only start playback that is triggered by a user gesture, and they are strict about gestures that cross an asynchronous script load. How this is handled:

- **Before this change** (API loaded on page load): the YouTube player was created in the click and started with `playVideo()` from its `onReady` callback, i.e. after the iframe had loaded. Vimeo was created in the click with the `autoplay` option. Dailymotion's code path needed a player library the module never loaded (see the Dailymotion row above), so it did nothing.
- **Now**: for YouTube and Vimeo the iframe is created synchronously in the click handler with `autoplay=1`, so no `play()` call depends on the script that is loaded afterwards. For YouTube, `playVideo()` is additionally called from `onReady` when the player has not started, as before.
- **Known limit**: the very first YouTube video on a page needs the API script from a cold cache. In desktop WebKit, `playVideo()` is only honored shortly after the click, and with a cold API it arrives later than that; the visitor then sees the YouTube player and taps play once. Every later video on the page, and every video when the page opts into `data-dm-preload`, behaves like before. This was measured in Playwright WebKit (desktop), not on an iPhone.
- **Plyr**: the first click can only start native playback; moving the element into Plyr's wrapper pauses it and the module then calls `play()` again after the script has loaded, which a browser may refuse. The visitor presses play once more in that case.

## How It Works

1. On page load, click handlers are bound; no third-party request is made
2. When a video is clicked, its embed is created and the matching API (YouTube, Vimeo, Plyr) is loaded once
3. Event listeners ensure only one video plays at a time
4. Videos pause when slides change (if using Swiper)

`window.dmReinitVideoPlayers(container)` binds `.youtube` and `._init-plyr` elements added later (for example by a CMS list or a Swiper clone). It is also lazy and safe to call repeatedly.

## Requirements

The module loads these from their CDNs, on first use:

- Plyr CSS and JS (`cdn.plyr.io`)
- YouTube IFrame API
- Vimeo Player API

Dailymotion and ARD Mediathek use a simple iframe embed and need no external script.

## Notes

- All video platforms use the same `.youtube` class (legacy naming)
- The module only loads APIs that are actually used, and only after a click
- Works seamlessly with Swiper carousels
- YouTube thumbnail upgrades happen automatically - no configuration needed
- Thumbnail upgrades fall back gracefully if higher quality versions aren't available
- Vimeo `data-time` is applied as `#t=<n>s` on the embed; Dailymotion/YouTube use their `start` parameter
