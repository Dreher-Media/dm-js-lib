/**
 * File Download Module
 * Handles file downloads via data-download-href attribute
 */
export function initFileDownload(): void {
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
}

