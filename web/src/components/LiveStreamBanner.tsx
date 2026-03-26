import { useState } from 'react';
import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEvents } from '../hooks/useApi';

export default function LiveStreamBanner() {
  const { events } = useEvents();
  const [dismissed, setDismissed] = useState(false);

  const liveEvent = events.find(e => e.live_stream_active);

  if (!liveEvent || dismissed) return null;

  return (
    <div className="bg-navy-800/95 backdrop-blur-sm border-b border-red-500/20 shadow-lg shadow-black/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-4">
        <Link
          to="/watch"
          className="flex items-center gap-3 min-w-0 flex-1 group"
        >
          <span className="flex items-center gap-2 shrink-0">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <span className="text-[10px] font-heading font-bold uppercase tracking-widest text-red-400">
              Live
            </span>
          </span>
          <span className="text-sm text-text-secondary truncate group-hover:text-gold-400 transition-colors">
            {liveEvent.name}
          </span>
          <span className="hidden sm:inline text-[10px] uppercase tracking-wider text-gold-500/60 font-heading shrink-0">
            Watch Now &rarr;
          </span>
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 p-1 text-text-muted hover:text-text-primary rounded transition-colors"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
