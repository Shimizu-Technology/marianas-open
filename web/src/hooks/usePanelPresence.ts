import { useEffect, useState } from 'react';

/** Retain a dismissed panel only for its visual exit; semantics/focus follow open. */
export function usePanelPresence(open: boolean) {
  const [retained, setRetained] = useState(open);
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    if (open) {
      setRetained(true);
      setKeyboard(document.activeElement?.matches(':focus-visible') ?? false);
      return;
    }
    const timer = window.setTimeout(() => setRetained(false), 160);
    return () => window.clearTimeout(timer);
  }, [open]);
  return { present: open || retained, keyboard };
}
