/**
 * Separators Module
 * Dynamically inserts separators between child elements based on data-separator attribute
 */
export function initSeparators(): void {
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
            separator.innerHTML = `&nbsp;${separatorText}&nbsp;`;

            // Insert the separator after the current child
            child.insertAdjacentElement("afterend", separator);
          }
        });
      });
    };

    addSeparatorsByDataAttribute();
  });
}
