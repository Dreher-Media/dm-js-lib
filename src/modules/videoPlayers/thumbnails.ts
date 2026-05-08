/**
 * Video Players Module - YouTube Thumbnails
 * Checks and upgrades YouTube thumbnail quality by trying different sizes
 */

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
      checkYouTubeThumbnails(el as HTMLImageElement);
    });
  });
}
