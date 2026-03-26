import { useState, useEffect } from 'react';
import { useSearchParams, useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, MotionConfig } from 'framer-motion';
import { ArrowLeft, Trophy, Medal, Award, MapPin, Users, Calendar, Instagram, Youtube } from 'lucide-react';
import { api } from '../services/api';
import type { CompetitorProfile, CompetitorDetail } from '../services/api';
import SEO from '../components/SEO';

const PLACEMENT_STYLE: Record<number, { key: string; className: string }> = {
  1: { key: 'competitorProfile.gold', className: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
  2: { key: 'competitorProfile.silver', className: 'bg-gray-400/20 text-gray-300 border border-gray-400/30' },
  3: { key: 'competitorProfile.bronze', className: 'bg-amber-700/20 text-amber-500 border border-amber-600/30' },
};

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
    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold uppercase tracking-wider ${s.bg} ${s.text} ring-1 ${s.ring}`}>
      {t(`watch.belt.${rank}`, rank)}
    </span>
  );
}

type UnifiedProfile = {
  name: string;
  academy: string | null;
  academy_slug: string | null;
  country_code: string | null;
  belt_rank: string | null;
  photo_url: string | null;
  bio: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  total_points: number;
  gold: number;
  silver: number;
  bronze: number;
  events_competed: number;
  results: { event_id?: number; event_name: string; event_slug: string; event_date: string; division: string; placement: number; belt_rank: string; points_earned: number }[];
};

function fromCompetitorDetail(d: CompetitorDetail): UnifiedProfile {
  return {
    name: d.full_name,
    academy: d.academy,
    academy_slug: d.academy_slug,
    country_code: d.country_code,
    belt_rank: d.belt_rank,
    photo_url: d.photo_url,
    bio: d.bio,
    instagram_url: d.instagram_url,
    youtube_url: d.youtube_url,
    total_points: d.total_points,
    gold: d.gold_medals,
    silver: d.silver_medals,
    bronze: d.bronze_medals,
    events_competed: d.events_competed,
    results: d.results,
  };
}

function fromCompetitorProfile(p: CompetitorProfile): UnifiedProfile {
  return {
    name: p.competitor_name,
    academy: p.academy,
    academy_slug: null,
    country_code: p.country_code,
    belt_rank: null,
    photo_url: null,
    bio: null,
    instagram_url: null,
    youtube_url: null,
    total_points: p.total_points,
    gold: p.gold,
    silver: p.silver,
    bronze: p.bronze,
    events_competed: p.events_competed,
    results: p.results,
  };
}

export default function CompetitorProfilePage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const name = searchParams.get('name') || '';
  const [profile, setProfile] = useState<UnifiedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      setLoading(true);
      api.getCompetitor(Number(id))
        .then(d => setProfile(fromCompetitorDetail(d)))
        .catch(() => setError(t('competitorProfile.noResults')))
        .finally(() => setLoading(false));
    } else if (name) {
      setLoading(true);
      api.getCompetitorProfile(name)
        .then(p => setProfile(fromCompetitorProfile(p)))
        .catch(() => setError(t('competitorProfile.noResults')))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
      setError('No competitor specified');
    }
  }, [id, name, t]);

  const seoPath = id ? `/competitors/${id}` : name ? `/competitors/profile?name=${encodeURIComponent(name)}` : '/competitors/profile';

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-dark pt-24 pb-16">
        <SEO
          title={profile ? `${profile.name} Profile` : 'Competitor Profile'}
          description={profile ? `Competitive history and results for ${profile.name} at Marianas Open events.` : 'Competitor profile and event results.'}
          path={seoPath}
          image="/images/podium-2.webp"
          noindex
        />
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-text-muted hover:text-white transition-colors mb-6"
          >
            <ArrowLeft size={16} />
            {t('competitorProfile.backToRankings')}
          </button>

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
              <div className="bg-surface border border-white/5 rounded-xl p-6 mb-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {profile.photo_url ? (
                      <img src={profile.photo_url} alt={profile.name}
                        className="w-16 h-16 object-cover rounded-lg shrink-0" />
                    ) : (
                      <div className="w-16 h-16 bg-white/5 rounded-lg flex items-center justify-center shrink-0">
                        <span className="text-2xl font-heading font-bold text-white/10">
                          {profile.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </span>
                      </div>
                    )}
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                        {profile.name}
                      </h1>
                      <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
                        {profile.academy && (
                          <span className="flex items-center gap-1.5">
                            <Users size={14} className="text-text-muted" />
                            {profile.academy_slug ? (
                              <Link to={`/teams/${profile.academy_slug}`} className="hover:text-gold transition-colors">
                                {profile.academy}
                              </Link>
                            ) : (
                              profile.academy
                            )}
                          </span>
                        )}
                        {profile.country_code && (
                          <span className="flex items-center gap-1.5">
                            <MapPin size={14} className="text-text-muted" />
                            <img
                              src={`https://flagcdn.com/w40/${profile.country_code.toLowerCase()}.png`}
                              alt={profile.country_code}
                              className="w-5 h-3.5 object-cover rounded-sm inline-block"
                            />
                            {profile.country_code}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-text-muted" />
                          {profile.events_competed} {t('competitorProfile.eventsCompeted')}
                        </span>
                      </div>
                    </div>
                  </div>
                  {profile.belt_rank && <BeltBadge rank={profile.belt_rank} />}
                </div>

                {profile.bio && (
                  <p className="text-sm text-text-secondary leading-relaxed mt-4">{profile.bio}</p>
                )}

                {(profile.instagram_url || profile.youtube_url) && (
                  <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/5">
                    {profile.instagram_url && (
                      <a href={profile.instagram_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-text-secondary hover:text-gold transition-colors">
                        <Instagram size={16} /> Instagram
                      </a>
                    )}
                    {profile.youtube_url && (
                      <a href={profile.youtube_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-text-secondary hover:text-gold transition-colors">
                        <Youtube size={16} /> YouTube
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <StatCard icon={<Trophy size={20} className="text-gold-500" />} label={t('competitorProfile.totalPoints')} value={profile.total_points} />
                <StatCard icon={<Medal size={20} className="text-yellow-400" />} label={t('competitorProfile.gold')} value={profile.gold} />
                <StatCard icon={<Medal size={20} className="text-gray-300" />} label={t('competitorProfile.silver')} value={profile.silver} />
                <StatCard icon={<Award size={20} className="text-amber-500" />} label={t('competitorProfile.bronze')} value={profile.bronze} />
              </div>

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
                        const badge = PLACEMENT_STYLE[r.placement];
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
                                  {t(badge.key)}
                                </span>
                              ) : (
                                <span className="text-text-muted">#{r.placement}</span>
                              )}
                            </td>
                            <td className="p-3 text-text-secondary">{t(`watch.belt.${r.belt_rank}`, r.belt_rank)}</td>
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
