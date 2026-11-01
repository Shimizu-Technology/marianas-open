import { useEffect, useRef, type RefObject } from 'react';

const focusable = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Modal lifecycle: isolate the page, contain keyboard focus, and restore the opener. */
export function useModalFocus(open: boolean, ref: RefObject<HTMLElement | null>, onClose: () => void) {
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = document.getElementById('root');
    const wasInert = root?.inert;
    const bodyStyle = document.body.style.cssText;
    const scrollY = window.scrollY;
    const path = window.location.pathname;
    const gutter = window.innerWidth - document.documentElement.clientWidth;
    if (root) root.inert = true;
    Object.assign(document.body.style, {
      position: 'fixed', top: `-${scrollY}px`, width: '100%', overflow: 'hidden',
      paddingRight: gutter > 0 ? `${gutter}px` : document.body.style.paddingRight,
    });
    const getTargets = () => Array.from(dialog.querySelectorAll<HTMLElement>(focusable)).filter(el => !el.hidden && el.getAttribute('aria-hidden') !== 'true');
    const focusFirst = () => (getTargets()[0] || dialog).focus();
    focusFirst();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key === 'Tab') {
        const targets = getTargets();
        const first = targets[0];
        const last = targets.at(-1);
        if (!first) { event.preventDefault(); dialog.focus(); }
        else if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
          event.preventDefault(); first.focus();
        }
      }
    };
    const focusin = (event: FocusEvent) => {
      if (!dialog.contains(event.target as Node)) focusFirst();
    };
    document.addEventListener('keydown', keydown);
    document.addEventListener('focusin', focusin);
    return () => {
      document.removeEventListener('keydown', keydown);
      document.removeEventListener('focusin', focusin);
      if (root) root.inert = wasInert ?? false;
      document.body.style.cssText = bodyStyle;
      opener?.focus({ preventScroll: true });
      if (window.location.pathname === path) window.scrollTo({ top: scrollY, behavior: 'instant' });
    };
  }, [open, ref]);
}
