import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../ui';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function FilterSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const siblings = Array.from(document.body.children).filter(
      (node): node is HTMLElement => node instanceof HTMLElement && node !== root.current
    );
    const inert = siblings.map((node) => node.inert);
    siblings.forEach((node) => {
      node.inert = true;
    });
    const controls = () =>
      Array.from(
        dialog.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), select:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]'
        ) ?? []
      );
    controls()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key !== 'Tab') return;
      const items = controls();
      const first = items[0];
      const last = items.at(-1);
      if (
        event.shiftKey &&
        (document.activeElement === first || !dialog.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || !dialog.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        first?.focus();
      }
    };
    const focusin = () => {
      if (!dialog.current?.contains(document.activeElement)) controls()[0]?.focus();
    };
    document.addEventListener('keydown', keydown);
    document.addEventListener('focusin', focusin);
    return () => {
      document.removeEventListener('keydown', keydown);
      document.removeEventListener('focusin', focusin);
      document.body.style.overflow = overflow;
      siblings.forEach((node, index) => {
        node.inert = inert[index];
      });
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div
      ref={root}
      className="fixed inset-0 z-[90] flex items-end bg-black/70"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className="max-h-[90dvh] w-full overflow-y-auto overscroll-contain bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] transition-transform duration-200 ease-[var(--ease-out)] starting:translate-y-full motion-reduce:transition-none"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h3 id={id} className="font-heading text-xl font-semibold">
            {t('results.filters')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('results.closeFilters')}
            className="flex min-h-11 min-w-11 items-center justify-center text-text-secondary"
          >
            <X size={22} />
          </button>
        </div>
        {children}
        <Button onClick={onClose} className="mt-6 w-full">
          {t('results.showResults')}
        </Button>
      </div>
    </div>,
    document.body
  );
}
