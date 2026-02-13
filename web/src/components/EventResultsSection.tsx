import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Trophy, Search, ChevronDown, ChevronUp, Medal, Users, Globe, Building2, Filter, Award } from 'lucide-react';
import ScrollReveal from './ScrollReveal';
import { api } from '../services/api';
import type { EventResultDivision, EventResultsSummary } from '../services/api';

// --- Belt colors ---
const BELT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  white:  { bg: 'bg-white/10',       text: 'text-white',      border: 'border-white/30' },
  blue:   { bg: 'bg-[#2563eb]/15',   text: 'text-[#60a5fa]',  border: 'border-[#2563eb]/40' },
  purple: { bg: 'bg-[#7c3aed]/15',   text: 'text-[#a78bfa]',  border: 'border-[#7c3aed]/40' },
  brown:  { bg: 'bg-[#92400e]/15',   text: 'text-[#d97706]',  border: 'border-[#92400e]/40' },
  black:  { bg: 'bg-[#1a1a1a]/40',   text: 'text-white',      border: 'border-white/20' },
};

const PLACEMENT_COLORS: Record<number, { bg: string; text: string; border: string; label: string }> = {
  1: { bg: 'bg-[#D4A843]/15', text: 'text-[#D4A843]', border: 'border-[#D4A843]/40', label: '1st' },
  2: { bg: 'bg-[#C0C0C0]/10', text: 'text-[#C0C0C0]', border: 'border-[#C0C0C0]/30', label: '2nd' },
  3: { bg: 'bg-[#CD7F32]/10', text: 'text-[#CD7F32]', border: 'border-[#CD7F32]/30', label: '3rd' },
};

function CountryFlag({ code, className = 'w-5 h-4' }: { code: string; className?: string }) {
  if (!code) return null;
  return (
    <img
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
      alt={code}
      className={`${className} object-cover rounded-sm inline-block`}
      loading="lazy"
    />
  );
}

function BeltBadge({ belt }: { belt: string }) {
  const normalized = belt.toLowerCase().replace(/\s+belt$/, '');
  const colors = BELT_COLORS[normalized] || BELT_COLORS.white;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-heading font-semibold uppercase tracking-wider border ${colors.bg} ${colors.text} ${colors.border}`}>
      {belt}
    </span>
  );
}

function PlacementBadge({ placement }: { placement: number }) {
  const colors = PLACEMENT_COLORS[placement];
  if (!colors) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 text-xs font-heading font-bold text-text-muted bg-white/5 border border-white/10">
        {placement}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 text-xs font-heading font-bold border ${colors.bg} ${colors.text} ${colors.border}`}>
      {colors.label}
    </span>
  );
}

// --- Summary Stats ---
function SummaryStats({ summary }: { summary: EventResultsSummary }) {
  const { t } = useTranslation();
  const stats = [
    { label: t('results.totalCompetitors'), value: summary.total_results, icon: Users },
    { label: t('results.divisions'), value: summary.divisions, icon: Award },
    { label: t('results.countries'), value: summary.countries, icon: Globe },
    { label: t('results.academies'), value: summary.academies, icon: Building2 },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((stat, i) => (
        <ScrollReveal key={stat.label} delay={i * 0.06}>
          <div className="bg-surface border border-white/5 p-5 text-center hover:border-gold-500/20 transition-colors duration-300">
            <stat.icon size={18} className="text-gold-500 mx-auto mb-2" />
            <div className="text-2xl sm:text-3xl font-heading font-black text-text-primary tabular-nums">
              {stat.value}
            </div>
            <div className="text-xs text-text-muted font-heading uppercase tracking-wider mt-1">
              {stat.label}
            </div>
          </div>
        </ScrollReveal>
      ))}
    </div>
  );
}

// --- Belt Breakdown ---
function BeltBreakdown({ breakdown }: { breakdown: Record<string, number> }) {
  const { t } = useTranslation();
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const beltOrder = ['white', 'blue', 'purple', 'brown', 'black'];
  const sorted = beltOrder.filter(b => breakdown[b]);

  return (
    <ScrollReveal>
      <div className="bg-surface border border-white/5 p-6">
        <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-text-muted mb-4">
          {t('results.beltBreakdown')}
        </h3>
        <div className="space-y-3">
          {sorted.map((belt) => {
            const count = breakdown[belt];
            const pct = total > 0 ? (count / total) * 100 : 0;
            const colors = BELT_COLORS[belt] || BELT_COLORS.white;
            return (
              <div key={belt} className="space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <span className={`font-heading font-semibold uppercase tracking-wider ${colors.text}`}>
                    {t(`results.${belt}`)}
                  </span>
                  <span className="text-text-muted tabular-nums">{count}</span>
                </div>
                <div className="h-2 bg-white/5 overflow-hidden">
                  <motion.div
                    className={`h-full ${belt === 'white' ? 'bg-white/30' : belt === 'blue' ? 'bg-[#2563eb]' : belt === 'purple' ? 'bg-[#7c3aed]' : belt === 'brown' ? 'bg-[#92400e]' : 'bg-white/60'}`}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${pct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ScrollReveal>
  );
}

// --- Top Academies ---
function TopAcademies({ academies }: { academies: EventResultsSummary['top_academies'] }) {
  const { t } = useTranslation();

  return (
    <ScrollReveal delay={0.1}>
      <div className="bg-surface border border-white/5 p-6">
        <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-text-muted mb-4">
          {t('results.topAcademies')}
        </h3>
        <div className="space-y-0">
          {academies.slice(0, 10).map((academy, i) => (
            <div key={academy.name} className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
              <span className="w-6 text-center text-xs font-heading font-bold text-text-muted tabular-nums">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-heading font-semibold text-text-primary truncate">
                  {academy.name}
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs tabular-nums shrink-0">
                <span className="text-[#D4A843] font-semibold">{academy.gold}<span className="text-text-muted ml-0.5">G</span></span>
                <span className="text-[#C0C0C0] font-semibold">{academy.silver}<span className="text-text-muted ml-0.5">S</span></span>
                <span className="text-[#CD7F32] font-semibold">{academy.bronze}<span className="text-text-muted ml-0.5">B</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollReveal>
  );
}

// --- Division Group ---
function DivisionGroup({ division, isOpen, onToggle, index }: {
  division: EventResultDivision;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  const shouldReduceMotion = useReducedMotion();
  const podiumResults = division.results.filter(r => r.placement <= 3).sort((a, b) => a.placement - b.placement);
  const otherResults = division.results.filter(r => r.placement > 3).sort((a, b) => a.placement - b.placement);

  return (
    <motion.div
      initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.3), ease: [0.25, 0.46, 0.45, 0.94] }}
      className="bg-surface border border-white/5 overflow-hidden"
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Trophy size={16} className="text-gold-500 shrink-0" />
          <h4 className="font-heading font-bold text-sm sm:text-base uppercase tracking-wider text-text-primary truncate">
            {division.division}
          </h4>
          <span className="text-xs text-text-muted shrink-0">
            ({division.results.length})
          </span>
        </div>
        {isOpen ? (
          <ChevronUp size={16} className="text-text-muted shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-text-muted shrink-0" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-5 pb-5 space-y-2">
              {/* Podium results */}
              {podiumResults.map((result) => {
                const pColors = PLACEMENT_COLORS[result.placement];
                return (
                  <div
                    key={result.id}
                    className={`flex items-center gap-3 p-3 border ${pColors ? `${pColors.bg} ${pColors.border}` : 'bg-white/[0.02] border-white/5'}`}
                  >
                    <PlacementBadge placement={result.placement} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-heading font-bold ${pColors ? pColors.text : 'text-text-primary'}`}>
                        {result.competitor_name}
                      </div>
                      <div className="text-xs text-text-muted truncate">{result.academy}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {result.country_code && <CountryFlag code={result.country_code} className="w-5 h-3.5" />}
                      <BeltBadge belt={result.belt_rank} />
                    </div>
                  </div>
                );
              })}

              {/* Other results */}
              {otherResults.map((result) => (
                <div
                  key={result.id}
                  className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5"
                >
                  <PlacementBadge placement={result.placement} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-heading font-semibold text-text-primary">
                      {result.competitor_name}
                    </div>
                    <div className="text-xs text-text-muted truncate">{result.academy}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {result.country_code && <CountryFlag code={result.country_code} className="w-5 h-3.5" />}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// --- Main Section ---
export default function EventResultsSection({ eventSlug }: { eventSlug: string }) {
  const { t } = useTranslation();
  const [results, setResults] = useState<EventResultDivision[]>([]);
  const [summary, setSummary] = useState<EventResultsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [openDivisions, setOpenDivisions] = useState<Set<string>>(new Set());

  // Filters
  const [search, setSearch] = useState('');
  const [beltFilter, setBeltFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [weightFilter, setWeightFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(false);
    Promise.all([
      api.getEventResults(eventSlug).catch(() => []),
      api.getEventResultsSummary(eventSlug).catch(() => null),
    ]).then(([res, sum]) => {
      setResults(res);
      setSummary(sum);
      // Auto-expand first 3 divisions
      const first3 = res.slice(0, 3).map(d => d.division);
      setOpenDivisions(new Set(first3));
    }).catch(() => setError(true)).finally(() => setLoading(false));
  }, [eventSlug]);

  // Derive filter options from results
  const filterOptions = useMemo(() => {
    const belts = new Set<string>();
    const genders = new Set<string>();
    const weights = new Set<string>();
    for (const div of results) {
      for (const r of div.results) {
        if (r.belt_rank) belts.add(r.belt_rank);
        if (r.gender) genders.add(r.gender);
        if (r.weight_class) weights.add(r.weight_class);
      }
    }
    return {
      belts: Array.from(belts).sort(),
      genders: Array.from(genders).sort(),
      weights: Array.from(weights).sort(),
    };
  }, [results]);

  // Filtered results
  const filteredDivisions = useMemo(() => {
    if (!search && !beltFilter && !genderFilter && !weightFilter) return results;

    const searchLower = search.toLowerCase();
    return results
      .map(div => ({
        ...div,
        results: div.results.filter(r => {
          if (search && !r.competitor_name.toLowerCase().includes(searchLower) && !r.academy.toLowerCase().includes(searchLower)) return false;
          if (beltFilter && r.belt_rank !== beltFilter) return false;
          if (genderFilter && r.gender !== genderFilter) return false;
          if (weightFilter && r.weight_class !== weightFilter) return false;
          return true;
        }),
      }))
      .filter(div => div.results.length > 0);
  }, [results, search, beltFilter, genderFilter, weightFilter]);

  const toggleDivision = (division: string) => {
    setOpenDivisions(prev => {
      const next = new Set(prev);
      if (next.has(division)) next.delete(division);
      else next.add(division);
      return next;
    });
  };

  const toggleAll = () => {
    if (openDivisions.size === filteredDivisions.length) {
      setOpenDivisions(new Set());
    } else {
      setOpenDivisions(new Set(filteredDivisions.map(d => d.division)));
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || results.length === 0) {
    return (
      <div className="py-16 text-center">
        <Trophy size={32} className="text-text-muted mx-auto mb-4" />
        <p className="text-text-muted text-sm">{t('results.noResults')}</p>
      </div>
    );
  }

  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <ScrollReveal>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 border border-gold-500/30 rounded-full bg-gold-500/5 mb-6">
              <Medal size={14} className="text-gold-500" />
              <span className="text-sm text-gold-400 font-heading uppercase tracking-wider">
                {t('results.badge')}
              </span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-heading font-black uppercase mb-4">
              {t('results.title')}
            </h2>
            <p className="text-text-secondary text-lg max-w-xl mx-auto">
              {t('results.subtitle')}
            </p>
          </div>
        </ScrollReveal>

        {/* Summary Stats */}
        {summary && <SummaryStats summary={summary} />}

        {/* Belt Breakdown + Top Academies */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            {summary.belt_breakdown && Object.keys(summary.belt_breakdown).length > 0 && (
              <BeltBreakdown breakdown={summary.belt_breakdown} />
            )}
            {summary.top_academies && summary.top_academies.length > 0 && (
              <TopAcademies academies={summary.top_academies} />
            )}
          </div>
        )}

        {/* Filter Bar */}
        <div className="mt-12 mb-6">
          <ScrollReveal>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('results.searchPlaceholder')}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface border border-white/10 text-text-primary text-sm font-body placeholder:text-text-muted focus:outline-none focus:border-gold-500/40 transition-colors"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <select
                  value={beltFilter}
                  onChange={(e) => setBeltFilter(e.target.value)}
                  className="px-3 py-2.5 bg-surface border border-white/10 text-text-primary text-sm font-heading uppercase tracking-wider focus:outline-none focus:border-gold-500/40 appearance-none cursor-pointer"
                >
                  <option value="">{t('results.allBelts')}</option>
                  {filterOptions.belts.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <select
                  value={weightFilter}
                  onChange={(e) => setWeightFilter(e.target.value)}
                  className="px-3 py-2.5 bg-surface border border-white/10 text-text-primary text-sm font-heading uppercase tracking-wider focus:outline-none focus:border-gold-500/40 appearance-none cursor-pointer"
                >
                  <option value="">{t('results.allWeights')}</option>
                  {filterOptions.weights.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className="px-3 py-2.5 bg-surface border border-white/10 text-text-primary text-sm font-heading uppercase tracking-wider focus:outline-none focus:border-gold-500/40 appearance-none cursor-pointer"
                >
                  <option value="">{t('results.allGenders')}</option>
                  {filterOptions.genders.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* Expand/Collapse toggle */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Filter size={14} />
            <span>{filteredDivisions.length} {t('results.divisions').toLowerCase()}</span>
          </div>
          <button
            onClick={toggleAll}
            className="text-sm text-gold-500 hover:text-gold-400 font-heading uppercase tracking-wider transition-colors"
          >
            {openDivisions.size === filteredDivisions.length ? t('results.collapseAll') : t('results.expandAll')}
          </button>
        </div>

        {/* Division Groups */}
        {filteredDivisions.length === 0 ? (
          <div className="py-12 text-center text-text-muted text-sm">
            {t('results.noMatchingResults')}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDivisions.map((division, i) => (
              <DivisionGroup
                key={division.division}
                division={division}
                isOpen={openDivisions.has(division.division)}
                onToggle={() => toggleDivision(division.division)}
                index={i}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
