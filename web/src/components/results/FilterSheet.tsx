import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../ui';
import { X } from 'lucide-react';
import { useModalFocus } from '../../hooks/useModalFocus';
import { usePanelPresence } from '../../hooks/usePanelPresence';
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
  const { present, keyboard } = usePanelPresence(open);
  const id = useId();
  const dialog = useRef<HTMLDivElement>(null);
  useModalFocus(open, dialog, onClose);
  if (!present) return null;
  return createPortal(
    <div
      className="panel-backdrop fixed inset-0 z-[90] flex items-end bg-black/70"
      data-open={open} data-keyboard={keyboard} aria-hidden={!open || undefined} inert={!open}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className="max-h-[90dvh] w-full overflow-y-auto overscroll-contain bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] panel-surface panel-sheet"
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
