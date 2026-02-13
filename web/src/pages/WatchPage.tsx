import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Search, Play, Clock, Filter, ChevronDown, X,
  Camera, UserSearch, Sparkles, Bell,
} from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';
import SocialShare from '../components/SocialShare';
import QRShare from '../components/QRShare';
import LoadingSpinner from '../components/LoadingSpinner';
import { api } from '../services/api';
import type { Video } from '../services/api';

const beltColors: Record<string, string> = {
  white: 'bg-white text-gray-900',
  blue: 'bg-blue-600 text-white',
  purple: 'bg-purple-600 text-white',
  brown: 'bg-amber-800 text-white',
  black: 'bg-gray-900 text-white border border-white/20',
};

const WEIGHT_CLASSES = [
  'Rooster', 'Light Feather', 'Feather', 'Light', 'Middle',
  'Medium Heavy', 'Heavy', 'Super Heavy', 'Ultra Heavy', 'Open Class',
];

const BELT_RANKS = ['white', 'blue', 'purple', 'brown', 'black'];

export default function WatchPage() {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [weightFilter, setWeightFilter] = useState('');
  const [beltFilter, setBeltFilter] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [expandedVideo, setExpandedVideo] = useState<number | null>(null);

  useEffect(() => {
    api.getVideos()
      .then(v => setVideos(v))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const featuredVideos = useMemo(() => videos.filter(v => v.featured), [videos]);

  const eventNames = useMemo(() => {
    const names = new Set(videos.map(v => v.event_name).filter(Boolean));
    return Array.from(names) as string[];
  }, [videos]);

  const filteredVideos = useMemo(() => {
    return videos.filter(v => {
      const s = search.toLowerCase();
      const matchesSearch = !search ||
        v.title.toLowerCase().includes(s) ||
        (v.competitor_1_name || '').toLowerCase().includes(s) ||
        (v.competitor_2_name || '').toLowerCase().includes(s);
      const matchesWeight = !weightFilter || v.weight_class === weightFilter;
      const matchesBelt = !beltFilter || v.belt_rank === beltFilter;
      const matchesEvent = !eventFilter || v.event_name === eventFilter;
      const matchesCat = !categoryFilter || v.category === categoryFilter;
      return matchesSearch && matchesWeight && matchesBelt && matchesEvent && matchesCat;
    });
  }, [videos, search, weightFilter, beltFilter, eventFilter, categoryFilter]);

  const futureFeatures = [
    { icon: Camera, titleKey: 'watch.featureReplay', descKey: 'watch.featureReplayDesc' },
    { icon: UserSearch, titleKey: 'watch.featureSearch', descKey: 'watch.featureSearchDesc' },
    { icon: Sparkles, titleKey: 'watch.featureAI', descKey: 'watch.featureAIDesc' },
    { icon: Bell, titleKey: 'watch.featureNotify', descKey: 'watch.featureNotifyDesc' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen pt-20">
        <LoadingSpinner />
      </div>
    );
  }

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

      {/* Featured Videos */}
      {featuredVideos.length > 0 && (
        <section className="py-8 sm:py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <ScrollReveal>
              <h2 className="text-2xl sm:text-3xl font-heading font-black uppercase mb-6">
                {t('watch.featured', 'Featured')}
              </h2>
            </ScrollReveal>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredVideos.map((video, i) => (
                <ScrollReveal key={video.id} delay={i * 0.08}>
                  <VideoCard
                    video={video}
                    expanded={expandedVideo === video.id}
                    onToggle={() => setExpandedVideo(expandedVideo === video.id ? null : video.id)}
                  />
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

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
                {filteredVideos.length} {t('watch.matchCount')}
              </div>
            </div>
          </ScrollReveal>

          {/* Filters */}
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
              <FilterSelect value={weightFilter} onChange={setWeightFilter} label={t('watch.filterWeight')} allLabel={t('watch.filterAll')} options={WEIGHT_CLASSES} />
              <FilterSelect value={beltFilter} onChange={setBeltFilter} label={t('watch.filterBelt')} allLabel={t('watch.filterAll')} options={BELT_RANKS} displayFn={v => v.charAt(0).toUpperCase() + v.slice(1)} />
              <FilterSelect value={eventFilter} onChange={setEventFilter} label={t('watch.filterEvent')} allLabel={t('watch.filterAll')} options={eventNames} />
              <FilterSelect value={categoryFilter} onChange={setCategoryFilter} label={t('watch.filterCategory', 'Category')} allLabel={t('watch.filterAll')} options={['gi', 'no-gi']} displayFn={v => v === 'gi' ? 'Gi' : 'No-Gi'} />
            </div>
          </ScrollReveal>

          {/* Video Grid */}
          {videos.length === 0 ? (
            <div className="text-center py-16">
              <Play size={48} className="mx-auto text-text-muted mb-4 opacity-30" />
              <p className="text-text-muted text-lg">{t('watch.noVideosYet', 'No videos yet')}</p>
              <p className="text-text-muted text-sm mt-2">{t('watch.noVideosYetDesc', 'Check back soon for match videos and highlights.')}</p>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="text-center py-16 text-text-muted">
              {t('watch.noResults')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVideos.map((video, i) => (
                <ScrollReveal key={video.id} delay={i * 0.05}>
                  <VideoCard
                    video={video}
                    expanded={expandedVideo === video.id}
                    onToggle={() => setExpandedVideo(expandedVideo === video.id ? null : video.id)}
                  />
                </ScrollReveal>
              ))}
            </div>
          )}
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

function FilterSelect({ value, onChange, label, allLabel, options, displayFn }: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  allLabel: string;
  options: string[];
  displayFn?: (v: string) => string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none pl-4 pr-10 py-3 bg-navy-900 border border-white/10 text-text-primary text-sm focus:outline-none focus:border-gold-500/50 transition-colors cursor-pointer"
      >
        <option value="">{label}: {allLabel}</option>
        {options.map(o => (
          <option key={o} value={o}>{displayFn ? displayFn(o) : o}</option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
    </div>
  );
}

function VideoCard({ video, expanded, onToggle }: { video: Video; expanded: boolean; onToggle: () => void }) {
  const thumbnail = video.youtube_video_id
    ? `https://img.youtube.com/vi/${video.youtube_video_id}/mqdefault.jpg`
    : null;

  return (
    <div className="group bg-navy-900 border border-white/5 hover:border-gold-500/20 transition-all duration-300 overflow-hidden">
      {/* Thumbnail / Embed */}
      <div className="relative aspect-video bg-navy-800 overflow-hidden cursor-pointer" onClick={onToggle}>
        {expanded && video.youtube_video_id ? (
          <iframe
            src={`https://www.youtube.com/embed/${video.youtube_video_id}?autoplay=1`}
            title={video.title}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : thumbnail ? (
          <>
            <img src={thumbnail} alt={video.title} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-gold-500/20 group-hover:scale-110 transition-all">
                <Play size={20} className="text-white/60 group-hover:text-gold-500 ml-0.5 transition-colors" />
              </div>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-navy-700/50 to-navy-900/80 flex items-center justify-center">
            <Play size={20} className="text-white/30" />
          </div>
        )}
        {expanded && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className="absolute top-2 right-2 z-10 p-1 bg-black/60 text-white hover:bg-black/80 transition-colors"
          >
            <X size={14} />
          </button>
        )}
        {video.belt_rank && !expanded && (
          <div className="absolute top-2 left-2">
            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${beltColors[video.belt_rank] || ''}`}>
              {video.belt_rank}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        {video.competitor_1_name && video.competitor_2_name ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-heading font-bold text-text-primary truncate">
              {video.competitor_1_name}
            </span>
            <span className="text-text-muted text-xs shrink-0">vs</span>
            <span className="font-heading font-bold text-text-primary truncate">
              {video.competitor_2_name}
            </span>
          </div>
        ) : (
          <div className="text-sm font-heading font-bold text-text-primary truncate">
            {video.title}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {video.weight_class && (
            <span className="px-2 py-0.5 bg-navy-800 text-text-secondary text-xs">
              {video.weight_class}
            </span>
          )}
          {video.event_name && (
            <span className="text-xs text-text-muted">{video.event_name}</span>
          )}
          {video.category && (
            <span className="text-xs text-text-muted uppercase">{video.category}</span>
          )}
        </div>

        {video.result && (
          <div className="text-xs text-gold-400 font-medium">
            {video.result}
          </div>
        )}
      </div>
    </div>
  );
}
