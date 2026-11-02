import { formatNumber } from '../utils/numbers';
import CountryFlag from '../components/CountryFlag';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Search, Trophy, Medal, ChevronDown, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import type { Competitor } from '../services/api';
import ScrollReveal from '../components/ScrollReveal';
import SEO from '../components/SEO';

const BELT_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
  white:  { bg: 'bg-white/90',     text: 'text-gray-900', ring: 'ring-white/30' },
  blue:   { bg: 'bg-blue-600',     text: 'text-white',    ring: 'ring-blue-500/30' },
  purple: { bg: 'bg-purple-600',   text: 'text-white',    ring: 'ring-purple-500/30' }, // taste-skill-ignore: purple identifies an actual BJJ belt, not a decorative accent.
  brown:  { bg: 'bg-amber-800',    text: 'text-white',    ring: 'ring-amber-700/30' },
  black:  { bg: 'bg-gray-900',     text: 'text-white',    ring: 'ring-gray-700/30' },
};

const COUNTRY_CODE_KEYS: Record<string, string> = {
  JP: 'countries.japan', KR: 'countries.southKorea', BR: 'countries.brazil', US: 'countries.unitedStates',
  PH: 'countries.philippines', GU: 'countries.guam', TW: 'countries.taiwan', HK: 'countries.hongKong',
  MP: 'countries.northernMariana', CN: 'countries.china', FR: 'countries.france', GB: 'countries.unitedKingdom',
  CA: 'countries.canada', AU: 'countries.australia', PW: 'countries.palau', FM: 'countries.micronesia',
};


function BeltBadge({ rank }: { rank: string }) {
  const { t } = useTranslation();
  const s = BELT_STYLES[rank] || BELT_STYLES.white;
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${s.bg} ${s.text} ring-1 ${s.ring}`}>
      {t(`watch.belt.${rank}`, rank)}
    </span>
  );
}

function MedalRow({ gold, silver, bronze }: { gold: number; silver: number; bronze: number }) {
  const { i18n } = useTranslation();
  return (
    <div className="flex items-center gap-2 text-xs">
      {gold > 0 && <span className="flex items-center gap-0.5 text-yellow-400 font-semibold"><Medal className="w-3.5 h-3.5" />{formatNumber(gold, i18n.language)}</span>}
      {silver > 0 && <span className="flex items-center gap-0.5 text-gray-300 font-semibold"><Medal className="w-3.5 h-3.5" />{formatNumber(silver, i18n.language)}</span>}
      {bronze > 0 && <span className="flex items-center gap-0.5 text-orange-400 font-semibold"><Medal className="w-3.5 h-3.5" />{formatNumber(bronze, i18n.language)}</span>}
    </div>
  );
}

function CompetitorCard({ competitor }: { competitor: Competitor }) {
  const { t } = useTranslation();
  return (
    <Link className="block h-full" to={`/competitors/${competitor.id}`}>
      <div
        className="ui-card hover:border-gold/20 transition-colors duration-150 group text-left w-full h-full flex items-start gap-4 p-4 sm:block sm:p-0"

      >
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white/[0.02] relative sm:aspect-[4/3] sm:h-auto sm:w-full sm:rounded-none">
          {competitor.photo_url ? (
            <img src={competitor.photo_url} alt={competitor.full_name}
              className="w-full h-full object-cover motion-safe:group-hover:scale-[1.02] transition-transform duration-200" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl font-heading font-bold text-text-muted">
                {competitor.first_name[0]}{competitor.last_name[0]}
              </span>
            </div>
          )}
          {competitor.belt_rank && (
            <div className="hidden sm:absolute sm:top-3 sm:right-3 sm:block"><BeltBadge rank={competitor.belt_rank} /></div>
          )}
        </div>

        <div className="min-w-0 flex-1 sm:p-4">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {competitor.country_code && <CountryFlag code={competitor.country_code} label={COUNTRY_CODE_KEYS[competitor.country_code] ? t(COUNTRY_CODE_KEYS[competitor.country_code]) : competitor.country_code} />}
            <h2 className="text-lg font-semibold text-text-primary break-words">
              {competitor.full_name}
            </h2>
          </div>
          {competitor.nickname && (
            <p className="text-xs text-gold/70 mb-1">&quot;{competitor.nickname}&quot;</p>
          )}
          {competitor.academy && (
            <p className="text-xs text-text-secondary break-words mb-2">{competitor.academy}</p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-text-secondary">
              {t('academies.events', { count: competitor.events_competed })}
            </span>
            <MedalRow gold={competitor.gold_medals} silver={competitor.silver_medals} bronze={competitor.bronze_medals} />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function CompetitorsPage() {
  const { t, i18n } = useTranslation();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [beltFilter, setBeltFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [countries, setCountries] = useState<string[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

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
      <div className="max-w-7xl mx-auto px-5 sm:px-6">
        <ScrollReveal>
          <div className="mb-8">
            <div className="hidden">
              <Trophy className="w-5 h-5 text-gold" />
              <span className="text-sm font-medium text-gold">
                {t('competitors.badge')}
              </span>
            </div>
            <h1 className="font-heading text-3xl sm:text-5xl font-semibold text-text-primary mb-3">
              {t('competitors.title')}
            </h1>
            <p className="text-text-secondary max-w-2xl">
              {total > 0 ? t('visualB.athleteCount', { count: total }) : t('competitors.subtitle')}
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="ui-card p-4 mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input type="text" value={searchInput} onChange={e => handleSearchChange(e.target.value)}
                  aria-label={t('competitors.searchPlaceholder')}
                  placeholder={t('competitors.searchPlaceholder')}
                  className="w-full bg-white/[0.03] border border-white/10 pl-9 pr-3 py-2 min-h-12 text-base text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none" />
              </div>
              <select aria-label={t('competitors.allBelts')} value={beltFilter} onChange={e => setBeltFilter(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 min-h-12 text-base text-text-primary focus:border-gold/40 focus:outline-none">
                <option value="">{t('competitors.allBelts')}</option>
                {['white','blue','purple','brown','black'].map(b =>
                  <option key={b} value={b}>{t(`watch.belt.${b}`)}</option>
                )}
              </select>
              <select aria-label={t('competitors.allCountries')} value={countryFilter} onChange={e => setCountryFilter(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 min-h-12 text-base text-text-primary focus:border-gold/40 focus:outline-none">
                <option value="">{t('competitors.allCountries')}</option>
                {countries.map(c => <option key={c} value={c}>{COUNTRY_CODE_KEYS[c] ? t(COUNTRY_CODE_KEYS[c]) : c}</option>)}
              </select>
            </div>
            {hasFilters && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-text-muted">{formatNumber(total, i18n.language)} {t('competitors.results')}</span>
                <button onClick={() => { setSearchInput(''); setSearch(''); setBeltFilter(''); setCountryFilter(''); }}
                  className="text-xs text-gold hover:text-gold/80 transition-colors">
                  {t('competitors.clearFilters')}
                </button>
              </div>
            )}
          </div>
        </ScrollReveal>

        {loading ? (
          <div className="flex items-center justify-center min-h-svh">
            <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        ) : competitors.length === 0 ? (
          <div className="ui-card p-12 text-center">
            <p className="text-text-muted text-sm">{t('competitors.noResults')}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {competitors.map((c) => (
                <ScrollReveal key={c.id}>
                  <CompetitorCard competitor={c} />
                </ScrollReveal>
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => fetchCompetitors(page + 1, true)}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-6 py-3 bg-white/[0.03] border border-white/10 text-sm text-text-primary hover:border-gold/30 hover:text-gold transition-colors disabled:opacity-50"
                >
                  {loadingMore ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  {t('academies.more', { shown: formatNumber(competitors.length, i18n.language), total: formatNumber(total, i18n.language) })}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
