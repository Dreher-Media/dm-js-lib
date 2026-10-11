/**
 * Resource Loader Utility
 * Handles dynamic loading of scripts, stylesheets, and other resources
 */

export type ResourceType = 'script' | 'stylesheet';

// Loads this module started and that have not settled yet. A second request for
// the same resource joins the first one instead of resolving early because the
// <script> tag already exists in the DOM but has not finished loading.
const inFlight = new Map<string, Promise<void>>();

/**
 * Loads a resource (script or stylesheet) dynamically and returns a promise
 * @param src - The URL of the resource to load
 * @param type - The type of resource ('script' or 'stylesheet')
 * @returns A promise that resolves when the resource is loaded
 */
export function loadResource(src: string, type: ResourceType = 'script'): Promise<void> {
  const key = `${type}:${src}`;
  const pending = inFlight.get(key);
  if (pending) return pending;

  // Check if resource is already loaded (or was added by the page itself)
  const selector =
    type === 'script' ? `script[src="${src}"]` : `link[rel="stylesheet"][href="${src}"]`;
  if (document.querySelector(selector)) return Promise.resolve();

  const promise = new Promise<void>((resolve, reject) => {
    if (type === 'script') {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        // Drop the dead tag so a later retry actually requests the file again
        script.remove();
        reject(new Error(`Failed to load script: ${src}`));
      };
      document.head.appendChild(script);
    } else if (type === 'stylesheet') {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = src;
      link.onload = () => resolve();
      link.onerror = () => {
        link.remove();
        reject(new Error(`Failed to load stylesheet: ${src}`));
      };
      document.head.appendChild(link);
    } else {
      reject(new Error(`Unsupported resource type: ${type}`));
    }
  });

  inFlight.set(key, promise);
  const clear = (): void => {
    inFlight.delete(key);
  };
  promise.then(clear, clear);
  return promise;
}

/**
 * Forgets a resource whose load never settled: removes its tag from the DOM and
 * drops the in-flight entry, so the next loadResource() call requests the file
 * again instead of joining a request that is not going to answer.
 */
export function discardResource(src: string, type: ResourceType = 'script'): void {
  inFlight.delete(`${type}:${src}`);
  const selector =
    type === 'script' ? `script[src="${src}"]` : `link[rel="stylesheet"][href="${src}"]`;
  document.querySelectorAll(selector).forEach((node) => node.remove());
}

/**
 * Convenience function to load a script
 * @param src - The URL of the script to load
 * @returns A promise that resolves when the script is loaded
 */
export function loadScript(src: string): Promise<void> {
  return loadResource(src, 'script');
}

/**
 * Convenience function to load a stylesheet
 * @param href - The URL of the stylesheet to load
 * @returns A promise that resolves when the stylesheet is loaded
 */
export function loadStylesheet(href: string): Promise<void> {
  return loadResource(href, 'stylesheet');
}
