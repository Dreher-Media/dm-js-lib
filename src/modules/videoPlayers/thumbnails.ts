/**
 * Video Players Module - YouTube Thumbnails
 * Checks and upgrades YouTube thumbnail quality by trying different sizes
 */

const YOUTUBE_THUMBNAIL_HOSTS = ['img.youtube.com', 'i.ytimg.com'];

/**
 * True only for an image that is really served by YouTube. A thumbnail the build
 * has already copied to the site itself (`/libs/img.youtube.com/vi/<id>/…`) keeps
 * the host name in its path but is not one: probing a smaller size there would only
 * produce 404s on the site's own server, and the build already picked the size.
 */
function isYouTubeImage(src: string): boolean {
  try {
    return YOUTUBE_THUMBNAIL_HOSTS.includes(new URL(src, document.baseURI).hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Initializes YouTube thumbnail quality upgrade
 */
export function initYouTubeThumbnails(): void {
  document.addEventListener('DOMContentLoaded', () => {
    const thumbnailSizes = ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault', 'default'];

    const checkYouTubeThumbnails = (el: HTMLImageElement, currentIndex = 0): void => {
      if (el.naturalWidth > 120) return;

      if (currentIndex >= thumbnailSizes.length) {
        return;
      }

      const size = thumbnailSizes[currentIndex];
      const originalSrc = el.src;

      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth > 120) {
          el.src = img.src;
        } else {
          checkYouTubeThumbnails(el, currentIndex + 1);
        }
      };
      img.onerror = () => {
        checkYouTubeThumbnails(el, currentIndex + 1);
      };
      img.src = originalSrc.replace(/maxresdefault/, size);
    };

    document.querySelectorAll('.youtube img').forEach((el) => {
      const img = el as HTMLImageElement;
      if (!isYouTubeImage(img.src)) return;
      checkYouTubeThumbnails(img);
    });
  });
}
