/**
 * Modal mechanics for the post popup: open/close toggle `data-open` (the CSS animates on it),
 * `aria-hidden` / `inert` flip, the page behind does not scroll, `Esc` closes, `Tab` is trapped
 * inside while open, focus is handed to the caller. `modal:open` / `modal:close` bubble from the root.
 *
 * The same contract as `@dreher-media/site-kit/modal` (the engine behind the Astro popup), small
 * enough to live here because this package is public and has no dependencies.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

const roots = new Map<string, HTMLElement>();
let scrollLock: { overflow: string } | null = null;

function lockScroll(): void {
  if (scrollLock) return;
  scrollLock = { overflow: document.body.style.overflow };
  document.body.style.overflow = 'hidden';
}

function unlockScroll(): void {
  if (!scrollLock) return;
  document.body.style.overflow = scrollLock.overflow;
  scrollLock = null;
}

/** Make a `[data-modal]` root a dialog: closed, inert, with Esc, the Tab trap and the backdrop click. */
export function initModals(scope: ParentNode = document): void {
  scope.querySelectorAll<HTMLElement>('[data-modal]').forEach((root) => {
    if (root.hasAttribute('data-modal-ready') || !root.id) return;
    root.setAttribute('data-modal-ready', '');
    if (!root.getAttribute('role')) root.setAttribute('role', 'dialog');
    if (!root.getAttribute('aria-modal')) root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-hidden', 'true');
    root.setAttribute('inert', '');
    roots.set(root.id, root);

    root.addEventListener('click', (event) => {
      if (event.target === root) closeModal(root.id);
    });
    root.addEventListener('keydown', (event) => {
      if (root.dataset.open !== 'true') return;
      if (event.key === 'Escape') {
        closeModal(root.id);
        return;
      }
      if (event.key !== 'Tab') return;
      const targets = focusables(root);
      const first = targets[0];
      const last = targets[targets.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  });
}

export function openModal(id: string): void {
  const root = roots.get(id);
  if (!root) return;
  root.dataset.open = 'true';
  root.setAttribute('aria-hidden', 'false');
  root.removeAttribute('inert');
  lockScroll();
  (focusables(root)[0] ?? root).focus();
  root.dispatchEvent(new CustomEvent('modal:open', { bubbles: true }));
}

export function closeModal(id: string): void {
  const root = roots.get(id);
  if (root?.dataset.open !== 'true') return;
  root.dataset.open = 'false';
  root.setAttribute('aria-hidden', 'true');
  root.setAttribute('inert', '');
  unlockScroll();
  root.dispatchEvent(new CustomEvent('modal:close', { bubbles: true }));
}
