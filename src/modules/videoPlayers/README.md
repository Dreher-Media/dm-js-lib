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
  <source src="/video.mp4" type="video/mp4">
</video>
```

### YouTube

```html
<div 
  class="youtube" 
  data-type="youtube"
  data-video-id="dQw4w9WgXcQ"
  data-id="player1"
  data-time="0">
  <img src="thumbnail.jpg" alt="Video thumbnail">
</div>
```

**Attributes:**
- `data-type="youtube"` - Specifies YouTube player
- `data-video-id` - YouTube video ID
- `data-id` - Unique player ID
- `data-time` - Start time in seconds (optional)

### Vimeo

```html
<div 
  class="youtube" 
  data-type="vimeo"
  data-video-id="123456789"
  data-id="player2"
  data-time="30">
  <img src="thumbnail.jpg" alt="Video thumbnail">
</div>
```

### Dailymotion

```html
<div 
  class="youtube" 
  data-type="dailymotion"
  data-video-id="x123abc"
  data-id="player3"
  data-time="0">
  <img src="thumbnail.jpg" alt="Video thumbnail">
</div>
```

### ARD Mediathek

```html
<div 
  class="youtube" 
  data-type="ardmediathek"
  data-video-id="Y3JpZDovL3N3ci5kZS9hZXgvbzExNjA0MTA"
  data-id="player4">
  <img src="thumbnail.jpg" alt="Video thumbnail">
</div>
```

**Attributes:**
- `data-type="ardmediathek"` - Specifies ARD Mediathek embed
- `data-video-id` - ARD Mediathek video ID (base64-style from their URLs)
- `data-id` - Unique player ID

On click, the thumbnail is replaced with an iframe embed. No external script is loaded.

**Play coordination:** Clicking an ARD embed triggers the same “on play” behavior as other players: other videos are paused and Swiper autoplay is stopped. Because ARD Mediathek does not expose a JavaScript API, the ARD iframe cannot be paused when another video is started, and Swiper autoplay is not resumed when the user pauses the ARD video.

### Other (open in new tab)

```html
<div 
  class="youtube" 
  data-type="other"
  data-video-id="https://example.com/video/123"
  data-id="player5">
  <img src="thumbnail.jpg" alt="Video thumbnail">
</div>
```

**Attributes:**
- `data-type="other"` - Opens the URL in a new tab (no embed)
- `data-video-id` - Full URL to the video page
- `data-id` - Unique player ID

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

## How It Works

1. The module detects which video platforms are needed
2. It loads the appropriate APIs (YouTube, Vimeo, Dailymotion, Plyr)
3. When a video thumbnail is clicked, it initializes the player
4. Event listeners ensure only one video plays at a time
5. Videos pause when slides change (if using Swiper)

## Requirements

The module automatically loads required APIs from CDN when needed:
- Plyr CSS and JS
- YouTube IFrame API
- Vimeo Player API
- Dailymotion Player Library

ARD Mediathek uses a simple iframe embed and does not require any external script.

## Notes

- All video platforms use the same `.youtube` class (legacy naming)
- The module only loads APIs that are actually needed
- Player initialization happens on click (lazy loading)
- Works seamlessly with Swiper carousels
- YouTube thumbnail upgrades happen automatically - no configuration needed
- Thumbnail upgrades fall back gracefully if higher quality versions aren't available
