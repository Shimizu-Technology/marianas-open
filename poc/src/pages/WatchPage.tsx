import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Search, Play, Radio, Clock, Filter, ChevronDown, Shield,
  Camera, UserSearch, Sparkles, Bell, Volume2, Maximize2, Settings,
} from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';
import SocialShare from '../components/SocialShare';
import QRShare from '../components/QRShare';
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
  const [eventFilter, setEventFilter] = useState('');
  const [activeMat, setActiveMat] = useState(1);
  const [viewerCount, setViewerCount] = useState(2847);

  // Animate viewer count
  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCount((prev) => prev + Math.floor(Math.random() * 7) - 2);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const eventNames = useMemo(() => {
    const names = new Set(mockMatches.map((m) => m.event));
    return Array.from(names);
  }, []);

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
      const matchesEvent = !eventFilter || match.event === eventFilter;
      return matchesSearch && matchesWeight && matchesBelt && matchesEvent;
    });
  }, [search, weightFilter, beltFilter, eventFilter]);

  const matInfo = [
    { mat: 1, division: t('watch.matDivision1'), match: 'Takeshi Yamamoto vs Carlos Santos' },
    { mat: 2, division: t('watch.matDivision2'), match: 'Kim Seung-ho vs Ryo Tanaka' },
    { mat: 3, division: t('watch.matDivision3'), match: 'Rafael Mendoza vs Yuki Nakamura' },
    { mat: 4, division: t('watch.matDivision4'), match: 'Park Min-jun vs Miguel Torres' },
    { mat: 5, division: t('watch.matDivision5'), match: 'Lin Wei-chen vs Kenji Morita' },
    { mat: 6, division: t('watch.matDivision6'), match: 'Chris Aguon vs Zhang Wei' },
  ];

  const currentMat = matInfo[activeMat - 1];

  const futureFeatures = [
    { icon: Camera, titleKey: 'watch.featureReplay', descKey: 'watch.featureReplayDesc' },
    { icon: UserSearch, titleKey: 'watch.featureSearch', descKey: 'watch.featureSearchDesc' },
    { icon: Sparkles, titleKey: 'watch.featureAI', descKey: 'watch.featureAIDesc' },
    { icon: Bell, titleKey: 'watch.featureNotify', descKey: 'watch.featureNotifyDesc' },
  ];

  return (
    <div className="min-h-screen pt-20">
      {/* Hero */}
      <section className="relative py-16 sm:py-24 overflow-hidden">
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
            <p className="text-text-secondary text-lg max-w-xl mx-auto mb-6">
              {t('watch.subtitle')}
            </p>
            <div className="flex items-center justify-center gap-3">
              <SocialShare shareText={t('share.watchText')} />
              <QRShare />
            </div>
          </motion.div>
        </div>
      </section>

      {/* LIVE NOW Section */}
      <section className="py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <ScrollReveal>
            <div className="bg-surface border border-white/5 overflow-hidden">
              {/* Live header bar */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/5 bg-navy-800/50">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Radio size={16} className="text-red-live" />
                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-live rounded-full animate-ping" />
                  </div>
                  <span className="font-heading font-bold text-sm uppercase tracking-wider text-red-live">
                    {t('watch.liveNow')}
                  </span>
                  <span className="text-text-muted text-xs hidden sm:inline">
                    Marianas Open 2026 — UOG Calvo Fieldhouse
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-live animate-pulse" />
                  <span className="text-text-secondary text-xs font-mono">
                    {viewerCount.toLocaleString()} {t('watch.viewers')}
                  </span>
                </div>
              </div>

              {/* Mat selector tabs */}
              <div className="flex overflow-x-auto border-b border-white/5 bg-navy-900/50 scrollbar-hide">
                {matInfo.map((mat) => (
                  <button
                    key={mat.mat}
                    onClick={() => setActiveMat(mat.mat)}
                    className={`shrink-0 px-4 sm:px-6 py-3 text-xs font-heading font-bold uppercase tracking-wider transition-all border-b-2 ${
                      activeMat === mat.mat
                        ? 'border-gold-500 text-gold-500 bg-gold-500/5'
                        : 'border-transparent text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    {t('watch.mat')} {mat.mat}
                  </button>
                ))}
              </div>

              {/* Mock video player */}
              <div className="relative aspect-video bg-navy-900 overflow-hidden">
                {/* Fake video gradient background */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--color-navy-700)_0%,_var(--color-navy-900)_70%)]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

                {/* Fake mat lines */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-[60%] h-[60%] border border-white/5 rounded-sm" />
                  <div className="absolute w-[30%] h-[30%] border border-white/3 rounded-full" />
                </div>

                {/* Center play icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors"
                  >
                    <Play size={32} className="text-white ml-1" />
                  </motion.div>
                </div>

                {/* Top-left: LIVE badge + viewers */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <div className="px-2.5 py-1 bg-red-600 text-white text-xs font-bold rounded-sm flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    LIVE
                  </div>
                  <div className="px-2.5 py-1 bg-black/60 backdrop-blur-sm text-white text-xs rounded-sm">
                    {viewerCount.toLocaleString()} {t('watch.viewers')}
                  </div>
                </div>

                {/* Top-right: quality settings */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <div className="px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-xs rounded-sm">
                    1080p
                  </div>
                </div>

                {/* Bottom overlay: match info */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 sm:p-6">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-gold-500 text-xs font-heading uppercase tracking-wider mb-1">
                        {currentMat.division}
                      </div>
                      <div className="text-white font-heading font-bold text-sm sm:text-lg">
                        {currentMat.match}
                      </div>
                      <div className="text-text-muted text-xs mt-1">
                        {t('watch.mat')} {activeMat} — {t('watch.liveFromGuam')}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-white/60">
                      <Volume2 size={18} className="cursor-pointer hover:text-white transition-colors" />
                      <Settings size={18} className="cursor-pointer hover:text-white transition-colors" />
                      <Maximize2 size={18} className="cursor-pointer hover:text-white transition-colors" />
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-red-600 rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
                    />
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
                {filteredMatches.length} {t('watch.matchCount')}
              </div>
            </div>
          </ScrollReveal>

          {/* Search + Filters */}
          <ScrollReveal delay={0.1}>
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
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

              <div className="relative">
                <select
                  value={eventFilter}
                  onChange={(e) => setEventFilter(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-3 bg-navy-900 border border-white/10 text-text-primary text-sm focus:outline-none focus:border-gold-500/50 transition-colors cursor-pointer"
                >
                  <option value="">{t('watch.filterEvent')}: {t('watch.filterAll')}</option>
                  {eventNames.map((e) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>
            </div>
          </ScrollReveal>

          {/* Match Grid */}
          {filteredMatches.length === 0 && (
            <div className="text-center py-16 text-text-muted">
              {t('watch.noResults')}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMatches.map((match, i) => (
              <ScrollReveal key={match.id} delay={i * 0.05}>
                <div className="group bg-navy-900 border border-white/5 hover:border-gold-500/20 transition-all duration-300 overflow-hidden">
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-navy-800 overflow-hidden cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-br from-navy-700/50 to-navy-900/80" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-gold-500/20 group-hover:scale-110 transition-all">
                        <Play size={20} className="text-white/60 group-hover:text-gold-500 ml-0.5 transition-colors" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-white text-xs font-mono">
                      {match.duration}
                    </div>
                    <div className="absolute top-2 left-2">
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${beltColors[match.belt]}`}>
                        {match.belt}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-heading font-bold text-text-primary truncate">
                        {countryFlags[match.competitor1.country]} {match.competitor1.name}
                      </span>
                      <span className="text-text-muted text-xs shrink-0">vs</span>
                      <span className="font-heading font-bold text-text-primary truncate">
                        {countryFlags[match.competitor2.country]} {match.competitor2.name}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 bg-navy-800 text-text-secondary text-xs">
                        {match.weightClass}
                      </span>
                      <span className="text-xs text-text-muted">{match.event}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-text-muted">
                        <Shield size={10} />
                        <span className="truncate">{match.competitor1.academy}</span>
                      </div>
                      {match.result && (
                        <span className="text-xs text-gold-400 font-medium shrink-0">
                          {match.result}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Coming Soon — Future Features */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <ScrollReveal>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 border border-gold-500/30 rounded-full bg-gold-500/5 mb-6">
                <Clock size={14} className="text-gold-500" />
                <span className="text-sm text-gold-400 font-heading uppercase tracking-wider">
                  {t('watch.comingSoon')}
                </span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-heading font-black uppercase mb-4">
                {t('watch.visionTitle')}
              </h2>
              <p className="text-text-secondary text-lg max-w-2xl mx-auto">
                {t('watch.comingSoonDesc')}
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {futureFeatures.map((feature, i) => (
              <ScrollReveal key={feature.titleKey} delay={i * 0.1}>
                <div className="relative group bg-navy-900/50 border border-gold-500/10 hover:border-gold-500/30 p-6 transition-all duration-300 h-full">
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-gold-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative space-y-4">
                    <div className="w-12 h-12 rounded-lg bg-gold-500/10 flex items-center justify-center">
                      <feature.icon size={24} className="text-gold-500" />
                    </div>
                    <h3 className="font-heading font-bold text-lg uppercase">
                      {t(feature.titleKey)}
                    </h3>
                    <p className="text-text-muted text-sm leading-relaxed">
                      {t(feature.descKey)}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
