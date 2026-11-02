import { getDateLocale, parseDateLocalSafe } from '../utils/dateLocale';
import { formatNumber } from '../utils/numbers';
import CountryFlag from '../components/CountryFlag';
import { useState, useEffect } from 'react';
import { useSearchParams, useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, MotionConfig } from 'framer-motion';
import { ArrowLeft, Medal, Award, MapPin, Users, Calendar, Instagram, Youtube } from 'lucide-react';
import { api } from '../services/api';
import type { CompetitorProfile, CompetitorDetail } from '../services/api';
import SEO from '../components/SEO';
import { Card, SectionHeading } from '../components/ui';
import DivisionLabel from '../components/results/DivisionLabel';
import { parseDivisionName } from '../components/results/divisionName';
import CompetitorStandings from '../components/rankings/CompetitorStandings';

const PLACEMENT_STYLE: Record<number, { key: string; className: string }> = {
  1: {
    key: 'competitorProfile.gold',
    className: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  },
  2: {
    key: 'competitorProfile.silver',
    className: 'bg-gray-400/20 text-gray-300 border border-gray-400/30',
  },
  3: {
    key: 'competitorProfile.bronze',
    className: 'bg-amber-700/20 text-amber-500 border border-amber-600/30',
  },
};

const BELT_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
  white: { bg: 'bg-white/90', text: 'text-gray-900', ring: 'ring-white/30' },
  blue: { bg: 'bg-blue-600', text: 'text-white', ring: 'ring-blue-500/30' },
  purple: { bg: 'bg-purple-600', text: 'text-white', ring: 'ring-purple-500/30' }, // taste-skill-ignore: purple identifies an actual BJJ belt, not a decorative accent.
  brown: { bg: 'bg-amber-800', text: 'text-white', ring: 'ring-amber-700/30' },
  black: { bg: 'bg-gray-900', text: 'text-white', ring: 'ring-gray-700/30' },
};

function BeltBadge({ rank }: { rank: string }) {
  const { t } = useTranslation();
  const s = BELT_STYLES[rank] || BELT_STYLES.white;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 text-xs font-medium ${s.bg} ${s.text} ring-1 ${s.ring}`}
    >
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
  gold: number;
  silver: number;
  bronze: number;
  events_competed: number;
  results: {
    event_id?: number;
    event_name: string;
    event_slug: string;
    event_date: string;
    division: string;
    placement: number;
    belt_rank: string;
  }[];
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
    gold: p.gold,
    silver: p.silver,
    bronze: p.bronze,
    events_competed: p.events_competed,
    results: p.results,
  };
}

export default function CompetitorProfilePage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const name = searchParams.get('name') || '';
  const resultId = searchParams.get('result_id') || '';
  const [profile, setProfile] = useState<UnifiedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setProfile(null);
    setError('');
    setLoading(true);
    const request = id
      ? api.getCompetitor(Number(id)).then(fromCompetitorDetail)
      : name || resultId
        ? api.getCompetitorProfile(name, resultId || undefined).then(fromCompetitorProfile)
        : Promise.reject(new Error('Missing competitor'));
    request
      .then((data) => {
        if (active) setProfile(data);
      })
      .catch(() => {
        if (active) setError(t('competitorProfile.noResults'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, name, resultId, t]);

  const seoPath = id
    ? `/competitors/${id}`
    : resultId
      ? `/competitors/profile?result_id=${encodeURIComponent(resultId)}`
      : name
        ? `/competitors/profile?name=${encodeURIComponent(name)}`
        : '/competitors/profile';

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-svh bg-dark pt-24 pb-16">
        <SEO
          title={profile ? `${profile.name} Profile` : 'Competitor Profile'}
          description={
            profile
              ? `Competitive history and results for ${profile.name} at Marianas Open events.`
              : 'Competitor profile and event results.'
          }
          path={seoPath}
          image="/images/podium-2.webp"
          noindex
        />
        <div className="max-w-5xl mx-auto px-5 sm:px-6">
          <button
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/competitors'))}
            className="inline-flex min-h-11 items-center gap-2 text-text-secondary hover:text-white transition-colors mb-6"
          >
            <ArrowLeft size={16} />
            {t('common.back')}
          </button>

          {loading && (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && !loading && <div className="text-center py-20 text-text-muted">{error}</div>}

          {profile && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24 }}
            >
              <div className="ui-card p-6 mb-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
                    {profile.photo_url ? (
                      <img
                        src={profile.photo_url}
                        alt={profile.name}
                        className="w-16 h-16 object-cover rounded-lg shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-white/5 rounded-lg flex items-center justify-center shrink-0">
                        <span className="text-2xl font-heading font-bold text-white/10">
                          {profile.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h1 className="break-words font-heading text-2xl sm:text-4xl font-semibold text-text-primary mb-2">
                        {profile.name}
                      </h1>
                      <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
                        {profile.academy && (
                          <span className="flex items-center gap-1.5">
                            <Users size={14} className="text-text-muted" />
                            {profile.academy_slug ? (
                              <Link
                                to={`/teams/${profile.academy_slug}`}
                                className="hover:text-gold transition-colors"
                              >
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
                            <CountryFlag code={profile.country_code} />
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
                  <div className="flex items-center gap-3 mt-4 pt-4">
                    {profile.instagram_url && (
                      <a
                        href={profile.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-text-secondary hover:text-gold transition-colors"
                      >
                        <Instagram size={16} /> Instagram
                      </a>
                    )}
                    {profile.youtube_url && (
                      <a
                        href={profile.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-text-secondary hover:text-gold transition-colors"
                      >
                        <Youtube size={16} /> YouTube
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <StatCard
                  icon={<Medal size={20} className="text-yellow-400" />}
                  label={t('competitorProfile.gold')}
                  value={profile.gold}
                />
                <StatCard
                  icon={<Medal size={20} className="text-gray-300" />}
                  label={t('competitorProfile.silver')}
                  value={profile.silver}
                />
                <StatCard
                  icon={<Award size={20} className="text-amber-500" />}
                  label={t('competitorProfile.bronze')}
                  value={profile.bronze}
                />
              </div>

              <CompetitorStandings competitorId={id ? Number(id) : undefined} />

              <div className="ui-card overflow-hidden">
                <div className="p-4">
                  <SectionHeading title={t('officialRankings.medalHistory')} />
                </div>
                <div className="grid gap-4 p-4 sm:grid-cols-2">
                  {profile.results.map((result, index) => {
                    const badge = PLACEMENT_STYLE[result.placement];
                    return (
                      <Card
                        key={`${result.event_slug}-${result.division}-${index}`}
                        className="min-w-0 p-4"
                      >
                        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                          <Link
                            to={`/events/${result.event_slug}`}
                            className="min-w-0 break-words font-heading text-lg font-semibold text-gold-400 hover:underline"
                          >
                            {result.event_name}
                          </Link>
                          <span
                            className={`rounded px-2 py-1 text-sm ${badge?.className || 'text-text-secondary'}`}
                          >
                            {badge ? t(badge.key) : `#${result.placement}`}
                          </span>
                        </div>
                        {result.event_date && (
                          <p className="mb-3 text-sm text-text-secondary">
                            {parseDateLocalSafe(result.event_date).toLocaleDateString(
                              getDateLocale(i18n.language),
                              { year: 'numeric', month: 'long', day: 'numeric' }
                            )}
                          </p>
                        )}
                        <p className="text-base text-text-primary">
                          <DivisionLabel name={result.division} />
                        </p>
                        {!parseDivisionName(result.division).belt && result.belt_rank && (
                          <p className="mt-2 text-sm text-text-secondary">
                            {t(`watch.belt.${result.belt_rank}`, result.belt_rank)}
                          </p>
                        )}
                      </Card>
                    );
                  })}
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
  const { i18n } = useTranslation();
  return (
    <div className="ui-card p-4 flex flex-col items-center gap-1">
      {icon}
      <span className="text-2xl font-bold text-white">{formatNumber(value, i18n.language)}</span>
      <span className="text-xs text-text-muted">{label}</span>
    </div>
  );
}
