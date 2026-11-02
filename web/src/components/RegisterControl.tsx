import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ExternalLink, X } from 'lucide-react';
import { usePublicCopy } from '../hooks/usePublicCopy';
import { useModalFocus } from '../hooks/useModalFocus';
import { getRegistrationLinks } from '../utils/registrationLinks';
import { Button } from './ui';
import { registrationState, type RegistrationEvent } from './registrationState';
import { getDateLocale, parseDateLocalSafe } from '../utils/dateLocale';

export default function RegisterControl({ event, className = '', variant = 'primary' }: {
  event: RegistrationEvent | null | undefined;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
}) {
  const { t, i18n } = usePublicCopy();
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useModalFocus(open, dialog, () => setOpen(false));
  const links = getRegistrationLinks(event);
  const choices = links.hasDirect
    ? [{ href: links.gi, label: t('calendar.registerGi') }, { href: links.nogi, label: t('calendar.registerNogi') }].filter(link => link.href)
    : links.legacy ? [{ href: links.legacy, label: t('calendar.register') }] : [];
  const state = registrationState(event);
  if (state === 'closed' || !choices.length) return null;
  if (state !== 'open') {
    const date = event?.registration_opens_on;
    return <div className={`space-y-2 ${className}`}><p className="text-sm text-text-secondary" role="status">{state === 'scheduled' && date
      ? t('visualRefresh.registrationOpens', { date: parseDateLocalSafe(date).toLocaleDateString(getDateLocale(i18n.language), { year: 'numeric', month: 'long', day: 'numeric' }) })
      : t('visualRefresh.registrationPending')}</p><Button href={links.legacy || links.gi || links.nogi} target="_blank" rel="noopener noreferrer" variant="secondary">{t('visualRefresh.eventInfo')}<ExternalLink size={16} aria-hidden="true" /></Button></div>;
  }
  if (choices.length === 1) return <Button href={choices[0].href} target="_blank" rel="noopener noreferrer" variant={variant} className={className}>{choices[0].label}<ExternalLink size={16} aria-hidden="true" /></Button>;
  return <>
    <Button variant={variant} className={className} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>{t('calendar.register')}<ChevronDown size={16} aria-hidden="true" /></Button>
    {open && createPortal(<div className="register-backdrop" onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="register-dialog ui-card">
        <div className="flex items-center justify-between gap-4 mb-6"><h2 id={titleId} className="font-heading text-2xl font-semibold">{t('calendar.register')}</h2><Button variant="ghost" onClick={() => setOpen(false)} aria-label={t('visualRefresh.close')}><X size={20} aria-hidden="true" /></Button></div>
        <div className="grid gap-3">{choices.map(choice => <Button key={choice.href} href={choice.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>{choice.label}<ExternalLink size={16} aria-hidden="true" /></Button>)}</div>
      </div>
    </div>, document.body)}
  </>;
}
