import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { BookOpen, ExternalLink, Shield, Shirt, Scale, Clock } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';

const ruleLinks = [
  {
    key: 'general',
    icon: BookOpen,
    href: 'https://asjjf.org/main/rules?pagesType=RULE',
  },
  {
    key: 'uniform',
    icon: Shirt,
    href: 'https://asjjf.org/main/rules?pagesType=UNIFORM',
  },
  {
    key: 'prohibited',
    icon: Shield,
    href: 'https://asjjf.org/main/rules?pagesType=PROHIBITED',
  },
  {
    key: 'points',
    icon: Scale,
    href: 'https://asjjf.org/main/rules?pagesType=ADVANTAGE',
  },
  {
    key: 'time',
    icon: Clock,
    href: 'https://asjjf.org/main/rules?pagesType=TIME',
  },
] as const;

export default function RulesPage() {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div
          className="mb-12"
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gold-500/10 rounded-lg">
              <BookOpen size={24} className="text-gold-500" />
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold">
              {t('rules.title')}
            </h1>
          </div>
          <p className="text-text-muted text-sm">{t('rules.subtitle')}</p>
        </motion.div>

        {/* Intro */}
        <ScrollReveal>
          <div className="bg-surface border border-white/5 rounded-lg p-6 mb-10">
            <p className="text-text-secondary leading-relaxed">
              {t('rules.intro')}
            </p>
          </div>
        </ScrollReveal>

        {/* Rule sections */}
        <div className="space-y-4 mb-12">
          {ruleLinks.map((link, i) => (
            <ScrollReveal key={link.key} delay={i * 0.07}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-4 bg-surface border border-white/5 rounded-lg p-5 group hover:border-gold-500/30 hover:bg-white/[0.03] transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-gold-500/10 rounded-lg group-hover:bg-gold-500/20 transition-colors">
                    <link.icon size={18} className="text-gold-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary group-hover:text-gold-500 transition-colors">
                      {t(`rules.sections.${link.key}.title`)}
                    </p>
                    <p className="text-sm text-text-muted mt-0.5">
                      {t(`rules.sections.${link.key}.desc`)}
                    </p>
                  </div>
                </div>
                <ExternalLink size={16} className="text-text-muted group-hover:text-gold-500 transition-colors shrink-0" />
              </a>
            </ScrollReveal>
          ))}
        </div>

        {/* Note */}
        <ScrollReveal delay={0.3}>
          <div className="border-t border-white/5 pt-8">
            <p className="text-text-muted text-sm text-center">
              {t('rules.officialNote')}{' '}
              <a
                href="https://asjjf.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold-500 hover:underline"
              >
                asjjf.org
              </a>
            </p>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
