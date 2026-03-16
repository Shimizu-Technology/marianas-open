import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileDown,
  Mail,
  Phone,
  Scale,
  Shield,
  Shirt,
  type LucideIcon,
} from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';

// PDF URL is driven by the environment variable VITE_RULEBOOK_PDF_URL.
// Set this to an S3 (or other CDN) URL in production once the compressed
// upload is ready.  Falls back to the local public copy so dev/preview
// always works without any additional config.
//
// Example .env.production:
//   VITE_RULEBOOK_PDF_URL=https://your-bucket.s3.amazonaws.com/2018-sjjif-rulebook.pdf
const RULEBOOK_PDF_URL =
  import.meta.env.VITE_RULEBOOK_PDF_URL || '/files/2018-sjjif-rulebook.pdf';

const ASJJF_RULES_URL = 'https://asjjf.org/main/rules?pagesType=RULE_BOOK';
const SJJIF_RULES_URL = 'https://sjjif.com/publicPages/pages?pagesType=RULE_BOOK';
const RULES_LAST_UPDATED_KEY = 'rules.lastUpdatedDate';

/** Maps i18n section keys to their Lucide icon. Icons cannot live in JSON. */
const SECTION_KEYS: Array<{ key: string; icon: LucideIcon }> = [
  { key: 'competitionFormat', icon: BookOpen },
  { key: 'giNoGi', icon: Shirt },
  { key: 'pointsAdvantages', icon: Scale },
  { key: 'illegalTechniques', icon: Shield },
  { key: 'matchTimes', icon: Clock3 },
];

export default function RulesPage() {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();

  const eventDayChecklist = t('rules.eventDayChecklist', {
    returnObjects: true,
  }) as string[];

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div
          className="mb-12"
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 border border-gold-500/30 rounded-full bg-gold-500/5">
            <BookOpen size={12} className="text-gold-500" />
            <span className="text-xs text-gold-400 font-heading uppercase tracking-widest font-medium">
              {t('rules.badge', 'Competitor guide')}
            </span>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gold-500/10 rounded-lg border border-gold-500/20">
              <BookOpen size={24} className="text-gold-500" />
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold">
              {t('rules.title', 'Competition Rules')}
            </h1>
          </div>
          <p className="text-text-secondary max-w-3xl leading-relaxed">
            {t(
              'rules.subtitle',
              'A clearer, first-party overview of the standards competitors should expect at Marianas Open events.'
            )}
          </p>
        </motion.div>

        {/* Intro + primary CTA */}
        <ScrollReveal>
          <div className="bg-surface border border-white/5 rounded-2xl p-6 sm:p-8 mb-10">
            <div className="grid gap-8 lg:grid-cols-[1.7fr_1fr] lg:items-start">
              <div>
                <p className="text-text-primary text-lg leading-relaxed mb-4">
                  {t(
                    'rules.intro',
                    'This page summarizes the rule areas competitors most often need before weigh-ins, bracket checks, and match day. It is designed to be easier to use than sending athletes into broken third-party rule pages.'
                  )}
                </p>
                <p className="text-text-secondary leading-relaxed">
                  {t(
                    'rules.note',
                    'Use the summaries below to prepare, then reference the official ASJJF rules source and supporting SJJIF rulebook resources. If an organizer bulletin, bracket note, or official announcement gives event-specific instructions, follow those instructions on event day.'
                  )}
                </p>
              </div>
              <div className="bg-navy-900/60 border border-white/5 rounded-xl p-5">
                <p className="text-sm font-heading font-semibold uppercase tracking-[0.2em] text-text-muted mb-3">
                  {t('rules.rulebookLabel', 'Downloadable rules copy')}
                </p>
                <p className="text-sm text-text-secondary leading-relaxed mb-5">
                  {t(
                    'rules.rulebookCopy',
                    'Download a PDF copy of the SJJIF rulebook used as a supporting reference alongside ASJJF guidance.'
                  )}
                </p>
                <a
                  href={RULEBOOK_PDF_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 px-4 py-3 bg-gold-500 text-navy-900 font-heading font-bold uppercase tracking-wider text-sm hover:opacity-90 transition-opacity"
                >
                  <FileDown size={16} />
                  {t('rules.downloadPdf', 'Download rules PDF')}
                </a>
                <p className="text-xs text-text-muted mt-3">
                  {t('rules.opensExternally', 'Opens the downloadable rules PDF in a new tab.')}
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Rule sections — content driven by i18n */}
        <div className="grid gap-5 lg:grid-cols-2 mb-12">
          {SECTION_KEYS.map(({ key, icon: Icon }, i) => {
            const title = t(`rules.sections.${key}.title`);
            const description = t(`rules.sections.${key}.description`);
            const items = t(`rules.sections.${key}.items`, {
              returnObjects: true,
            }) as string[];

            return (
              <ScrollReveal key={key} delay={i * 0.06}>
                <section className="bg-surface border border-white/5 rounded-2xl p-6 h-full">
                  <div className="flex items-start gap-4 mb-5">
                    <div className="p-3 bg-gold-500/10 rounded-xl border border-gold-500/20 shrink-0">
                      <Icon size={18} className="text-gold-500" />
                    </div>
                    <div>
                      <h2 className="font-heading text-xl font-bold text-text-primary mb-1">
                        {title}
                      </h2>
                      <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {Array.isArray(items) &&
                      items.map((item, itemIndex) => (
                        <div key={`${key}-${itemIndex}`} className="flex items-start gap-3">
                          <CheckCircle2 size={16} className="text-gold-500 shrink-0 mt-0.5" />
                          <p className="text-sm text-text-secondary leading-relaxed">{item}</p>
                        </div>
                      ))}
                  </div>
                </section>
              </ScrollReveal>
            );
          })}
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <ScrollReveal delay={0.28}>
            <section className="bg-surface border border-white/5 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 bg-gold-500/10 rounded-xl border border-gold-500/20">
                  <AlertTriangle size={18} className="text-gold-500" />
                </div>
                <div>
                  <h2 className="font-heading text-xl font-bold text-text-primary">
                    {t('rules.eventDayTitle', 'Event-day reminders')}
                  </h2>
                  <p className="text-sm text-text-secondary">
                    {t(
                      'rules.eventDaySubtitle',
                      'The operational details below are just as important as the technical rules.'
                    )}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {Array.isArray(eventDayChecklist) &&
                  eventDayChecklist.map((item, checklistIndex) => (
                    <div key={`event-day-${checklistIndex}`} className="flex items-start gap-3">
                      <CheckCircle2 size={16} className="text-gold-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-text-secondary leading-relaxed">{item}</p>
                    </div>
                  ))}
              </div>
            </section>
          </ScrollReveal>

          <ScrollReveal delay={0.34}>
            <section className="bg-surface border border-white/5 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 bg-gold-500/10 rounded-xl border border-gold-500/20">
                  <ExternalLink size={18} className="text-gold-500" />
                </div>
                <div>
                  <h2 className="font-heading text-xl font-bold text-text-primary">
                    {t('rules.fullRulebookTitle', 'Need the full federation language?')}
                  </h2>
                  <p className="text-sm text-text-secondary">
                    {t(
                      'rules.fullRulebookSubtitle',
                      'ASJJF is the primary official rules reference for this event series. SJJIF materials remain available as the underlying rulebook resource.'
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <a
                  href={ASJJF_RULES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-gold-500 hover:underline"
                >
                  <ExternalLink size={16} />
                  {t('rules.officialSourceLinkText', 'Open official ASJJF rules')}
                </a>
                <a
                  href={SJJIF_RULES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-text-secondary hover:text-gold-500 transition-colors"
                >
                  <ExternalLink size={16} />
                  {t('rules.secondarySourceLinkText', 'Open SJJIF rulebook resources')}
                </a>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mt-4">
                {t(
                  'rules.footerNote',
                  'This local guide is meant to improve clarity and avoid dead-end links. It does not replace official ASJJF guidance, SJJIF rulebook language, or event-specific organizer instructions.'
                )}
              </p>
            </section>
          </ScrollReveal>
        </div>

        <div className="grid gap-5 lg:grid-cols-2 mt-5">
          <ScrollReveal delay={0.36}>
            <section className="bg-surface border border-white/5 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 bg-gold-500/10 rounded-xl border border-gold-500/20">
                  <CalendarDays size={18} className="text-gold-500" />
                </div>
                <div>
                  <h2 className="font-heading text-xl font-bold text-text-primary">
                    {t('rules.maintenanceTitle', 'Page status')}
                  </h2>
                  <p className="text-sm text-text-secondary">
                    {t(
                      'rules.maintenanceSubtitle',
                      'This guide is maintained locally so competitors are not sent to unreliable third-party rules pages.'
                    )}
                  </p>
                </div>
              </div>
              <div className="space-y-3 text-sm text-text-secondary">
                <p>
                  <span className="text-text-primary font-semibold">
                    {t('rules.lastUpdatedLabel', 'Last updated:')}
                  </span>{' '}
                  {t(RULES_LAST_UPDATED_KEY, 'March 2026')}
                </p>
                <p>
                  {t(
                    'rules.maintenanceBody',
                    'If federation language, organizer procedures, or event-day requirements change, this page should be updated to match the latest approved guidance.'
                  )}
                </p>
              </div>
            </section>
          </ScrollReveal>

          <ScrollReveal delay={0.4}>
            <section className="bg-surface border border-white/5 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 bg-gold-500/10 rounded-xl border border-gold-500/20">
                  <Mail size={18} className="text-gold-500" />
                </div>
                <div>
                  <h2 className="font-heading text-xl font-bold text-text-primary">
                    {t('rules.contactTitle', 'Questions about the rules?')}
                  </h2>
                  <p className="text-sm text-text-secondary">
                    {t(
                      'rules.contactSubtitle',
                      'For event-specific clarifications, bracket issues, or organizer instructions, contact the Marianas Open team directly.'
                    )}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <a
                  href="mailto:steveshimizu@outlook.com"
                  className="flex items-center gap-3 text-text-secondary hover:text-gold-500 transition-colors"
                >
                  <Mail size={16} className="shrink-0" />
                  <span>steveshimizu@outlook.com</span>
                </a>
                <a
                  href="tel:+16717779044"
                  className="flex items-center gap-3 text-text-secondary hover:text-gold-500 transition-colors"
                >
                  <Phone size={16} className="shrink-0" />
                  <span>(671) 777-9044</span>
                </a>
                <p className="text-sm text-text-muted">
                  {t(
                    'rules.contactNote',
                    'Use the federation rules source or downloadable PDF for full rule language, but use the organizer contact above when you need answers specific to this event series.'
                  )}
                </p>
              </div>
            </section>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={0.4}>
          <div className="border-t border-white/5 pt-8 mt-12">
            <p className="text-text-muted text-sm text-center">
              {t('rules.footerCta', 'Official rules references:')}{' '}
              <a
                href={ASJJF_RULES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold-500 hover:underline"
              >
                asjjf.org
              </a>
              {' · '}
              <a
                href={SJJIF_RULES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-secondary hover:text-gold-500 hover:underline transition-colors"
              >
                sjjif.com
              </a>
            </p>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
