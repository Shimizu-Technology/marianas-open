import { useEffect, useState } from 'react';
import type { Event } from '../services/api';
import { useTranslatedField } from '../hooks/useTranslatedField';
import RegisterControl from './RegisterControl';
import { usePanelPresence } from '../hooks/usePanelPresence';

/** Keep registration within reach after the single hero entry point leaves the viewport. */
export default function MobileRegisterBar({ event }: { event: Event }) {
  const [visible, setVisible] = useState(false);
  const { tf } = useTranslatedField();
  const { present } = usePanelPresence(visible);
  useEffect(() => {
    const hero = document.getElementById('event-hero');
    if (!hero) return;
    const footer = document.querySelector('footer');
    let heroInView = true;
    // Wait for the initial footer observation before revealing the bar.
    let footerInView = !!footer;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.target === hero) heroInView = entry.isIntersecting;
        if (entry.target === footer) footerInView = entry.isIntersecting;
      }
      setVisible(!heroInView && !footerInView);
    }, { threshold: 0 });
    observer.observe(hero);
    if (footer) observer.observe(footer);
    return () => observer.disconnect();
  }, [event.id]);
  if (!present) return null;
  return <div className="mobile-register-bar md:hidden panel-backdrop" data-open={visible} aria-hidden={!visible || undefined} inert={!visible}><p className="min-w-0 text-sm text-text-secondary line-clamp-2">{tf(event, 'name')}</p><RegisterControl event={event} className="shrink-0" /></div>;
}
