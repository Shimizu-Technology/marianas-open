import { useEffect, useState } from 'react';
import type { Event } from '../services/api';
import { useTranslatedField } from '../hooks/useTranslatedField';
import RegisterControl from './RegisterControl';

/** Keep registration within reach after the single hero entry point leaves the viewport. */
export default function MobileRegisterBar({ event }: { event: Event }) {
  const [visible, setVisible] = useState(false);
  const { tf } = useTranslatedField();
  useEffect(() => {
    const hero = document.getElementById('event-hero');
    if (!hero) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), { threshold: 0 });
    observer.observe(hero);
    return () => observer.disconnect();
  }, [event.id]);
  if (!visible) return null;
  return <div className="mobile-register-bar md:hidden"><p className="min-w-0 text-sm text-text-secondary line-clamp-2">{tf(event, 'name')}</p><RegisterControl event={event} className="shrink-0" /></div>;
}
