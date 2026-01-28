/**
 * Utilities Module
 * A collection of small utility functions for common website tasks
 */

/**
 * Active Link Utility
 * Highlights active navigation links based on current pathname
 */
function initActiveLinks(): void {
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

/**
 * File Download Utility
 * Handles file downloads via data-download-href attribute
 */
function initFileDownload(): void {
  document.addEventListener("DOMContentLoaded", () => {
    const downloadFile = (url: string, filename?: string | null): void => {
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || url.split("/").pop() || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    // Add event listeners to all elements with the [data-download-href] attribute
    document.querySelectorAll("[data-download-href]").forEach((element) => {
      element.addEventListener("click", (event) => {
        event.preventDefault(); // Prevent the default action (if it's a link)
        event.stopPropagation();

        const url = element.getAttribute("data-download-href");
        const filename = element.getAttribute("data-download-filename"); // Optional filename attribute

        if (url) {
          downloadFile(url, filename);
        }
      });
    });
  });
}

/**
 * Separators Utility
 * Dynamically inserts separators between child elements based on data-separator attribute
 */
function initSeparators(): void {
  document.addEventListener("DOMContentLoaded", () => {
    const addSeparatorsByDataAttribute = (): void => {
      // Find all elements in the document with data-separator attribute
      const matchingElements = document.querySelectorAll("[data-separator]");

      // Process each matching element
      matchingElements.forEach((element) => {
        // Get the separator text from the data-separator attribute
        const separatorText = element.getAttribute("data-separator");
        if (!separatorText) return;

        // Get all child elements of the current element
        const children = Array.from(element.children);

        // Iterate through the children and insert separators
        children.forEach((child, index) => {
          if (index < children.length - 1) {
            // No separator after the last child
            // Create a new separator element
            const separator = document.createElement("span");
            separator.innerHTML = `${separatorText}`;

            // Insert the separator after the current child
            child.insertAdjacentElement("afterend", separator);
          }
        });
      });
    };

    addSeparatorsByDataAttribute();
  });
}

/**
 * Webflow Initialization Utility
 * Handles Webflow-specific initialization tasks
 */
function initWebflow(): void {
  if (typeof window.Webflow !== "undefined") {
    window.Webflow.push(() => {
      // Update copyright year
      const copyrightElements = document.querySelectorAll(".copyright-year");
      copyrightElements.forEach((el) => {
        el.textContent = new Date().getFullYear().toString();
      });
    });
  }
}

/**
 * Initialize all utilities
 */
export function initUtilities(): void {
  initActiveLinks();
  initFileDownload();
  initSeparators();
  initWebflow();
}
