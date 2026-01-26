# Video Players Module

Manages video players from multiple platforms (Plyr, YouTube, Vimeo, Dailymotion) with automatic pause/play coordination.

## What It Does

This module automatically initializes and manages video players from different platforms. When one video plays, others automatically pause, ensuring a smooth viewing experience.

## Supported Platforms

- **Plyr** - HTML5 video player
- **YouTube** - YouTube embeds
- **Vimeo** - Vimeo embeds
- **Dailymotion** - Dailymotion embeds

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

The module automatically loads required APIs from CDN:
- Plyr CSS and JS
- YouTube IFrame API
- Vimeo Player API
- Dailymotion Player Library

## Notes

- All video platforms use the same `.youtube` class (legacy naming)
- The module only loads APIs that are actually needed
- Player initialization happens on click (lazy loading)
- Works seamlessly with Swiper carousels
- YouTube thumbnail upgrades happen automatically - no configuration needed
- Thumbnail upgrades fall back gracefully if higher quality versions aren't available
