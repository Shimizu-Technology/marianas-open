import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Building2, CalendarDays, ArrowRight, X, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import type { Competitor, Academy, Event } from '../services/api';

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

interface SearchResults {
  competitors: Competitor[];
  academies: Academy[];
  events: Event[];
}

const DEBOUNCE_MS = 300;
const MAX_PER_CATEGORY = 5;

export default function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({ competitors: [], academies: [], events: [] });
  const [loading, setLoading] = useState(false);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const eventsFetched = useRef(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (open && !eventsFetched.current) {
      eventsFetched.current = true;
      api.getEvents().then(setAllEvents).catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults({ competitors: [], academies: [], events: [] });
      setActiveIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ competitors: [], academies: [], events: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const [compRes, acadRes] = await Promise.all([
          api.getCompetitors({ search: query.trim(), per_page: String(MAX_PER_CATEGORY) }),
          api.getAcademies({ search: query.trim(), per_page: String(MAX_PER_CATEGORY) }),
        ]);

        const lowerQ = query.trim().toLowerCase();
        const filteredEvents = allEvents
          .filter(e => e.name.toLowerCase().includes(lowerQ) || e.city?.toLowerCase().includes(lowerQ) || e.country?.toLowerCase().includes(lowerQ))
          .slice(0, MAX_PER_CATEGORY);

        setResults({
          competitors: compRes.competitors.slice(0, MAX_PER_CATEGORY),
          academies: acadRes.academies.slice(0, MAX_PER_CATEGORY),
          events: filteredEvents,
        });
      } catch {
        setResults({ competitors: [], academies: [], events: [] });
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, allEvents]);

  const flatItems = useCallback(() => {
    const items: { type: 'competitor' | 'academy' | 'event'; item: Competitor | Academy | Event }[] = [];
    results.competitors.forEach(c => items.push({ type: 'competitor', item: c }));
    results.academies.forEach(a => items.push({ type: 'academy', item: a }));
    results.events.forEach(e => items.push({ type: 'event', item: e }));
    return items;
  }, [results]);

  const navigateToResult = useCallback((type: string, item: Competitor | Academy | Event) => {
    onClose();
    if (type === 'competitor') {
      navigate(`/competitors/${(item as Competitor).id}`);
    } else if (type === 'academy') {
      navigate(`/teams/${(item as Academy).slug}`);
    } else if (type === 'event') {
      const ev = item as Event;
      if (ev.slug) {
        navigate(`/events/${ev.slug}`);
      } else {
        navigate(`/calendar`);
      }
    }
  }, [navigate, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = flatItems();
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < items.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : items.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0 && activeIndex < items.length) {
      e.preventDefault();
      const { type, item } = items[activeIndex];
      navigateToResult(type, item);
    }
  };

  useEffect(() => {
    setActiveIndex(-1);
  }, [results]);

  if (!open) return null;

  const hasResults = results.competitors.length > 0 || results.academies.length > 0 || results.events.length > 0;
  const hasQuery = query.trim().length > 0;

  let runningIndex = -1;

  const beltColor = (belt: string | null) => {
    if (!belt) return 'bg-gray-500';
    const b = belt.toLowerCase();
    if (b === 'black') return 'bg-gray-900 border border-white/20';
    if (b === 'brown') return 'bg-amber-800';
    if (b === 'purple') return 'bg-purple-600';
    if (b === 'blue') return 'bg-blue-600';
    if (b === 'white') return 'bg-white';
    return 'bg-gray-500';
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] sm:pt-[15vh] bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="w-full max-w-xl mx-4 bg-navy-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          {loading ? (
            <Loader2 className="w-5 h-5 text-gold-500 animate-spin shrink-0" />
          ) : (
            <Search className="w-5 h-5 text-text-muted shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search competitors, academies, events..."
            className="flex-1 bg-transparent text-text-primary placeholder:text-text-muted outline-none text-base"
          />
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto overscroll-contain">
          {hasQuery && !loading && !hasResults && (
            <div className="px-5 py-10 text-center text-text-muted text-sm">
              No results found for "{query}"
            </div>
          )}

          {!hasQuery && !loading && (
            <div className="px-5 py-10 text-center text-text-muted text-sm">
              Start typing to search...
            </div>
          )}

          {results.competitors.length > 0 && (
            <div className="py-2">
              <div className="px-5 py-2 flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                <Users className="w-3.5 h-3.5" />
                Competitors
              </div>
              {results.competitors.map((c) => {
                runningIndex++;
                const idx = runningIndex;
                return (
                  <button
                    key={`comp-${c.id}`}
                    onClick={() => navigateToResult('competitor', c)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors ${
                      activeIndex === idx ? 'bg-gold-500/10 text-gold-500' : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
                    }`}
                  >
                    {c.photo_url ? (
                      <img src={c.photo_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-text-muted shrink-0">
                        {c.first_name?.[0]}{c.last_name?.[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{c.full_name}</div>
                      <div className="text-xs text-text-muted truncate flex items-center gap-1.5">
                        {c.belt_rank && <span className={`inline-block w-2 h-2 rounded-full ${beltColor(c.belt_rank)}`} />}
                        {c.academy || 'Independent'}
                        {c.country_code && <span className="ml-1">{c.country_code}</span>}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 shrink-0 opacity-40" />
                  </button>
                );
              })}
            </div>
          )}

          {results.academies.length > 0 && (
            <div className="py-2">
              <div className="px-5 py-2 flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5" />
                Academies
              </div>
              {results.academies.map((a) => {
                runningIndex++;
                const idx = runningIndex;
                return (
                  <button
                    key={`acad-${a.id}`}
                    onClick={() => navigateToResult('academy', a)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors ${
                      activeIndex === idx ? 'bg-gold-500/10 text-gold-500' : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
                    }`}
                  >
                    {a.logo_url ? (
                      <img src={a.logo_url} alt="" className="w-8 h-8 rounded-lg object-contain bg-white/5 shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-text-muted" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{a.name}</div>
                      <div className="text-xs text-text-muted truncate">
                        {a.athletes} athlete{a.athletes !== 1 ? 's' : ''}
                        {a.country_code && <span className="ml-1">· {a.country_code}</span>}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 shrink-0 opacity-40" />
                  </button>
                );
              })}
            </div>
          )}

          {results.events.length > 0 && (
            <div className="py-2">
              <div className="px-5 py-2 flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                <CalendarDays className="w-3.5 h-3.5" />
                Events
              </div>
              {results.events.map((ev) => {
                runningIndex++;
                const idx = runningIndex;
                return (
                  <button
                    key={`event-${ev.id}`}
                    onClick={() => navigateToResult('event', ev)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors ${
                      activeIndex === idx ? 'bg-gold-500/10 text-gold-500' : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <CalendarDays className="w-4 h-4 text-text-muted" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{ev.name}</div>
                      <div className="text-xs text-text-muted truncate">
                        {ev.city}{ev.country ? `, ${ev.country}` : ''}
                        {ev.date && <span className="ml-1">· {new Date(ev.date).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 shrink-0 opacity-40" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between text-xs text-text-muted">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono">↵</kbd> select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono">esc</kbd> close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
