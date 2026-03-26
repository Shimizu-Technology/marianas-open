import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Building2, Medal, Loader2, ChevronDown } from 'lucide-react';
import { api } from '../services/api';
import type { Academy } from '../services/api';
import ScrollReveal from '../components/ScrollReveal';
import SEO from '../components/SEO';

function CountryFlag({ code }: { code: string }) {
  return (
    <img
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
      alt={code}
      className="w-5 h-3.5 object-cover rounded-sm inline-block"
    />
  );
}

function AcademyCard({ academy }: { academy: Academy }) {
  return (
    <Link to={`/teams/${academy.slug}`}>
      <motion.div
        layout
        className="bg-surface border border-white/5 hover:border-gold/20 transition-all duration-300 group text-left w-full p-5"
        whileHover={{ y: -2 }}
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
            <div className="flex items-center gap-2 mb-1">
              {academy.country_code && <CountryFlag code={academy.country_code} />}
              <h3 className="text-sm font-semibold text-text-primary truncate">{academy.name}</h3>
            </div>
            <div className="flex items-center gap-3 text-xs text-text-muted mb-3">
              <span>{academy.athletes} athlete{academy.athletes !== 1 ? 's' : ''}</span>
              <span>{academy.events_competed} event{academy.events_competed !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-gold font-semibold">{academy.total_points} pts</span>
              <div className="flex items-center gap-2 text-xs">
                {academy.gold > 0 && <span className="flex items-center gap-0.5 text-yellow-400"><Medal className="w-3.5 h-3.5" />{academy.gold}</span>}
                {academy.silver > 0 && <span className="flex items-center gap-0.5 text-gray-300"><Medal className="w-3.5 h-3.5" />{academy.silver}</span>}
                {academy.bronze > 0 && <span className="flex items-center gap-0.5 text-orange-400"><Medal className="w-3.5 h-3.5" />{academy.bronze}</span>}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

export default function TeamsPage() {
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <ScrollReveal>
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-gold" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Academies</span>
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl font-bold text-text-primary mb-3">
              Teams & Academies
            </h1>
            <p className="text-text-secondary max-w-xl mx-auto">
              {total > 0 ? `${total} academies competing across Marianas Open tournaments` : 'Loading...'}
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="bg-surface border border-white/5 p-4 mb-8">
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search academies..."
                className="w-full bg-white/[0.03] border border-white/10 pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none" />
            </div>
          </div>
        </ScrollReveal>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        ) : academies.length === 0 ? (
          <div className="bg-surface border border-white/5 p-12 text-center">
            <p className="text-text-muted text-sm">No academies found.</p>
          </div>
        ) : (
          <>
            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {academies.map((a, i) => (
                <ScrollReveal key={a.id} delay={Math.min(i * 0.03, 0.3)}>
                  <AcademyCard academy={a} />
                </ScrollReveal>
              ))}
            </motion.div>

            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => fetchAcademies(page + 1, true)}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-6 py-3 bg-white/[0.03] border border-white/10 text-sm text-text-primary hover:border-gold/30 hover:text-gold transition-all disabled:opacity-50"
                >
                  {loadingMore ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  Load more ({academies.length} of {total})
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
