/**
 * Resource Loader Utility
 * Handles dynamic loading of scripts, stylesheets, and other resources
 */

export type ResourceType = "script" | "stylesheet";

/**
 * Loads a resource (script or stylesheet) dynamically and returns a promise
 * @param src - The URL of the resource to load
 * @param type - The type of resource ('script' or 'stylesheet')
 * @returns A promise that resolves when the resource is loaded
 */
export function loadResource(src: string, type: ResourceType = "script"): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if resource is already loaded
    const selector =
      type === "script" ? `script[src="${src}"]` : `link[rel="stylesheet"][href="${src}"]`;
    const existingResource = document.querySelector(selector);
    if (existingResource) {
      resolve();
      return;
    }

    if (type === "script") {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    } else if (type === "stylesheet") {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = src;
      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to load stylesheet: ${src}`));
      document.head.appendChild(link);
    } else {
      reject(new Error(`Unsupported resource type: ${type}`));
    }
  });
}

/**
 * Convenience function to load a script
 * @param src - The URL of the script to load
 * @returns A promise that resolves when the script is loaded
 */
export function loadScript(src: string): Promise<void> {
  return loadResource(src, "script");
}

/**
 * Convenience function to load a stylesheet
 * @param href - The URL of the stylesheet to load
 * @returns A promise that resolves when the stylesheet is loaded
 */
export function loadStylesheet(href: string): Promise<void> {
  return loadResource(href, "stylesheet");
}
