import { useState, useEffect, useCallback, useRef } from 'react';
import { Save, ChevronDown, ChevronRight, X, Loader2, Languages, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';
import type { SiteContentEntry, SiteContentGrouped } from '../../services/api';
import { invalidateSiteContentCache } from '../../hooks/useSiteContent';

const LANGUAGES = [
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'tl', label: 'Filipino' },
  { code: 'zh', label: '中文' },
  { code: 'pt', label: 'Português' },
] as const;

const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero Section',
  stats: 'Statistics',
  featured: 'Featured Section',
  about: 'About Page',
  general: 'General',
};

function TranslationBadge({ status }: { status: string }) {
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400">
        <Loader2 className="w-2.5 h-2.5 animate-spin" />
        Translating
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-red-500/10 text-red-400">
        Failed
      </span>
    );
  }
  return null;
}

function SectionGroup({
  section,
  entries,
  onSave,
  onRetranslate,
}: {
  section: string;
  entries: SiteContentEntry[];
  onSave: (entry: SiteContentEntry) => Promise<void>;
  onRetranslate: (id: number) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<SiteContentEntry>>({});
  const [saving, setSaving] = useState(false);
  const [showTranslations, setShowTranslations] = useState(false);

  const startEdit = (entry: SiteContentEntry) => {
    setEditingId(entry.id);
    setEditData({ ...entry });
    setShowTranslations(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
    setShowTranslations(false);
  };

  const handleSave = async () => {
    if (!editData.id) return;
    setSaving(true);
    try {
      await onSave(editData as SiteContentEntry);
      setEditingId(null);
      setEditData({});
      setShowTranslations(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-white/5 bg-surface">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/3 transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <h3 className="font-heading font-semibold text-text-primary uppercase tracking-wider text-sm">
            {SECTION_LABELS[section] || section}
          </h3>
          <span className="text-xs text-text-muted">({entries.length} entries)</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/5 divide-y divide-white/5">
          {entries.map((entry) => (
            <div key={entry.id} className="p-4">
              {editingId === entry.id ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-text-primary">{entry.label}</div>
                      <div className="text-xs text-text-muted font-mono">{entry.key}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gold-500 text-navy-900 text-xs font-bold uppercase tracking-wider hover:bg-gold-400 transition-colors disabled:opacity-50"
                      >
                        <Save size={12} />
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-white/10 text-text-secondary text-xs uppercase tracking-wider hover:bg-white/5 transition-colors"
                      >
                        <X size={12} />
                        Cancel
                      </button>
                    </div>
                  </div>

                  {/* English (primary) */}
                  <div>
                    <label className="block text-xs text-text-muted mb-1 uppercase tracking-wider">
                      English (primary)
                    </label>
                    {((editData.value_en as string) || '').length > 100 ? (
                      <textarea
                        value={(editData.value_en as string) || ''}
                        onChange={(e) => setEditData({ ...editData, value_en: e.target.value })}
                        rows={3}
                        className="w-full bg-navy-900 border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold-500/50 focus:outline-none transition-colors"
                      />
                    ) : (
                      <input
                        type="text"
                        value={(editData.value_en as string) || ''}
                        onChange={(e) => setEditData({ ...editData, value_en: e.target.value })}
                        className="w-full bg-navy-900 border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold-500/50 focus:outline-none transition-colors"
                      />
                    )}
                    <p className="text-[11px] text-text-muted mt-1">
                      Other languages are auto-translated when you save.
                    </p>
                  </div>

                  {/* Expandable translation overrides */}
                  <div className="border border-white/5 rounded">
                    <button
                      type="button"
                      onClick={() => setShowTranslations(!showTranslations)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-muted hover:text-text-secondary transition-colors"
                    >
                      <Languages size={12} />
                      {showTranslations ? 'Hide' : 'Show'} translation overrides
                      {showTranslations ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>
                    {showTranslations && (
                      <div className="px-3 pb-3 space-y-3 border-t border-white/5">
                        <p className="text-[11px] text-text-muted pt-2">
                          Edit these only if you want to override the auto-translation.
                        </p>
                        {LANGUAGES.map((lang) => {
                          const field = `value_${lang.code}` as keyof SiteContentEntry;
                          return (
                            <div key={lang.code}>
                              <label className="block text-xs text-text-muted mb-1 uppercase tracking-wider">
                                {lang.label}
                              </label>
                              <input
                                type="text"
                                value={(editData[field] as string) || ''}
                                onChange={(e) => setEditData({ ...editData, [field]: e.target.value })}
                                className="w-full bg-navy-900 border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold-500/50 focus:outline-none transition-colors"
                                placeholder="Auto-translated from English"
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className="flex items-start justify-between gap-4 cursor-pointer hover:bg-white/3 -m-4 p-4 transition-colors"
                  onClick={() => startEdit(entry)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm font-medium text-text-primary">{entry.label}</span>
                      <span className="text-xs text-text-muted font-mono">{entry.key}</span>
                      <TranslationBadge status={entry.translation_status} />
                    </div>
                    <p className="text-sm text-text-secondary truncate">
                      {entry.value_en || '(empty)'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {(entry.translation_status === 'failed') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onRetranslate(entry.id); }}
                        className="p-1.5 text-amber-400 hover:text-amber-300 transition-colors"
                        title="Retry translation"
                      >
                        <RefreshCw size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ContentAdmin() {
  const [grouped, setGrouped] = useState<SiteContentGrouped>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const successTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => { clearTimeout(successTimerRef.current); };
  }, []);

  const fetchContents = useCallback(async () => {
    try {
      const data = await api.admin.getSiteContents();
      setGrouped(data.site_contents);
      return data.site_contents;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load site contents');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchContents(); }, [fetchContents]);

  const pollingRef = useRef(0);

  useEffect(() => {
    return () => { pollingRef.current++; };
  }, []);

  const pollForPendingTranslations = useCallback(async () => {
    const generation = ++pollingRef.current;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 3000));
      if (generation !== pollingRef.current) return;
      try {
        const data = await api.admin.getSiteContents();
        if (generation !== pollingRef.current) return;
        const allEntries = Object.values(data.site_contents).flat();
        const hasPending = allEntries.some((e: SiteContentEntry) => e.translation_status === 'pending');
        setGrouped(data.site_contents);
        if (!hasPending) return;
      } catch {
        return;
      }
    }
  }, []);

  const fetchAndPoll = useCallback(async () => {
    const contents = await fetchContents();
    if (contents) {
      const allEntries = Object.values(contents).flat();
      if (allEntries.some((e: SiteContentEntry) => e.translation_status === 'pending')) {
        pollForPendingTranslations();
      }
    }
  }, [fetchContents, pollForPendingTranslations]);

  const handleSave = async (entry: SiteContentEntry) => {
    try {
      await api.admin.updateSiteContent(entry.id, entry);
      clearTimeout(successTimerRef.current);
      setSuccess('Content saved — translations will update automatically');
      successTimerRef.current = setTimeout(() => setSuccess(''), 4000);
      invalidateSiteContentCache();
      await fetchAndPoll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save content');
    }
  };

  const handleRetranslate = async (id: number) => {
    try {
      await api.admin.retranslateSiteContent(id);
      clearTimeout(successTimerRef.current);
      setSuccess('Re-translation queued');
      successTimerRef.current = setTimeout(() => setSuccess(''), 3000);
      await fetchAndPoll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to retranslate');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-gold animate-spin" />
      </div>
    );
  }

  const sectionOrder = ['hero', 'stats', 'featured', 'about', 'general'];
  const sortedSections = Object.keys(grouped).sort(
    (a, b) => (sectionOrder.indexOf(a) === -1 ? 99 : sectionOrder.indexOf(a)) - (sectionOrder.indexOf(b) === -1 ? 99 : sectionOrder.indexOf(b))
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-heading font-black uppercase tracking-tight">Site Content</h1>
        <p className="text-text-secondary text-sm mt-1">
          Manage homepage text, stats, and page content. Translations are automatic — just edit in English.
        </p>
      </div>

      <AnimatePresence>
        {success && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 text-sm"
          >{success}</motion.div>
        )}
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
          >{error}</motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {sortedSections.map((section) => (
          <SectionGroup
            key={section}
            section={section}
            entries={grouped[section]}
            onSave={handleSave}
            onRetranslate={handleRetranslate}
          />
        ))}
      </div>
    </div>
  );
}
