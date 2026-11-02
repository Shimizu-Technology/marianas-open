import { formatNumber } from '../utils/numbers';
import CountryFlag from '../components/CountryFlag';
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, MotionConfig } from 'framer-motion';
import { ArrowLeft, Medal, Award, Building2, Users, MapPin, Globe, ExternalLink } from 'lucide-react';
import { api } from '../services/api';
import type { AcademyDetail } from '../services/api';
import SEO from '../components/SEO';
import { useTranslation } from 'react-i18next';

const BELT_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
  white:  { bg: 'bg-white/90',     text: 'text-gray-900', ring: 'ring-white/30' },
  blue:   { bg: 'bg-blue-600',     text: 'text-white',    ring: 'ring-blue-500/30' },
  purple: { bg: 'bg-purple-600',   text: 'text-white',    ring: 'ring-purple-500/30' },
  brown:  { bg: 'bg-amber-800',    text: 'text-white',    ring: 'ring-amber-700/30' },
  black:  { bg: 'bg-gray-900',     text: 'text-white',    ring: 'ring-gray-700/30' },
};

function BeltBadge({ rank }: { rank: string }) {
  const { t } = useTranslation();
  const s = BELT_STYLES[rank] || BELT_STYLES.white;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${s.bg} ${s.text} ring-1 ${s.ring}`}>
      {t(`watch.belt.${rank}`, rank)}
    </span>
  );
}


export default function AcademyPage() {
  const { t, i18n } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [academy, setAcademy] = useState<AcademyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) { setLoading(false); setError('academies.noSpecified'); return; }
    setLoading(true);
    api.getAcademy(slug)
      .then(setAcademy)
      .catch(() => setError('academies.missing'))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-dark pt-24 pb-16">
        <SEO
          title={academy ? `${academy.name} — Team Profile` : 'Team Profile'}
          description={academy ? `Team profile and athlete roster for ${academy.name} at Marianas Open events.` : 'Academy team profile.'}
          path={slug ? `/teams/${slug}` : '/teams'}
          noindex
        />
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <button
            onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/teams')}
            className="inline-flex items-center gap-2 text-text-muted hover:text-white transition-colors mb-6"
          >
            <ArrowLeft size={16} />
            {t('common.back')}
          </button>

          {loading && (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-20 text-text-muted">{t(error)}</div>
          )}

          {academy && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="bg-surface border border-white/5 rounded-xl p-6 mb-6">
                <div className="flex items-start gap-4">
                  {academy.logo_url ? (
                    <img src={academy.logo_url} alt={academy.name}
                      className="w-16 h-16 object-contain rounded-lg shrink-0" />
                  ) : (
                    <div className="w-16 h-16 bg-white/5 rounded-lg flex items-center justify-center shrink-0">
                      <Building2 size={28} className="text-white/10" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {academy.country_code && <CountryFlag code={academy.country_code} />}
                      <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">
                        {academy.name}
                      </h1>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-text-secondary mt-1">
                      {academy.location && (
                        <span className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-text-muted" />
                          {academy.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Users size={14} className="text-text-muted" />
                        {t('academies.athletes', { count: academy.athletes.length })}
                      </span>
                    </div>
                  </div>
                </div>

                {academy.description && (
                  <p className="text-sm text-text-secondary leading-relaxed mt-4">{academy.description}</p>
                )}

                {(academy.website_url || academy.instagram_url || academy.facebook_url) && (
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
                    {academy.website_url && (
                      <a href={academy.website_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-gold transition-colors">
                        <Globe size={14} /> {t('common.website')} <ExternalLink size={12} />
                      </a>
                    )}
                    {academy.instagram_url && (
                      <a href={academy.instagram_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-gold transition-colors">
                        Instagram
                      </a>
                    )}
                    {academy.facebook_url && (
                      <a href={academy.facebook_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-gold transition-colors">
                        Facebook
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <StatCard icon={<Medal size={20} className="text-yellow-400" />} label={t('competitorProfile.gold')} value={academy.gold} />
                <StatCard icon={<Medal size={20} className="text-gray-300" />} label={t('competitorProfile.silver')} value={academy.silver} />
                <StatCard icon={<Award size={20} className="text-amber-500" />} label={t('competitorProfile.bronze')} value={academy.bronze} />
                <StatCard icon={<Users size={20} className="text-blue-400" />} label={t('officialRankings.athletes')} value={academy.athletes.length} />
              </div>

              {academy.athletes.length > 0 && (
                <div className="bg-surface border border-white/5 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-white/5">
                    <h2 className="text-lg font-semibold text-white">{t('officialRankings.athletes')}</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/[0.03]">
                    {academy.athletes.map((athlete, i) => (
                      <motion.div
                        key={athlete.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <Link
                          to={`/competitors/${athlete.id}`}
                          className="flex items-center gap-3 p-4 bg-surface hover:bg-white/[0.03] transition-colors"
                        >
                          {athlete.photo_url ? (
                            <img src={athlete.photo_url} alt={athlete.full_name}
                              className="w-10 h-10 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-white/20">
                                {athlete.first_name[0]}{athlete.last_name[0]}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {athlete.country_code && <CountryFlag code={athlete.country_code} />}
                              <span className="text-sm font-medium text-text-primary truncate">{athlete.full_name}</span>
                              {athlete.belt_rank && <BeltBadge rank={athlete.belt_rank} />}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-text-muted">
                              {athlete.gold > 0 && <span className="text-yellow-400">{formatNumber(athlete.gold, i18n.language)} {t('competitorProfile.gold')}</span>}
                              {athlete.silver > 0 && <span className="text-gray-300">{formatNumber(athlete.silver, i18n.language)} {t('competitorProfile.silver')}</span>}
                              {athlete.bronze > 0 && <span className="text-orange-400">{formatNumber(athlete.bronze, i18n.language)} {t('competitorProfile.bronze')}</span>}
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </MotionConfig>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  const { i18n } = useTranslation();
  return (
    <div className="bg-surface border border-white/5 rounded-xl p-4 flex flex-col items-center gap-1">
      {icon}
      <span className="text-2xl font-bold text-white">{formatNumber(value, i18n.language)}</span>
      <span className="text-xs text-text-muted">{label}</span>
    </div>
  );
}
