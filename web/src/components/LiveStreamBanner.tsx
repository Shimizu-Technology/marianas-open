import { useState } from 'react';
import { Radio, X, ExternalLink } from 'lucide-react';
import { useEvents } from '../hooks/useApi';

export default function LiveStreamBanner() {
  const { events } = useEvents();
  const [dismissed, setDismissed] = useState(false);

  const liveEvent = events.find(e => e.live_stream_active && e.live_stream_url);

  if (!liveEvent || dismissed) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-4">
        <a
          href={liveEvent.live_stream_url!}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 min-w-0 flex-1 group"
        >
          <span className="flex items-center gap-2 shrink-0">
            <Radio size={16} className="animate-pulse" />
            <span className="text-xs font-heading font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">
              LIVE
            </span>
          </span>
          <span className="text-sm font-medium truncate group-hover:underline">
            {liveEvent.name}
          </span>
          <ExternalLink size={14} className="shrink-0 opacity-60 group-hover:opacity-100" />
        </a>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 p-1 hover:bg-white/20 rounded transition-colors"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
