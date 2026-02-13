import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Star, Trophy, Users } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';

const fighterPoints = [
  { stars: 5, gold: 75, silver: 35, bronze: 15, alone: 35 },
  { stars: 4, gold: 60, silver: 28, bronze: 12, alone: 28 },
  { stars: 3, gold: 45, silver: 21, bronze: 9, alone: 21 },
  { stars: 2, gold: 10.5, silver: 4.5, bronze: 1.5, alone: null },
  { stars: 1, gold: 7, silver: 3, bronze: 1, alone: null },
];

const teamPoints = { gold: 21, silver: 9, bronze: 3, alone: 0 };

const events = [
  { name: 'Marianas Open Guam', stars: 5 },
  { name: 'Copa De Marianas', stars: 4 },
  { name: 'Pro Tokyo', stars: 4 },
  { name: 'Pro Nagoya', stars: 3 },
  { name: 'Pro Manila', stars: 3 },
  { name: 'Pro Taiwan', stars: 3 },
  { name: 'Pro Korea', stars: 3 },
  { name: 'Pro China', stars: 3 },
];

function StarDisplay({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} size={14} className="fill-gold-500 text-gold-500" />
      ))}
      {Array.from({ length: 5 - count }).map((_, i) => (
        <Star key={`e${i}`} size={14} className="text-white/10" />
      ))}
    </div>
  );
}

export default function RankingsPage() {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-4">
            {t('rankings.title')}
          </h1>
          <p className="text-text-secondary max-w-2xl mx-auto">
            {t('rankings.subtitle')}
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Fighter Points Table */}
          <div className="lg:col-span-2">
            <ScrollReveal>
              <div className="bg-surface border border-white/5 rounded-lg overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center gap-3">
                  <Trophy size={20} className="text-gold-500" />
                  <h2 className="font-heading font-bold text-lg">
                    {t('rankings.fighterPoints')}
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 text-text-muted">
                        <th className="text-left p-4 font-medium">{t('rankings.rating')}</th>
                        <th className="text-center p-4 font-medium text-gold-500">{t('rankings.gold')}</th>
                        <th className="text-center p-4 font-medium text-text-secondary">{t('rankings.silver')}</th>
                        <th className="text-center p-4 font-medium text-amber-700">{t('rankings.bronze')}</th>
                        <th className="text-center p-4 font-medium">{t('rankings.alone')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fighterPoints.map((row) => (
                        <tr key={row.stars} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                          <td className="p-4">
                            <StarDisplay count={row.stars} />
                          </td>
                          <td className="text-center p-4 font-semibold text-gold-500">{row.gold}</td>
                          <td className="text-center p-4 text-text-secondary">{row.silver}</td>
                          <td className="text-center p-4 text-amber-700">{row.bronze}</td>
                          <td className="text-center p-4 text-text-muted">
                            {row.alone !== null ? row.alone : '\u2014'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </ScrollReveal>

            {/* Team Points */}
            <ScrollReveal delay={0.15}>
              <div className="bg-surface border border-white/5 rounded-lg overflow-hidden mt-6">
                <div className="p-6 border-b border-white/5 flex items-center gap-3">
                  <Users size={20} className="text-gold-500" />
                  <h2 className="font-heading font-bold text-lg">
                    {t('rankings.teamPoints')}
                  </h2>
                  <span className="text-xs text-text-muted ml-auto">
                    <StarDisplay count={4} />
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 text-text-muted">
                        <th className="text-center p-4 font-medium text-gold-500">{t('rankings.gold')}</th>
                        <th className="text-center p-4 font-medium text-text-secondary">{t('rankings.silver')}</th>
                        <th className="text-center p-4 font-medium text-amber-700">{t('rankings.bronze')}</th>
                        <th className="text-center p-4 font-medium">{t('rankings.alone')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="text-center p-4 font-semibold text-gold-500">{teamPoints.gold}</td>
                        <td className="text-center p-4 text-text-secondary">{teamPoints.silver}</td>
                        <td className="text-center p-4 text-amber-700">{teamPoints.bronze}</td>
                        <td className="text-center p-4 text-text-muted">{teamPoints.alone}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Events Sidebar */}
          <div>
            <ScrollReveal delay={0.1}>
              <div className="bg-surface border border-white/5 rounded-lg overflow-hidden">
                <div className="p-6 border-b border-white/5">
                  <h2 className="font-heading font-bold text-lg">
                    {t('rankings.eventRatings')}
                  </h2>
                </div>
                <div className="divide-y divide-white/5">
                  {events.map((event) => (
                    <div
                      key={event.name}
                      className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                    >
                      <span className="text-sm text-text-secondary">{event.name}</span>
                      <StarDisplay count={event.stars} />
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            {/* Info note */}
            <ScrollReveal delay={0.2}>
              <div className="mt-6 p-5 bg-gold-500/5 border border-gold-500/10 rounded-lg">
                <p className="text-xs text-text-muted leading-relaxed">
                  {t('rankings.note')}
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </div>
  );
}
