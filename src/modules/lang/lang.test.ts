// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { restoreLanguage, switchLanguage } from './core';

const setBrowserLanguages = (languages: string[]) => {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(languages);
  vi.spyOn(navigator, 'language', 'get').mockReturnValue(languages[0] ?? '');
};

const mount = (htmlLang: string | null, offered: string[]) => {
  if (htmlLang === null) document.documentElement.removeAttribute('lang');
  else document.documentElement.setAttribute('lang', htmlLang);
  document.body.innerHTML = offered
    .map((l) => `<button data-lang-link="${l}"></button><div data-lang-content="${l}"></div>`)
    .join('');
  wireLinks();
};

// In production initLanguage wires the click handler; restoreLanguage only clicks the link.
const wireLinks = () =>
  document
    .querySelectorAll<HTMLElement>('[data-lang-link]')
    .forEach((el) => el.addEventListener('click', () => switchLanguage(el.dataset.langLink!)));

const visible = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-lang-content]'))
    .filter((el) => el.style.display !== 'none')
    .map((el) => el.dataset.langContent);

describe('restoreLanguage', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('prefers the browser language when the page offers it', () => {
    setBrowserLanguages(['en-US']);
    mount('de', ['en', 'de']);
    restoreLanguage();
    expect(visible()).toEqual(['en']);
  });

  it('falls back to the <html lang> language when the browser language is not offered', () => {
    setBrowserLanguages(['fr-FR']);
    mount('de', ['en', 'de']);
    restoreLanguage();
    expect(visible()).toEqual(['de']);
  });

  it('falls back to English when <html lang> is missing', () => {
    setBrowserLanguages(['fr-FR']);
    mount(null, ['en', 'de']);
    restoreLanguage();
    expect(visible()).toEqual(['en']);
  });

  it('falls back to English when the <html lang> language is not offered', () => {
    setBrowserLanguages(['fr-FR']);
    mount('es', ['en', 'de']);
    restoreLanguage();
    expect(visible()).toEqual(['en']);
  });

  it('keeps a language chosen earlier in the session', () => {
    setBrowserLanguages(['fr-FR']);
    mount('de', ['en', 'de']);
    sessionStorage.setItem('selected_lang', 'en');
    restoreLanguage();
    expect(visible()).toEqual(['en']);
  });
});
