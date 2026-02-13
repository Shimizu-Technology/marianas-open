import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion, MotionConfig } from 'framer-motion';
import { Trophy, Users, Globe, Star, Medal, ChevronDown, Filter } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';
import { api, RankingEntry } from '../services/api';

type RankingTab = 'individual' | 'team' | 'country';

const BELT_OPTIONS = ['All', 'Black', 'Brown', 'Purple', 'Blue', 'White'] as const;
const GI_OPTIONS = ['Combined', 'Gi', 'No-Gi'] as const;

const BELT_COLORS: Record<string, string> = {
  Black: 'bg-gray-900 border-gray-700',
  Brown: 'bg-amber-900/60 border-amber-700',
  Purple: 'bg-purple-900/60 border-purple-600',
  Blue: 'bg-blue-900/60 border-blue-600',
  White: 'bg-white/10 border-white/30',
};

const COUNTRY_NAMES: Record<string, string> = {
  GUM: 'Guam', JPN: 'Japan', KOR: 'South Korea', PHL: 'Philippines',
  BRA: 'Brazil', USA: 'United States', TAI: 'Taiwan', MNP: 'N. Mariana Islands',
  FRA: 'France', PLW: 'Palau', HKG: 'Hong Kong', AUS: 'Australia',
  GBR: 'United Kingdom', CAN: 'Canada', SGP: 'Singapore', IND: 'India',
  MEX: 'Mexico', CHN: 'China', THA: 'Thailand', IDN: 'Indonesia',
  FSM: 'Micronesia', MHL: 'Marshall Islands', NZL: 'New Zealand',
};

const STAR_TIERS = [
  { stars: 5, gold: 75, silver: 35, bronze: 15 },
  { stars: 4, gold: 60, silver: 28, bronze: 12 },
  { stars: 3, gold: 45, silver: 21, bronze: 9 },
];

function StarDisplay({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} size={12} className="fill-gold-500 text-gold-500" />
      ))}
    </div>
  );
}

function MedalCount({ gold, silver, bronze }: { gold: number; silver: number; bronze: number }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="flex items-center gap-1">
        <span className="w-3 h-3 rounded-full bg-gold-500 inline-block" />
        {gold}
      </span>
      <span className="flex items-center gap-1">
        <span className="w-3 h-3 rounded-full bg-gray-400 inline-block" />
        {silver}
      </span>
      <span className="flex items-center gap-1">
        <span className="w-3 h-3 rounded-full bg-amber-700 inline-block" />
        {bronze}
      </span>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <div className="w-8 h-8 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-500 font-bold text-sm">1</div>;
  if (rank === 2) return <div className="w-8 h-8 rounded-full bg-gray-400/20 flex items-center justify-center text-gray-400 font-bold text-sm">2</div>;
  if (rank === 3) return <div className="w-8 h-8 rounded-full bg-amber-700/20 flex items-center justify-center text-amber-600 font-bold text-sm">3</div>;
  return <div className="w-8 h-8 flex items-center justify-center text-text-muted text-sm">{rank}</div>;
}

export default function RankingsPage() {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const [tab, setTab] = useState<RankingTab>('individual');
  const [belt, setBelt] = useState('All');
  const [giNogi, setGiNogi] = useState('Combined');
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getRankings({
      type: tab,
      belt: belt === 'All' ? undefined : belt,
      gi_nogi: giNogi === 'Combined' ? undefined : giNogi,
      limit: 50,
    }).then(data => {
      setRankings(data.rankings);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [tab, belt, giNogi]);

  const tabs: { key: RankingTab; label: string; icon: typeof Trophy }[] = [
    { key: 'individual', label: t('rankings.athletes', 'Athletes'), icon: Trophy },
    { key: 'team', label: t('rankings.academies', 'Academies'), icon: Users },
    { key: 'country', label: t('rankings.countries', 'Countries'), icon: Globe },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen pt-24 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-4">
              {t('rankings.title')}
            </h1>
            <p className="text-text-secondary max-w-2xl mx-auto mb-2">
              {t('rankings.dynamicSubtitle', 'Live rankings calculated from official ASJJF event results across all Marianas Open tournaments.')}
            </p>
            <p className="text-xs text-text-muted">
              {t('rankings.formula', 'Points: Gold = 15 × event stars, Silver = 7 × stars, Bronze = 3 × stars')}
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-4 gap-6">
            {/* Main content */}
            <div className="lg:col-span-3">
              {/* Tabs */}
              <div className="flex gap-1 bg-surface border border-white/5 rounded-lg p-1 mb-4">
                {tabs.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                      tab === key
                        ? 'bg-gold-500/15 text-gold-500'
                        : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.03]'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>

              {/* Filters */}
              {tab === 'individual' && (
                <div className="mb-4">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2 text-sm text-text-muted hover:text-text-secondary transition-colors mb-2"
                  >
                    <Filter size={14} />
                    {t('rankings.filters', 'Filters')}
                    <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                  </button>

                  {showFilters && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="flex flex-wrap gap-4 p-4 bg-surface border border-white/5 rounded-lg"
                    >
                      <div>
                        <label className="text-xs text-text-muted block mb-1.5">{t('rankings.beltRank', 'Belt Rank')}</label>
                        <div className="flex gap-1">
                          {BELT_OPTIONS.map(b => (
                            <button
                              key={b}
                              onClick={() => setBelt(b)}
                              className={`px-3 py-1 text-xs rounded-md border transition-all ${
                                belt === b
                                  ? (b === 'All' ? 'bg-gold-500/15 border-gold-500/30 text-gold-500' : `${BELT_COLORS[b]} text-white`)
                                  : 'border-white/10 text-text-muted hover:border-white/20'
                              }`}
                            >
                              {b}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-text-muted block mb-1.5">Gi / No-Gi</label>
                        <div className="flex gap-1">
                          {GI_OPTIONS.map(g => (
                            <button
                              key={g}
                              onClick={() => setGiNogi(g)}
                              className={`px-3 py-1 text-xs rounded-md border transition-all ${
                                giNogi === g
                                  ? 'bg-gold-500/15 border-gold-500/30 text-gold-500'
                                  : 'border-white/10 text-text-muted hover:border-white/20'
                              }`}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Rankings Table */}
              <div className="bg-surface border border-white/5 rounded-lg overflow-hidden">
                {loading ? (
                  <div className="p-12 text-center text-text-muted">
                    <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin mx-auto mb-3" />
                    {t('rankings.loading', 'Calculating rankings...')}
                  </div>
                ) : rankings.length === 0 ? (
                  <div className="p-12 text-center text-text-muted">
                    {t('rankings.noResults', 'No results found for these filters.')}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/5 text-text-muted text-xs">
                          <th className="text-left p-3 w-12">#</th>
                          <th className="text-left p-3">
                            {tab === 'individual' ? t('rankings.athlete', 'Athlete') :
                             tab === 'team' ? t('rankings.academy', 'Academy') :
                             t('rankings.country', 'Country')}
                          </th>
                          {tab === 'individual' && <th className="text-left p-3 hidden sm:table-cell">{t('rankings.academy', 'Academy')}</th>}
                          <th className="text-center p-3">{t('rankings.points', 'Points')}</th>
                          <th className="text-center p-3 hidden sm:table-cell">{t('rankings.medals', 'Medals')}</th>
                          <th className="text-center p-3 hidden md:table-cell">
                            {tab === 'country' ? t('rankings.athletes', 'Athletes') : t('rankings.events', 'Events')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rankings.map((entry, i) => (
                          <motion.tr
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: Math.min(i * 0.02, 0.5) }}
                            className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
                          >
                            <td className="p-3">
                              <RankBadge rank={i + 1} />
                            </td>
                            <td className="p-3">
                              <div>
                                <span className={`font-medium ${i < 3 ? 'text-white' : 'text-text-secondary'}`}>
                                  {tab === 'individual' ? entry.competitor_name :
                                   tab === 'team' ? entry.academy :
                                   COUNTRY_NAMES[entry.country_code || ''] || entry.country_code}
                                </span>
                                {tab === 'individual' && entry.country_code && (
                                  <span className="ml-2 text-xs text-text-muted">{entry.country_code}</span>
                                )}
                                {tab === 'team' && entry.country_code && (
                                  <span className="ml-2 text-xs text-text-muted">{entry.country_code}</span>
                                )}
                              </div>
                            </td>
                            {tab === 'individual' && (
                              <td className="p-3 text-text-muted text-xs hidden sm:table-cell max-w-[160px] truncate">
                                {entry.academy || '—'}
                              </td>
                            )}
                            <td className="text-center p-3">
                              <span className={`font-bold ${i < 3 ? 'text-gold-500 text-base' : 'text-white'}`}>
                                {entry.total_points.toLocaleString()}
                              </span>
                            </td>
                            <td className="text-center p-3 hidden sm:table-cell">
                              <MedalCount gold={entry.gold} silver={entry.silver} bronze={entry.bronze} />
                            </td>
                            <td className="text-center p-3 text-text-muted hidden md:table-cell">
                              {tab === 'country' ? entry.athletes :
                               tab === 'team' ? (entry.athletes || entry.events_competed) :
                               entry.events_competed}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar — Points Reference */}
            <div className="lg:col-span-1">
              <ScrollReveal>
                <div className="bg-surface border border-white/5 rounded-lg overflow-hidden sticky top-24">
                  <div className="p-4 border-b border-white/5 flex items-center gap-2">
                    <Medal size={16} className="text-gold-500" />
                    <h3 className="font-heading font-bold text-sm">
                      {t('rankings.pointsReference', 'Points Reference')}
                    </h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {STAR_TIERS.map(tier => (
                      <div key={tier.stars} className="flex items-center justify-between text-xs">
                        <StarDisplay count={tier.stars} />
                        <div className="flex gap-2 text-text-muted">
                          <span className="text-gold-500">{tier.gold}</span>
                          <span>/</span>
                          <span className="text-gray-400">{tier.silver}</span>
                          <span>/</span>
                          <span className="text-amber-700">{tier.bronze}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 pb-4">
                    <p className="text-[10px] text-text-muted leading-relaxed border-t border-white/5 pt-3">
                      {t('rankings.formulaNote', 'Based on ASJJF star-based ranking system. Per-match bonus points (+3 submission, +1 decision) not included.')}
                    </p>
                  </div>

                  {/* Quick Stats */}
                  <div className="border-t border-white/5 p-4">
                    <h4 className="text-xs text-text-muted mb-2 font-medium">{t('rankings.eventStars', 'Event Star Ratings')}</h4>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Marianas Open</span>
                        <StarDisplay count={5} />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Pro Tokyo / Nagoya</span>
                        <StarDisplay count={4} />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Pro Series (others)</span>
                        <StarDisplay count={3} />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Copa de Marianas</span>
                        <StarDisplay count={3} />
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
