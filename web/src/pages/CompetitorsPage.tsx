import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Instagram, Youtube, Trophy, Medal, ChevronDown, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import type { Competitor, CompetitorDetail } from '../services/api';
import ScrollReveal from '../components/ScrollReveal';
import SEO from '../components/SEO';

const BELT_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
  white:  { bg: 'bg-white/90',     text: 'text-gray-900', ring: 'ring-white/30' },
  blue:   { bg: 'bg-blue-600',     text: 'text-white',    ring: 'ring-blue-500/30' },
  purple: { bg: 'bg-purple-600',   text: 'text-white',    ring: 'ring-purple-500/30' },
  brown:  { bg: 'bg-amber-800',    text: 'text-white',    ring: 'ring-amber-700/30' },
  black:  { bg: 'bg-gray-900',     text: 'text-white',    ring: 'ring-gray-700/30' },
};

const COUNTRY_CODE_KEYS: Record<string, string> = {
  JP: 'countries.japan', KR: 'countries.southKorea', BR: 'countries.brazil', US: 'countries.unitedStates',
  PH: 'countries.philippines', GU: 'countries.guam', TW: 'countries.taiwan', HK: 'countries.hongKong',
  MP: 'countries.northernMariana', CN: 'countries.china', FR: 'countries.france', GB: 'countries.unitedKingdom',
  CA: 'countries.canada', AU: 'countries.australia', PW: 'countries.palau', FM: 'countries.micronesia',
};

function CountryFlag({ code }: { code: string }) {
  const { t } = useTranslation();
  return (
    <img
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
      alt={COUNTRY_CODE_KEYS[code] ? t(COUNTRY_CODE_KEYS[code]) : code}
      className="w-5 h-3.5 object-cover rounded-sm inline-block"
    />
  );
}

function BeltBadge({ rank }: { rank: string }) {
  const { t } = useTranslation();
  const s = BELT_STYLES[rank] || BELT_STYLES.white;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${s.bg} ${s.text} ring-1 ${s.ring}`}>
      {t(`watch.belt.${rank}`, rank)}
    </span>
  );
}

function MedalRow({ gold, silver, bronze }: { gold: number; silver: number; bronze: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {gold > 0 && <span className="flex items-center gap-0.5 text-yellow-400 font-semibold"><Medal className="w-3.5 h-3.5" />{gold}</span>}
      {silver > 0 && <span className="flex items-center gap-0.5 text-gray-300 font-semibold"><Medal className="w-3.5 h-3.5" />{silver}</span>}
      {bronze > 0 && <span className="flex items-center gap-0.5 text-orange-400 font-semibold"><Medal className="w-3.5 h-3.5" />{bronze}</span>}
    </div>
  );
}

function CompetitorCard({ competitor, onClick }: { competitor: Competitor; onClick: () => void }) {
  return (
    <motion.button
      layout
      onClick={onClick}
      className="bg-surface border border-white/5 hover:border-gold/20 transition-all duration-300 group text-left w-full"
      whileHover={{ y: -2 }}
    >
      <div className="aspect-[4/3] bg-white/[0.02] overflow-hidden relative">
        {competitor.photo_url ? (
          <img src={competitor.photo_url} alt={competitor.full_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl font-heading font-bold text-white/10">
              {competitor.first_name[0]}{competitor.last_name[0]}
            </span>
          </div>
        )}
        {competitor.belt_rank && (
          <div className="absolute top-3 right-3"><BeltBadge rank={competitor.belt_rank} /></div>
        )}
        {competitor.total_points > 0 && (
          <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm px-2 py-1 text-xs font-mono text-gold font-semibold">
            {competitor.total_points} pts
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2 mb-1">
          {competitor.country_code && <CountryFlag code={competitor.country_code} />}
          <h3 className="text-sm font-semibold text-text-primary truncate">
            {competitor.first_name} {competitor.last_name}
          </h3>
        </div>
        {competitor.nickname && (
          <p className="text-xs text-gold/70 mb-1">&quot;{competitor.nickname}&quot;</p>
        )}
        {competitor.academy && (
          <p className="text-xs text-text-muted truncate mb-2">{competitor.academy}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">
            {competitor.events_competed} event{competitor.events_competed !== 1 ? 's' : ''}
          </span>
          <MedalRow gold={competitor.gold_medals} silver={competitor.silver_medals} bronze={competitor.bronze_medals} />
        </div>
      </div>
    </motion.button>
  );
}

function CompetitorDetailModal({ competitorId, onClose }: { competitorId: number; onClose: () => void }) {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<CompetitorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    api.getCompetitor(competitorId)
      .then(setDetail)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [competitorId]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-navy-900 border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {error ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <p className="text-sm text-red-400">Failed to load competitor details.</p>
            <button onClick={onClose} className="text-sm text-text-muted hover:text-text-primary transition-colors">
              Close
            </button>
          </div>
        ) : loading || !detail ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 text-gold animate-spin" />
          </div>
        ) : (
          <>
            <div className="relative">
              <div className="aspect-[3/1] bg-white/[0.02] overflow-hidden">
                {detail.photo_url ? (
                  <img src={detail.photo_url} alt={detail.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/[0.03] to-transparent">
                    <span className="text-6xl font-heading font-bold text-white/10">
                      {detail.first_name[0]}{detail.last_name[0]}
                    </span>
                  </div>
                )}
              </div>
              <button onClick={onClose}
                className="absolute top-3 right-3 p-2 bg-black/50 text-white hover:bg-black/70 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {detail.country_code && <CountryFlag code={detail.country_code} />}
                    <h2 className="text-xl font-heading font-bold text-text-primary">
                      {detail.first_name} {detail.last_name}
                    </h2>
                  </div>
                  {detail.nickname && <p className="text-sm text-gold/80">&quot;{detail.nickname}&quot;</p>}
                  {detail.academy && (
                    <Link
                      to={detail.academy_slug ? `/teams?academy=${detail.academy_slug}` : `/teams?search=${encodeURIComponent(detail.academy)}`}
                      className="block text-sm text-text-secondary mt-1 hover:text-gold transition-colors duration-200"
                    >
                      {detail.academy}
                    </Link>
                  )}
                </div>
                {detail.belt_rank && <BeltBadge rank={detail.belt_rank} />}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                <div className="bg-white/[0.03] border border-white/5 p-3 text-center">
                  <div className="text-lg font-bold text-gold font-mono">{detail.total_points}</div>
                  <div className="text-xs text-text-muted uppercase tracking-wide">Points</div>
                </div>
                <div className="bg-white/[0.03] border border-white/5 p-3 text-center">
                  <div className="text-lg font-bold text-yellow-400">{detail.gold_medals}</div>
                  <div className="text-xs text-text-muted uppercase tracking-wide">{t('competitors.gold')}</div>
                </div>
                <div className="bg-white/[0.03] border border-white/5 p-3 text-center">
                  <div className="text-lg font-bold text-gray-300">{detail.silver_medals}</div>
                  <div className="text-xs text-text-muted uppercase tracking-wide">{t('competitors.silver')}</div>
                </div>
                <div className="bg-white/[0.03] border border-white/5 p-3 text-center">
                  <div className="text-lg font-bold text-orange-400">{detail.bronze_medals}</div>
                  <div className="text-xs text-text-muted uppercase tracking-wide">{t('competitors.bronze')}</div>
                </div>
                <div className="bg-white/[0.03] border border-white/5 p-3 text-center">
                  <div className="text-lg font-bold text-text-primary">{detail.events_competed}</div>
                  <div className="text-xs text-text-muted uppercase tracking-wide">Events</div>
                </div>
              </div>

              {detail.bio && (
                <p className="text-sm text-text-secondary leading-relaxed mb-6">{detail.bio}</p>
              )}

              {detail.results && detail.results.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-text-primary mb-3 uppercase tracking-wider">Tournament Results</h3>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {detail.results.map((r, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-2 px-3 bg-white/[0.02] border border-white/5">
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/events/${r.event_slug}`}
                            className="text-text-primary font-medium hover:text-gold transition-colors duration-200"
                          >
                            {r.event_name}
                          </Link>
                          <span className="text-text-muted ml-2">{r.division}</span>
                        </div>
                        <div className="flex items-center gap-3 ml-2 shrink-0">
                          <span className={`font-semibold ${r.placement === 1 ? 'text-yellow-400' : r.placement === 2 ? 'text-gray-300' : 'text-orange-400'}`}>
                            {r.placement === 1 ? '1st' : r.placement === 2 ? '2nd' : '3rd'}
                          </span>
                          <span className="text-gold/70 font-mono">+{r.points_earned}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(detail.instagram_url || detail.youtube_url) && (
                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                  {detail.instagram_url && (
                    <a href={detail.instagram_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-text-secondary hover:text-gold transition-colors">
                      <Instagram className="w-4 h-4" /> Instagram
                    </a>
                  )}
                  {detail.youtube_url && (
                    <a href={detail.youtube_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-text-secondary hover:text-gold transition-colors">
                      <Youtube className="w-4 h-4" /> YouTube
                    </a>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function CompetitorsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [beltFilter, setBeltFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const idParam = searchParams.get('id');
    return idParam ? Number(idParam) : null;
  });
  const [countries, setCountries] = useState<string[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const openCompetitor = (id: number) => {
    setSelectedId(id);
    setSearchParams(prev => { prev.set('id', String(id)); return prev; }, { replace: true });
  };

  const closeCompetitor = () => {
    setSelectedId(null);
    setSearchParams(prev => { prev.delete('id'); return prev; }, { replace: true });
  };

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(val), 350);
  };

  useEffect(() => {
    return () => { clearTimeout(searchTimer.current); };
  }, []);

  const fetchCompetitors = useCallback(async (p: number, append = false) => {
    const setter = p === 1 ? setLoading : setLoadingMore;
    setter(true);
    try {
      const params: Record<string, string> = { page: String(p) };
      if (search) params.search = search;
      if (beltFilter) params.belt_rank = beltFilter;
      if (countryFilter) params.country_code = countryFilter;
      const data = await api.getCompetitors(params);
      setCompetitors(prev => append ? [...prev, ...data.competitors] : data.competitors);
      setTotal(data.total);
      setPage(p);
      if (data.available_countries) setCountries(data.available_countries);
    } finally {
      setter(false);
    }
  }, [search, beltFilter, countryFilter]);

  useEffect(() => {
    fetchCompetitors(1);
  }, [fetchCompetitors]);

  const hasMore = competitors.length < total;

  const hasFilters = search || beltFilter || countryFilter;

  return (
    <div className="pt-24 pb-16">
      <SEO
        title="Competitors"
        description="Explore athlete profiles, academies, records, and medal results from Marianas Open competitors."
        path="/competitors"
        image="/images/action-match-2.webp"
        structuredData={[
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Marianas Open Competitors',
            url: 'https://marianasopen.com/competitors',
            description: 'Competitor directory and athlete profiles for Marianas Open.',
          },
        ]}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <ScrollReveal>
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-gold" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                {t('competitors.badge')}
              </span>
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl font-bold text-text-primary mb-3">
              {t('competitors.title')}
            </h1>
            <p className="text-text-secondary max-w-xl mx-auto">
              {total > 0 ? `${total} athletes from tournament results` : t('competitors.subtitle')}
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="bg-surface border border-white/5 p-4 mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input type="text" value={searchInput} onChange={e => handleSearchChange(e.target.value)}
                  placeholder={t('competitors.searchPlaceholder')}
                  className="w-full bg-white/[0.03] border border-white/10 pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none" />
              </div>
              <select value={beltFilter} onChange={e => setBeltFilter(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none">
                <option value="">{t('competitors.allBelts')}</option>
                {['white','blue','purple','brown','black'].map(b =>
                  <option key={b} value={b}>{t(`watch.belt.${b}`)}</option>
                )}
              </select>
              <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none">
                <option value="">{t('competitors.allCountries')}</option>
                {countries.map(c => <option key={c} value={c}>{COUNTRY_CODE_KEYS[c] ? t(COUNTRY_CODE_KEYS[c]) : c}</option>)}
              </select>
            </div>
            {hasFilters && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-text-muted">{total} {t('competitors.results')}</span>
                <button onClick={() => { setSearchInput(''); setSearch(''); setBeltFilter(''); setCountryFilter(''); }}
                  className="text-xs text-gold hover:text-gold/80 transition-colors">
                  {t('competitors.clearFilters')}
                </button>
              </div>
            )}
          </div>
        </ScrollReveal>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        ) : competitors.length === 0 ? (
          <div className="bg-surface border border-white/5 p-12 text-center">
            <p className="text-text-muted text-sm">{t('competitors.noResults')}</p>
          </div>
        ) : (
          <>
            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {competitors.map((c, i) => (
                <ScrollReveal key={c.id} delay={Math.min(i * 0.03, 0.3)}>
                  <CompetitorCard competitor={c} onClick={() => openCompetitor(c.id)} />
                </ScrollReveal>
              ))}
            </motion.div>

            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => fetchCompetitors(page + 1, true)}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-6 py-3 bg-white/[0.03] border border-white/10 text-sm text-text-primary hover:border-gold/30 hover:text-gold transition-all disabled:opacity-50"
                >
                  {loadingMore ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  Load more ({competitors.length} of {total})
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {selectedId && <CompetitorDetailModal competitorId={selectedId} onClose={closeCompetitor} />}
      </AnimatePresence>
    </div>
  );
}
