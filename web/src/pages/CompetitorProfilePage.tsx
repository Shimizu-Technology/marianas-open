import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, MotionConfig } from 'framer-motion';
import { ArrowLeft, Trophy, Medal, Award, MapPin, Users, Calendar } from 'lucide-react';
import { api } from '../services/api';
import type { CompetitorProfile } from '../services/api';

const PLACEMENT_BADGE: Record<number, { label: string; className: string }> = {
  1: { label: 'Gold', className: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
  2: { label: 'Silver', className: 'bg-gray-400/20 text-gray-300 border border-gray-400/30' },
  3: { label: 'Bronze', className: 'bg-amber-700/20 text-amber-500 border border-amber-600/30' },
};

export default function CompetitorProfilePage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const name = searchParams.get('name') || '';
  const [profile, setProfile] = useState<CompetitorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!name) { setLoading(false); setError('No competitor name provided'); return; }
    setLoading(true);
    api.getCompetitorProfile(name)
      .then(setProfile)
      .catch(() => setError(t('competitorProfile.noResults')))
      .finally(() => setLoading(false));
  }, [name, t]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-dark pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <Link
            to="/rankings"
            className="inline-flex items-center gap-2 text-text-muted hover:text-white transition-colors mb-6"
          >
            <ArrowLeft size={16} />
            {t('competitorProfile.backToRankings')}
          </Link>

          {loading && (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-20 text-text-muted">{error}</div>
          )}

          {profile && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Header */}
              <div className="bg-surface border border-white/5 rounded-xl p-6 mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  {profile.competitor_name}
                </h1>
                <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
                  {profile.academy && (
                    <span className="flex items-center gap-1.5">
                      <Users size={14} className="text-text-muted" />
                      {profile.academy}
                    </span>
                  )}
                  {profile.country_code && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-text-muted" />
                      {profile.country_code}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-text-muted" />
                    {profile.events_competed} {t('competitorProfile.eventsCompeted')}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <StatCard icon={<Trophy size={20} className="text-gold-500" />} label={t('competitorProfile.totalPoints')} value={profile.total_points} />
                <StatCard icon={<Medal size={20} className="text-yellow-400" />} label={t('competitorProfile.gold')} value={profile.gold} />
                <StatCard icon={<Medal size={20} className="text-gray-300" />} label={t('competitorProfile.silver')} value={profile.silver} />
                <StatCard icon={<Award size={20} className="text-amber-500" />} label={t('competitorProfile.bronze')} value={profile.bronze} />
              </div>

              {/* Results Table */}
              <div className="bg-surface border border-white/5 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-white/5">
                  <h2 className="text-lg font-semibold text-white">{t('competitorProfile.results')}</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-text-muted text-left border-b border-white/5">
                        <th className="p-3 font-medium">{t('competitorProfile.event')}</th>
                        <th className="p-3 font-medium">{t('competitorProfile.division')}</th>
                        <th className="p-3 font-medium">{t('competitorProfile.placement')}</th>
                        <th className="p-3 font-medium">{t('competitorProfile.beltRank')}</th>
                        <th className="p-3 font-medium text-right">{t('competitorProfile.pointsEarned')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profile.results.map((r, i) => {
                        const badge = PLACEMENT_BADGE[r.placement];
                        return (
                          <motion.tr
                            key={`${r.event_slug}-${r.division}-${i}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.03 }}
                            className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
                          >
                            <td className="p-3">
                              <Link
                                to={`/events/${r.event_slug}`}
                                className="text-gold-400 hover:text-gold-300 transition-colors"
                              >
                                {r.event_name}
                              </Link>
                              {r.event_date && (
                                <div className="text-xs text-text-muted mt-0.5">{r.event_date}</div>
                              )}
                            </td>
                            <td className="p-3 text-text-secondary">{r.division}</td>
                            <td className="p-3">
                              {badge ? (
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${badge.className}`}>
                                  {badge.label}
                                </span>
                              ) : (
                                <span className="text-text-muted">#{r.placement}</span>
                              )}
                            </td>
                            <td className="p-3 text-text-secondary capitalize">{r.belt_rank}</td>
                            <td className="p-3 text-right font-medium text-white">{r.points_earned}</td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </MotionConfig>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-surface border border-white/5 rounded-xl p-4 flex flex-col items-center gap-1">
      {icon}
      <span className="text-2xl font-bold text-white">{value}</span>
      <span className="text-xs text-text-muted">{label}</span>
    </div>
  );
}
