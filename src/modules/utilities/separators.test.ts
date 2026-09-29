// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { initUtilities } from './index';

// initUtilities defers each utility to DOMContentLoaded; capture those handlers
// and run them directly so handlers from earlier tests don't pile up.
function runInitUtilities(): void {
  const spy = vi.spyOn(document, 'addEventListener');
  initUtilities();
  const handlers = spy.mock.calls
    .filter(([type]) => type === 'DOMContentLoaded')
    .map(([, handler]) => handler as () => void);
  spy.mockRestore();
  handlers.forEach((handler) => handler());
}

const list = (separator: string) => {
  const container = document.createElement('div');
  container.id = 'list';
  container.setAttribute('data-separator', separator);
  for (const label of ['One', 'Two', 'Three']) {
    const item = document.createElement('span');
    item.textContent = label;
    container.appendChild(item);
  }
  document.body.appendChild(container);
  return container;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('data-separator', () => {
  it('inserts the separator text between children, not after the last one', () => {
    const container = list(', ');
    runInitUtilities();

    expect(container.textContent).toBe('One, Two, Three');
    expect(container.children).toHaveLength(5);
  });

  it('keeps characters the HTML parser already decoded from entities', () => {
    document.body.innerHTML =
      '<div id="list" data-separator="&nbsp;|&nbsp;"><span>A</span><span>B</span></div>';
    runInitUtilities();

    expect(document.getElementById('list')?.textContent).toBe('A | B');
  });

  it('renders markup in the attribute as literal text instead of parsing it', () => {
    const payload = '<img src="x" onerror="window.__separatorXss = true">';
    const container = list(payload);
    runInitUtilities();

    const separators = Array.from(container.children).filter((el) => el.textContent === payload);
    expect(separators).toHaveLength(2);
    separators.forEach((el) => expect(el.children).toHaveLength(0));
    expect(document.querySelector('img')).toBeNull();
  });
});
