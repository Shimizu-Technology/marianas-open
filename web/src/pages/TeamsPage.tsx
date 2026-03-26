import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Building2, Medal, Loader2, ChevronDown } from 'lucide-react';
import { api } from '../services/api';
import type { Academy, AcademyDetail } from '../services/api';
import ScrollReveal from '../components/ScrollReveal';
import SEO from '../components/SEO';

const BELT_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
  white:  { bg: 'bg-white/90',     text: 'text-gray-900', ring: 'ring-white/30' },
  blue:   { bg: 'bg-blue-600',     text: 'text-white',    ring: 'ring-blue-500/30' },
  purple: { bg: 'bg-purple-600',   text: 'text-white',    ring: 'ring-purple-500/30' },
  brown:  { bg: 'bg-amber-800',    text: 'text-white',    ring: 'ring-amber-700/30' },
  black:  { bg: 'bg-gray-900',     text: 'text-white',    ring: 'ring-gray-700/30' },
};

function BeltBadge({ rank }: { rank: string }) {
  const s = BELT_STYLES[rank] || BELT_STYLES.white;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${s.bg} ${s.text} ring-1 ${s.ring}`}>
      {rank}
    </span>
  );
}

function CountryFlag({ code }: { code: string }) {
  return (
    <img
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
      alt={code}
      className="w-5 h-3.5 object-cover rounded-sm inline-block"
    />
  );
}

function AcademyCard({ academy, onClick }: { academy: Academy; onClick: () => void }) {
  return (
    <motion.button
      layout onClick={onClick}
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
    </motion.button>
  );
}

function AcademyDetailModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [detail, setDetail] = useState<AcademyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    api.getAcademy(slug)
      .then(setDetail)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

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
            <p className="text-sm text-red-400">Failed to load academy details.</p>
            <button onClick={onClose} className="text-sm text-text-muted hover:text-text-primary transition-colors">
              Close
            </button>
          </div>
        ) : loading || !detail ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 text-gold animate-spin" />
          </div>
        ) : (
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                {detail.logo_url ? (
                  <img src={detail.logo_url} alt={detail.name} className="w-16 h-16 object-contain rounded" />
                ) : (
                  <div className="w-16 h-16 bg-white/5 rounded flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-white/10" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {detail.country_code && <CountryFlag code={detail.country_code} />}
                    <h2 className="text-xl font-heading font-bold text-text-primary">{detail.name}</h2>
                  </div>
                  {detail.location && <p className="text-sm text-text-secondary">{detail.location}</p>}
                </div>
              </div>
              <button onClick={onClose} className="p-2 bg-black/50 text-white hover:bg-black/70 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
              <div className="bg-white/[0.03] border border-white/5 p-3 text-center">
                <div className="text-lg font-bold text-gold font-mono">{detail.total_points}</div>
                <div className="text-xs text-text-muted uppercase">Points</div>
              </div>
              <div className="bg-white/[0.03] border border-white/5 p-3 text-center">
                <div className="text-lg font-bold text-yellow-400">{detail.gold}</div>
                <div className="text-xs text-text-muted uppercase">Gold</div>
              </div>
              <div className="bg-white/[0.03] border border-white/5 p-3 text-center">
                <div className="text-lg font-bold text-gray-300">{detail.silver}</div>
                <div className="text-xs text-text-muted uppercase">Silver</div>
              </div>
              <div className="bg-white/[0.03] border border-white/5 p-3 text-center">
                <div className="text-lg font-bold text-orange-400">{detail.bronze}</div>
                <div className="text-xs text-text-muted uppercase">Bronze</div>
              </div>
              <div className="bg-white/[0.03] border border-white/5 p-3 text-center">
                <div className="text-lg font-bold text-text-primary">{Array.isArray(detail.athletes) ? detail.athletes.length : detail.athletes}</div>
                <div className="text-xs text-text-muted uppercase">Athletes</div>
              </div>
            </div>

            {detail.description && (
              <p className="text-sm text-text-secondary leading-relaxed mb-6">{detail.description}</p>
            )}

            {detail.athletes && detail.athletes.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-3 uppercase tracking-wider">Athletes</h3>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {detail.athletes.map(a => (
                    <Link
                      key={a.id}
                      to={`/competitors?id=${a.id}`}
                      className="flex items-center justify-between text-xs py-2 px-3 bg-white/[0.02] border border-white/5 hover:border-gold/20 hover:bg-white/[0.04] transition-all duration-200"
                    >
                      <div className="flex items-center gap-2">
                        {a.country_code && <CountryFlag code={a.country_code} />}
                        <span className="text-text-primary font-medium">{a.full_name}</span>
                        {a.belt_rank && <BeltBadge rank={a.belt_rank} />}
                      </div>
                      <div className="flex items-center gap-2 text-text-muted">
                        <span className="text-gold font-mono">{a.total_points}pts</span>
                        {a.gold > 0 && <span className="text-yellow-400">{a.gold}G</span>}
                        {a.silver > 0 && <span className="text-gray-300">{a.silver}S</span>}
                        {a.bronze > 0 && <span className="text-orange-400">{a.bronze}B</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {(detail.website_url || detail.instagram_url || detail.facebook_url) && (
              <div className="flex items-center gap-3 pt-4 mt-4 border-t border-white/5">
                {detail.website_url && (
                  <a href={detail.website_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-text-secondary hover:text-gold transition-colors">Website</a>
                )}
                {detail.instagram_url && (
                  <a href={detail.instagram_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-text-secondary hover:text-gold transition-colors">Instagram</a>
                )}
                {detail.facebook_url && (
                  <a href={detail.facebook_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-text-secondary hover:text-gold transition-colors">Facebook</a>
                )}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function TeamsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(() => searchParams.get('academy') || null);

  const openAcademy = (slug: string) => {
    setSelectedSlug(slug);
    setSearchParams(prev => { prev.set('academy', slug); return prev; }, { replace: true });
  };

  const closeAcademy = () => {
    setSelectedSlug(null);
    setSearchParams(prev => { prev.delete('academy'); return prev; }, { replace: true });
  };

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
                  <AcademyCard academy={a} onClick={() => openAcademy(a.slug)} />
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

      <AnimatePresence>
        {selectedSlug && <AcademyDetailModal slug={selectedSlug} onClose={closeAcademy} />}
      </AnimatePresence>
    </div>
  );
}
