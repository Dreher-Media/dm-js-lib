/**
 * Biography Language Module
 * Handles language switching for biography sections with session storage persistence
 */
export function initBiographyLang(): void {
  document
    .querySelectorAll(".biography-lang-links .tab-link[data-lang]")
    .forEach((el) => {
      el.addEventListener("click", (event) => {
        const target = event.currentTarget as HTMLElement;
        const lang = target.dataset?.lang;

        if (!lang) return;

        // Store selected language in session storage
        sessionStorage.setItem("selected_lang", lang);

        // Hide all biography texts except the selected language
        document
          .querySelectorAll(`.biography-text:not(.${lang})`)
          .forEach((bioEl) => {
            (bioEl as HTMLElement).style.display = "none";
          });

        // Show biography texts for the selected language
        document
          .querySelectorAll(`.biography-text.${lang}`)
          .forEach((bioEl) => {
            (bioEl as HTMLElement).style.display = "block";
          });

        // Update tab link active states
        document
          .querySelectorAll(
            `.biography-lang-links .tab-link:not([data-lang="${lang}"])`
          )
          .forEach((tabEl) => {
            tabEl.classList.remove("active");
          });

        document
          .querySelectorAll(`.biography-lang-links .tab-link[data-lang="${lang}"]`)
          .forEach((tabEl) => {
            tabEl.classList.add("active");
          });
      });
    });
}

