import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Search, Play, Radio, Clock, Filter, ChevronDown, Shield } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';
import { mockMatches, weightClasses, beltRanks } from '../data/events';

const beltColors: Record<string, string> = {
  White: 'bg-white text-gray-900',
  Blue: 'bg-blue-600 text-white',
  Purple: 'bg-purple-600 text-white',
  Brown: 'bg-amber-800 text-white',
  Black: 'bg-gray-900 text-white border border-white/20',
};

const countryFlags: Record<string, string> = {
  JP: '🇯🇵', KR: '🇰🇷', PH: '🇵🇭', TW: '🇹🇼', HK: '🇭🇰', GU: '🇬🇺',
};

export default function WatchPage() {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const [search, setSearch] = useState('');
  const [weightFilter, setWeightFilter] = useState('');
  const [beltFilter, setBeltFilter] = useState('');

  const filteredMatches = useMemo(() => {
    return mockMatches.filter((match) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        match.competitor1.name.toLowerCase().includes(searchLower) ||
        match.competitor2.name.toLowerCase().includes(searchLower) ||
        match.competitor1.academy.toLowerCase().includes(searchLower) ||
        match.competitor2.academy.toLowerCase().includes(searchLower);
      const matchesWeight = !weightFilter || match.weightClass === weightFilter;
      const matchesBelt = !beltFilter || match.belt === beltFilter;
      return matchesSearch && matchesWeight && matchesBelt;
    });
  }, [search, weightFilter, beltFilter]);

  return (
    <div className="min-h-screen pt-20">
      {/* Hero */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-navy-800 to-navy-900" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-heading font-black uppercase leading-[0.9] mb-6">
              {t('watch.title')}
            </h1>
            <p className="text-text-secondary text-lg max-w-xl mx-auto">
              {t('watch.subtitle')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Live Now Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <ScrollReveal>
            <div className="bg-surface border border-white/5 overflow-hidden">
              {/* Live header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
                <div className="relative">
                  <Radio size={16} className="text-red-live" />
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-live rounded-full animate-ping" />
                </div>
                <span className="font-heading font-bold text-sm uppercase tracking-wider text-red-live">
                  {t('watch.liveNow')}
                </span>
              </div>

              {/* Mock video player */}
              <div className="relative aspect-video bg-navy-900 flex items-center justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--color-navy-800)_0%,_var(--color-navy-900)_70%)]" />
                <div className="relative text-center space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-full border-2 border-white/10 flex items-center justify-center">
                    <Play size={32} className="text-white/30 ml-1" />
                  </div>
                  <div>
                    <p className="text-text-secondary text-sm">{t('watch.liveDesc')}</p>
                    <p className="text-text-muted text-xs mt-2">
                      {t('watch.upcomingStream')}: Copa de Marianas — Jan 31, 2026
                    </p>
                  </div>
                </div>

                {/* Mock overlay UI elements */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <div className="px-2 py-1 bg-red-live/90 text-white text-xs font-bold rounded-sm">
                    LIVE
                  </div>
                  <div className="px-2 py-1 bg-black/60 text-white text-xs rounded-sm flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-live" />
                    2,847 viewers
                  </div>
                </div>

                <div className="absolute bottom-4 left-4 right-4">
                  <div className="h-1 bg-white/10 rounded-full">
                    <div className="h-1 bg-gold-500 rounded-full w-[60%]" />
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Match Library */}
      <section className="py-12 sm:py-20 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <ScrollReveal>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
              <h2 className="text-2xl sm:text-3xl font-heading font-black uppercase">
                {t('watch.matchLibrary')}
              </h2>
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <Filter size={14} />
                {filteredMatches.length} matches
              </div>
            </div>
          </ScrollReveal>

          {/* Search + Filters */}
          <ScrollReveal delay={0.1}>
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              {/* Search */}
              <div className="relative flex-1">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('watch.searchPlaceholder')}
                  className="w-full pl-11 pr-4 py-3 bg-navy-900 border border-white/10 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-gold-500/50 transition-colors"
                />
              </div>

              {/* Weight filter */}
              <div className="relative">
                <select
                  value={weightFilter}
                  onChange={(e) => setWeightFilter(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-3 bg-navy-900 border border-white/10 text-text-primary text-sm focus:outline-none focus:border-gold-500/50 transition-colors cursor-pointer"
                >
                  <option value="">{t('watch.filterWeight')}: {t('watch.filterAll')}</option>
                  {weightClasses.map((wc) => (
                    <option key={wc} value={wc}>{wc}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>

              {/* Belt filter */}
              <div className="relative">
                <select
                  value={beltFilter}
                  onChange={(e) => setBeltFilter(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-3 bg-navy-900 border border-white/10 text-text-primary text-sm focus:outline-none focus:border-gold-500/50 transition-colors cursor-pointer"
                >
                  <option value="">{t('watch.filterBelt')}: {t('watch.filterAll')}</option>
                  {beltRanks.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>
            </div>
          </ScrollReveal>

          {/* Match Cards */}
          <div className="space-y-2">
            {filteredMatches.length === 0 && (
              <div className="text-center py-16 text-text-muted">
                {t('watch.noResults')}
              </div>
            )}
            {filteredMatches.map((match, i) => (
              <ScrollReveal key={match.id} delay={i * 0.05}>
                <div className="group bg-navy-900 border border-white/5 hover:border-gold-500/20 transition-all duration-300 p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Thumbnail placeholder */}
                    <div className="shrink-0 w-full sm:w-48 aspect-video bg-navy-800 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-navy-700/50 to-transparent" />
                      <Play size={24} className="text-white/20 relative z-10" />
                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 text-white text-xs font-mono">
                        {match.duration}
                      </div>
                    </div>

                    {/* Match info */}
                    <div className="flex-1 min-w-0">
                      {/* Competitors */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-heading font-bold text-text-primary">
                          {countryFlags[match.competitor1.country]} {match.competitor1.name}
                        </span>
                        <span className="text-text-muted text-sm">vs</span>
                        <span className="font-heading font-bold text-text-primary">
                          {countryFlags[match.competitor2.country]} {match.competitor2.name}
                        </span>
                      </div>

                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className={`px-2 py-0.5 text-xs font-bold uppercase ${beltColors[match.belt]}`}>
                          {match.belt}
                        </span>
                        <span className="px-2 py-0.5 bg-navy-800 text-text-secondary text-xs">
                          {match.weightClass}
                        </span>
                        <span className="text-xs text-text-muted">{match.event}</span>
                      </div>

                      {/* Academies */}
                      <div className="flex items-center gap-1 text-xs text-text-muted">
                        <Shield size={10} />
                        {match.competitor1.academy} vs {match.competitor2.academy}
                      </div>

                      {/* Result */}
                      {match.result && (
                        <div className="mt-2 text-sm text-gold-400 font-medium">
                          {match.result}
                        </div>
                      )}
                    </div>

                    {/* Watch button */}
                    <div className="shrink-0 flex items-center">
                      <button className="inline-flex items-center gap-2 px-4 py-2 bg-navy-700 text-text-primary text-sm font-heading font-bold uppercase tracking-wider hover:bg-navy-600 transition-colors">
                        <Play size={14} />
                        {t('watch.viewMatch')}
                      </button>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Coming Soon CTA */}
      <section className="py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <ScrollReveal>
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 border border-gold-500/30 rounded-full bg-gold-500/5">
                <Clock size={14} className="text-gold-500" />
                <span className="text-sm text-gold-400 font-heading uppercase tracking-wider">
                  {t('watch.comingSoon')}
                </span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-heading font-black uppercase">
                Every Match.
                <br />
                <span className="bg-gradient-to-r from-gold-500 to-gold-300 bg-clip-text text-transparent">
                  Every Event.
                </span>
              </h2>
              <p className="text-text-secondary text-lg">
                {t('watch.comingSoonDesc')}
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
