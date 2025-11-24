/**
 * Active Link Module
 * Highlights active navigation links based on current pathname
 */
export function initActiveLinks(): void {
  const normalizePath = (path: string | null): string => {
    const normalized = (path || "")
      .replace(/\/+$/, "") // remove trailing slashes
      .replace(/\.html?$/i, ""); // remove .html/.htm
    return normalized === "" ? "/" : normalized;
  };

  const highlightActiveLinks = (): void => {
    const currentPath = normalizePath(window.location.pathname);

    document.querySelectorAll("a[href]").forEach((el) => {
      const rawHref = el.getAttribute("href");
      if (!rawHref) return;

      // Skip non-navigational anchors and javascript: links
      if (
        rawHref.startsWith("#") ||
        rawHref.toLowerCase().startsWith("javascript:")
      ) {
        return;
      }

      let url: URL;
      try {
        // Resolve relative links against the current page URL
        url = new URL(rawHref, window.location.href);
      } catch {
        return; // malformed href, ignore
      }

      // Only consider same-origin links
      if (url.origin !== window.location.origin) return;

      const linkPath = normalizePath(url.pathname);

      if (linkPath === currentPath) {
        el.classList.add("w--current");
      }
    });
  };

  window.addEventListener("load", highlightActiveLinks);
}

