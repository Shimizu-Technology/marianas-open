import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Instagram, Youtube, Trophy } from 'lucide-react';
import { api } from '../services/api';
import type { Competitor } from '../services/api';
import ScrollReveal from '../components/ScrollReveal';

const BELT_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
  white:  { bg: 'bg-white/90',     text: 'text-gray-900', ring: 'ring-white/30' },
  blue:   { bg: 'bg-blue-600',     text: 'text-white',    ring: 'ring-blue-500/30' },
  purple: { bg: 'bg-purple-600',   text: 'text-white',    ring: 'ring-purple-500/30' },
  brown:  { bg: 'bg-amber-800',    text: 'text-white',    ring: 'ring-amber-700/30' },
  black:  { bg: 'bg-gray-900',     text: 'text-white',    ring: 'ring-gray-700/30' },
};

const COUNTRY_NAMES: Record<string, string> = {
  JP: 'Japan', KR: 'South Korea', BR: 'Brazil', US: 'United States',
  PH: 'Philippines', GU: 'Guam', TW: 'Taiwan', HK: 'Hong Kong',
};

function CountryFlag({ code }: { code: string }) {
  return (
    <img
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
      alt={COUNTRY_NAMES[code] || code}
      className="w-5 h-3.5 object-cover rounded-sm inline-block"
    />
  );
}

function BeltBadge({ rank }: { rank: string }) {
  const s = BELT_STYLES[rank] || BELT_STYLES.white;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${s.bg} ${s.text} ring-1 ${s.ring}`}>
      {rank}
    </span>
  );
}

/* ── Card ── */
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
          <span className="text-xs text-text-secondary font-mono">
            {competitor.wins}W - {competitor.losses}L - {competitor.draws}D
          </span>
          {(competitor.gold_medals > 0 || competitor.silver_medals > 0 || competitor.bronze_medals > 0) && (
            <div className="flex items-center gap-1.5 text-xs">
              {competitor.gold_medals > 0 && <span className="text-yellow-400">{competitor.gold_medals}G</span>}
              {competitor.silver_medals > 0 && <span className="text-gray-300">{competitor.silver_medals}S</span>}
              {competitor.bronze_medals > 0 && <span className="text-orange-400">{competitor.bronze_medals}B</span>}
            </div>
          )}
        </div>
      </div>
    </motion.button>
  );
}

/* ── Detail modal ── */
function CompetitorDetail({ competitor, onClose }: { competitor: Competitor; onClose: () => void }) {
  const { t } = useTranslation();

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
        {/* Banner */}
        <div className="relative">
          <div className="aspect-[3/1] bg-white/[0.02] overflow-hidden">
            {competitor.photo_url ? (
              <img src={competitor.photo_url} alt={competitor.full_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/[0.03] to-transparent">
                <span className="text-6xl font-heading font-bold text-white/10">
                  {competitor.first_name[0]}{competitor.last_name[0]}
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
          {/* Name */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {competitor.country_code && <CountryFlag code={competitor.country_code} />}
                <h2 className="text-xl font-heading font-bold text-text-primary">
                  {competitor.first_name} {competitor.last_name}
                </h2>
              </div>
              {competitor.nickname && <p className="text-sm text-gold/80">&quot;{competitor.nickname}&quot;</p>}
              {competitor.academy && <p className="text-sm text-text-secondary mt-1">{competitor.academy}</p>}
            </div>
            {competitor.belt_rank && <BeltBadge rank={competitor.belt_rank} />}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white/[0.03] border border-white/5 p-3 text-center">
              <div className="text-lg font-bold text-text-primary font-mono">
                {competitor.wins}-{competitor.losses}-{competitor.draws}
              </div>
              <div className="text-xs text-text-muted uppercase tracking-wide">{t('competitors.record')}</div>
            </div>
            <div className="bg-white/[0.03] border border-white/5 p-3 text-center">
              <div className="text-lg font-bold text-yellow-400">{competitor.gold_medals}</div>
              <div className="text-xs text-text-muted uppercase tracking-wide">{t('competitors.gold')}</div>
            </div>
            <div className="bg-white/[0.03] border border-white/5 p-3 text-center">
              <div className="text-lg font-bold text-gray-300">{competitor.silver_medals}</div>
              <div className="text-xs text-text-muted uppercase tracking-wide">{t('competitors.silver')}</div>
            </div>
            <div className="bg-white/[0.03] border border-white/5 p-3 text-center">
              <div className="text-lg font-bold text-orange-400">{competitor.bronze_medals}</div>
              <div className="text-xs text-text-muted uppercase tracking-wide">{t('competitors.bronze')}</div>
            </div>
          </div>

          {competitor.weight_class && (
            <div className="mb-4">
              <span className="text-xs text-text-muted uppercase tracking-wide">{t('competitors.weightClass')}: </span>
              <span className="text-sm text-text-primary">{competitor.weight_class}</span>
            </div>
          )}

          {competitor.bio && (
            <p className="text-sm text-text-secondary leading-relaxed mb-6">{competitor.bio}</p>
          )}

          {(competitor.instagram_url || competitor.youtube_url) && (
            <div className="flex items-center gap-3 pt-4 border-t border-white/5">
              {competitor.instagram_url && (
                <a href={competitor.instagram_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-text-secondary hover:text-gold transition-colors">
                  <Instagram className="w-4 h-4" /> Instagram
                </a>
              )}
              {competitor.youtube_url && (
                <a href={competitor.youtube_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-text-secondary hover:text-gold transition-colors">
                  <Youtube className="w-4 h-4" /> YouTube
                </a>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Page ── */
export default function CompetitorsPage() {
  const { t } = useTranslation();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [beltFilter, setBeltFilter] = useState('');
  const [weightFilter, setWeightFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [selected, setSelected] = useState<Competitor | null>(null);

  useEffect(() => {
    api.getCompetitors().then(setCompetitors).finally(() => setLoading(false));
  }, []);

  const countries = useMemo(() =>
    [...new Set(competitors.map(c => c.country_code).filter(Boolean) as string[])].sort(),
    [competitors]
  );
  const weightClasses = useMemo(() =>
    [...new Set(competitors.map(c => c.weight_class).filter(Boolean) as string[])].sort(),
    [competitors]
  );

  const filtered = useMemo(() => competitors.filter(c => {
    if (search) {
      const q = search.toLowerCase();
      if (!`${c.first_name} ${c.last_name} ${c.nickname || ''} ${c.academy || ''}`.toLowerCase().includes(q)) return false;
    }
    if (beltFilter && c.belt_rank !== beltFilter) return false;
    if (weightFilter && c.weight_class !== weightFilter) return false;
    if (countryFilter && c.country_code !== countryFilter) return false;
    return true;
  }), [competitors, search, beltFilter, weightFilter, countryFilter]);

  const hasFilters = search || beltFilter || weightFilter || countryFilter;

  return (
    <div className="pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Hero */}
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
            <p className="text-text-secondary max-w-xl mx-auto">{t('competitors.subtitle')}</p>
          </div>
        </ScrollReveal>

        {/* Filters */}
        <ScrollReveal delay={0.1}>
          <div className="bg-surface border border-white/5 p-4 mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder={t('competitors.searchPlaceholder')}
                  className="w-full bg-white/[0.03] border border-white/10 pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none" />
              </div>
              <select value={beltFilter} onChange={e => setBeltFilter(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none">
                <option value="">{t('competitors.allBelts')}</option>
                {['white','blue','purple','brown','black'].map(b =>
                  <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</option>
                )}
              </select>
              <select value={weightFilter} onChange={e => setWeightFilter(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none">
                <option value="">{t('competitors.allWeights')}</option>
                {weightClasses.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
              <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none">
                <option value="">{t('competitors.allCountries')}</option>
                {countries.map(c => <option key={c} value={c}>{COUNTRY_NAMES[c] || c}</option>)}
              </select>
            </div>
            {hasFilters && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-text-muted">{filtered.length} {t('competitors.results')}</span>
                <button onClick={() => { setSearch(''); setBeltFilter(''); setWeightFilter(''); setCountryFilter(''); }}
                  className="text-xs text-gold hover:text-gold/80 transition-colors">
                  {t('competitors.clearFilters')}
                </button>
              </div>
            )}
          </div>
        </ScrollReveal>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-surface border border-white/5 p-12 text-center">
            <p className="text-text-muted text-sm">{t('competitors.noResults')}</p>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((c, i) => (
              <ScrollReveal key={c.id} delay={Math.min(i * 0.05, 0.3)}>
                <CompetitorCard competitor={c} onClick={() => setSelected(c)} />
              </ScrollReveal>
            ))}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {selected && <CompetitorDetail competitor={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
}
