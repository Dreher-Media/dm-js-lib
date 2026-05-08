/**
 * Cookie Consent Module
 * Handles FsCC (Finsweet Cookie Consent) reject functionality
 * Toggles visibility of elements based on consent state
 */
export function initCookieConsent(): void {
  let initFsCCListener = false;
  let waitAttempts = 0;
  // ~10s total at 200ms intervals — covers slow networks but stops eventually
  // if FsCC is not present on the page.
  const MAX_WAIT_ATTEMPTS = 50;

  const handleFsCcReject = (): void => {
    if (!window.FsCC) {
      if (waitAttempts++ < MAX_WAIT_ATTEMPTS) {
        setTimeout(handleFsCcReject, 200);
      }
      return;
    }
    waitAttempts = 0;

    if (!initFsCCListener) {
      // Add a listener for changes in consent preferences
      window.FsCC.consentController.on('updateconsents', () => {
        handleFsCcReject(); // Run the function whenever consent changes
      });
      initFsCCListener = true;
    }

    // Iterate through all elements with fs-cc-reject attributes
    document.querySelectorAll('[fs-cc-reject]').forEach((rejectElement) => {
      const category = rejectElement.getAttribute('fs-cc-reject');
      if (!category) return;

      const isConsentGiven = window.FsCC?.store.consents[category] ?? false;

      // Find the corresponding fs-cc element
      const consentElement = document.querySelector(`[fs-cc="${category}"]`) as HTMLElement | null;

      // Toggle visibility based on consent state
      if (isConsentGiven) {
        (rejectElement as HTMLElement).style.display = 'none'; // Hide the reject element
        if (consentElement) consentElement.style.display = 'block'; // Show the consented content
      } else {
        (rejectElement as HTMLElement).style.display = 'block'; // Show the reject element
        if (consentElement) consentElement.style.display = 'none'; // Hide the consented content
      }
    });
  };

  // Run the script on page load
  document.addEventListener('DOMContentLoaded', handleFsCcReject);
}
