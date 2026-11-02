import { useTranslation } from 'react-i18next';
import { formatNumber } from '../utils/numbers';
import CountryFlag from '../components/CountryFlag';
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Building2, Medal, Loader2, ChevronDown } from 'lucide-react';
import { api } from '../services/api';
import type { Academy } from '../services/api';
import ScrollReveal from '../components/ScrollReveal';
import SEO from '../components/SEO';


function AcademyCard({ academy }: { academy: Academy }) {
  const { t, i18n } = useTranslation();
  return (
    <Link to={`/teams/${academy.slug}`}>
      <div
        className="ui-card hover:border-gold/20 transition-colors duration-150 group text-left w-full p-5"

      >
        <div className="flex items-start gap-4">
          {academy.logo_url ? (
            <img src={academy.logo_url} alt={academy.name} className="w-12 h-12 object-contain rounded shrink-0" />
          ) : (
            <div className="w-12 h-12 bg-white/5 rounded flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6 text-white/10" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {academy.country_code && <CountryFlag code={academy.country_code} />}
              <h2 className="text-lg font-semibold text-text-primary break-words">{academy.name}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted mb-3">
              <span>{t('academies.athletes', { count: academy.athletes })}</span>
              <span>{t('academies.events', { count: academy.events_competed })}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                {academy.gold > 0 && <span className="flex items-center gap-0.5 text-yellow-400"><Medal className="w-3.5 h-3.5" />{formatNumber(academy.gold, i18n.language)}</span>}
                {academy.silver > 0 && <span className="flex items-center gap-0.5 text-gray-300"><Medal className="w-3.5 h-3.5" />{formatNumber(academy.silver, i18n.language)}</span>}
                {academy.bronze > 0 && <span className="flex items-center gap-0.5 text-orange-400"><Medal className="w-3.5 h-3.5" />{formatNumber(academy.bronze, i18n.language)}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function TeamsPage() {
  const { t, i18n } = useTranslation();
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');

  const fetchAcademies = useCallback(async (p: number, append = false) => {
    const setter = p === 1 ? setLoading : setLoadingMore;
    setter(true);
    try {
      const params: Record<string, string> = { page: String(p) };
      if (search) params.search = search;
      const data = await api.getAcademies(params);
      setAcademies(prev => append ? [...prev, ...data.academies] : data.academies);
      setTotal(data.total);
      setPage(p);
    } finally {
      setter(false);
    }
  }, [search]);

  useEffect(() => { fetchAcademies(1) }, [fetchAcademies]);

  const hasMore = academies.length < total;

  return (
    <div className="pt-24 pb-16">
      <SEO
        title="Teams & Academies"
        description="Explore BJJ academies and teams competing in Marianas Open tournaments."
        path="/teams"
      />
      <div className="max-w-7xl mx-auto px-5 sm:px-6">
        <ScrollReveal>
          <div className="mb-8">
            <div className="hidden">
              <Building2 className="w-5 h-5 text-gold" />
              <span className="text-sm font-medium text-gold">{t('academies.badge')}</span>
            </div>
            <h1 className="font-heading text-3xl sm:text-5xl font-semibold text-text-primary mb-3">
              {t('academies.title')}
            </h1>
            <p className="text-text-secondary max-w-2xl">
              {total > 0 ? t('academies.summary', { count: total }) : t('common.loading')}
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="ui-card p-4 mb-8">
            <div className="relative max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                aria-label={t('academies.search')}
                placeholder={t('academies.search')}
                className="w-full bg-white/[0.03] border border-white/10 pl-9 pr-3 py-2 min-h-12 text-base text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none" />
            </div>
          </div>
        </ScrollReveal>

        {loading ? (
          <div className="flex items-center justify-center min-h-svh">
            <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        ) : academies.length === 0 ? (
          <div className="ui-card p-12 text-center">
            <p className="text-text-muted text-sm">{t('academies.empty')}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {academies.map((a) => (
                <ScrollReveal key={a.id}>
                  <AcademyCard academy={a} />
                </ScrollReveal>
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => fetchAcademies(page + 1, true)}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-6 py-3 bg-white/[0.03] border border-white/10 text-sm text-text-primary hover:border-gold/30 hover:text-gold transition-colors disabled:opacity-50"
                >
                  {loadingMore ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  {t('academies.more', { shown: formatNumber(academies.length, i18n.language), total: formatNumber(total, i18n.language) })}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
