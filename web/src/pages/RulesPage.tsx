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

const RULEBOOK_PDF_URL = '/files/2018-sjjif-rulebook.pdf';
const SJJIF_RULES_URL = 'https://sjjif.com/publicPages/pages?pagesType=RULE_BOOK';
const RULES_LAST_UPDATED = 'March 2026';

const ruleSections: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
  items: string[];
}> = [
  {
    title: 'Competition format',
    description: 'How matches are structured, officiated, and decided.',
    icon: BookOpen,
    items: [
      'Matches follow federation-style brackets, referee commands, and division rules.',
      'Age group, belt rank, and match procedures can change what is allowed in a division.',
      'Organizer announcements, posted brackets, and mat-side instructions still matter on event day.',
    ],
  },
  {
    title: 'Gi and no-gi uniforms',
    description: 'What athletes should wear and what can cause a uniform check failure.',
    icon: Shirt,
    items: [
      'Uniforms must be clean, competition-ready, and free of tears or unsafe alterations.',
      'No-gi gear must fit properly, and shorts should not include exposed zippers or unsafe pockets.',
      'If gear does not meet inspection standards, competitors may need to change before competing.',
    ],
  },
  {
    title: 'Points and advantages',
    description: 'How positional scoring, advantages, and penalties affect a result.',
    icon: Scale,
    items: [
      'Scoring follows the rulebook for positional control, takedowns, sweeps, passes, and dominant finishes.',
      'Advantages and penalties are used when points do not fully separate competitors.',
      'Referee judgment and table decisions should be treated as the official result on the mat.',
    ],
  },
  {
    title: 'Illegal techniques and safety',
    description: 'Safety expectations, foul categories, and disqualification risks.',
    icon: Shield,
    items: [
      'Illegal moves vary by belt rank and age division, so athletes should review the full rulebook before competing.',
      'Dangerous behavior, unsportsmanlike conduct, and prohibited submissions can lead to penalties or disqualification.',
      'Basic hygiene, trimmed nails, and safe equipment remain mandatory for all competitors.',
    ],
  },
  {
    title: 'Match times and divisions',
    description: 'What influences bout length and divisional structure.',
    icon: Clock3,
    items: [
      'Match duration depends on division, age, and belt level.',
      'Gi and no-gi divisions may have different operational details even when the event weekend is shared.',
      'Athletes should verify their bracket, schedule, and weigh-in instructions before the event starts.',
    ],
  },
];

const eventDayChecklist = [
  'Bring a valid government photo ID.',
  'Check your bracket, schedule, and correction deadline before event day.',
  'Confirm your registered weight in kilograms and be ready for event-day weigh-in procedures.',
  'Arrive early because matches can move ahead of schedule.',
  'Wear sandals or shoes off the mat and bring a backup uniform if possible.',
];

export default function RulesPage() {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();

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
              {t('rulesHub.badge', 'Competitor guide')}
            </span>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gold-500/10 rounded-lg border border-gold-500/20">
              <BookOpen size={24} className="text-gold-500" />
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold">
              {t('rulesHub.title', 'Competition Rules')}
            </h1>
          </div>
          <p className="text-text-secondary max-w-3xl leading-relaxed">
            {t(
              'rulesHub.subtitle',
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
                    'rulesHub.intro',
                    'This page summarizes the rule areas competitors most often need before weigh-ins, bracket checks, and match day. It is designed to be easier to use than sending athletes into broken third-party rule pages.'
                  )}
                </p>
                <p className="text-text-secondary leading-relaxed">
                  {t(
                    'rulesHub.note',
                    'Use the summaries below to prepare, then reference the official SJJIF rules source or download the PDF copy. If an organizer bulletin, bracket note, or official announcement gives event-specific instructions, follow those instructions on event day.'
                  )}
                </p>
              </div>
              <div className="bg-navy-900/60 border border-white/5 rounded-xl p-5">
                <p className="text-sm font-heading font-semibold uppercase tracking-[0.2em] text-text-muted mb-3">
                  {t('rulesHub.rulebookLabel', 'Downloadable rules copy')}
                </p>
                <p className="text-sm text-text-secondary leading-relaxed mb-5">
                  {t(
                    'rulesHub.rulebookCopy',
                    'Download a PDF copy of the SJJIF rules currently referenced by Marianas Open materials.'
                  )}
                </p>
                <a
                  href={RULEBOOK_PDF_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 px-4 py-3 bg-gold-500 text-navy-900 font-heading font-bold uppercase tracking-wider text-sm hover:opacity-90 transition-opacity"
                >
                  <FileDown size={16} />
                  {t('rulesHub.downloadPdf', 'Download rules PDF')}
                </a>
                <p className="text-xs text-text-muted mt-3">
                  {t('rulesHub.opensExternally', 'Opens the downloadable rules PDF in a new tab.')}
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Rule sections */}
        <div className="grid gap-5 lg:grid-cols-2 mb-12">
          {ruleSections.map((section, i) => (
            <ScrollReveal key={section.title} delay={i * 0.06}>
              <section className="bg-surface border border-white/5 rounded-2xl p-6 h-full">
                <div className="flex items-start gap-4 mb-5">
                  <div className="p-3 bg-gold-500/10 rounded-xl border border-gold-500/20 shrink-0">
                    <section.icon size={18} className="text-gold-500" />
                  </div>
                  <div>
                    <h2 className="font-heading text-xl font-bold text-text-primary mb-1">
                      {section.title}
                    </h2>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {section.description}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {section.items.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <CheckCircle2 size={16} className="text-gold-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-text-secondary leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              </section>
            </ScrollReveal>
          ))}
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
                    {t('rulesHub.eventDayTitle', 'Event-day reminders')}
                  </h2>
                  <p className="text-sm text-text-secondary">
                    {t(
                      'rulesHub.eventDaySubtitle',
                      'The operational details below are just as important as the technical rules.'
                    )}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {eventDayChecklist.map((item) => (
                  <div key={item} className="flex items-start gap-3">
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
                    {t('rulesHub.fullRulebookTitle', 'Need the full federation language?')}
                  </h2>
                  <p className="text-sm text-text-secondary">
                    {t(
                      'rulesHub.fullRulebookSubtitle',
                      'The live SJJIF rules source remains the primary reference for exact article wording and detailed exceptions.'
                    )}
                  </p>
                </div>
              </div>
              <a
                href={SJJIF_RULES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-gold-500 hover:underline"
              >
                <ExternalLink size={16} />
                {t('rulesHub.officialSourceLinkText', 'Open the live SJJIF rules source')}
              </a>
              <p className="text-sm text-text-secondary leading-relaxed mt-4">
                {t(
                  'rulesHub.footerNote',
                  'This local guide is meant to improve clarity and avoid dead-end federation links. It does not replace official SJJIF rules language or event-specific organizer instructions.'
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
                    {t('rulesHub.maintenanceTitle', 'Page status')}
                  </h2>
                  <p className="text-sm text-text-secondary">
                    {t(
                      'rulesHub.maintenanceSubtitle',
                      'This guide is maintained locally so competitors are not sent to unreliable third-party rules pages.'
                    )}
                  </p>
                </div>
              </div>
              <div className="space-y-3 text-sm text-text-secondary">
                <p>
                  <span className="text-text-primary font-semibold">
                    {t('rulesHub.lastUpdatedLabel', 'Last updated:')}
                  </span>{' '}
                  {RULES_LAST_UPDATED}
                </p>
                <p>
                  {t(
                    'rulesHub.maintenanceBody',
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
                    {t('rulesHub.contactTitle', 'Questions about the rules?')}
                  </h2>
                  <p className="text-sm text-text-secondary">
                    {t(
                      'rulesHub.contactSubtitle',
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
                    'rulesHub.contactNote',
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
              {t('rulesHub.footerCta', 'Official federation rules:')}{' '}
              <a
                href={SJJIF_RULES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold-500 hover:underline"
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
