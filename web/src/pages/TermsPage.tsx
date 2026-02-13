import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { FileText } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';

const sections = [
  'refund',
  'liability',
  'injury',
  'medical',
  'media',
  'health',
  'organizer',
  'changes',
  'headCoach',
  'verification',
  'denial',
  'dispute',
  'minor',
] as const;

export default function TermsPage() {
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
              <FileText size={24} className="text-gold-500" />
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold">
              {t('terms.title')}
            </h1>
          </div>
          <p className="text-text-muted text-sm">
            {t('terms.lastUpdated')}
          </p>
        </motion.div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((key, i) => (
            <ScrollReveal key={key} delay={i * 0.05}>
              <div className="border-l-2 border-white/10 pl-6 py-1">
                <p className="text-text-secondary leading-relaxed text-sm sm:text-base">
                  {t(`terms.${key}`)}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Organizer notice */}
        <ScrollReveal delay={0.3}>
          <div className="mt-12 p-6 bg-surface border border-white/5 rounded-lg">
            <p className="text-text-muted text-xs leading-relaxed">
              {t('terms.organizerNotice')}
            </p>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
