import { useState, useEffect, useCallback } from 'react';
import { Save, Plus, Trash2, ChevronDown, ChevronRight, X, Loader2, Languages, RefreshCw } from 'lucide-react';
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
  onDelete,
  onRetranslate,
}: {
  section: string;
  entries: SiteContentEntry[];
  onSave: (entry: SiteContentEntry) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
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

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this content entry? This cannot be undone.')) return;
    await onDelete(id);
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
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                      className="shrink-0 p-1.5 text-text-muted hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
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

function NewContentForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    key: '',
    label: '',
    section: 'general',
    content_type: 'text',
    value_en: '',
  });

  const handleCreate = async () => {
    if (!form.key || !form.label) return;
    setSaving(true);
    try {
      await api.admin.createSiteContent(form);
      invalidateSiteContentCache();
      setForm({ key: '', label: '', section: 'general', content_type: 'text', value_en: '' });
      setOpen(false);
      onCreated();
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 border border-white/10 text-text-secondary text-sm hover:bg-white/5 transition-colors"
      >
        <Plus size={14} />
        Add Content Entry
      </button>
    );
  }

  return (
    <div className="border border-white/10 bg-surface p-6 space-y-4">
      <h3 className="font-heading font-semibold text-sm uppercase tracking-wider text-text-primary">
        New Content Entry
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-text-muted mb-1 uppercase tracking-wider">Key (unique)</label>
          <input
            type="text"
            value={form.key}
            onChange={(e) => setForm({ ...form, key: e.target.value })}
            placeholder="e.g. hero_tagline"
            className="w-full bg-navy-900 border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold-500/50 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1 uppercase tracking-wider">Label</label>
          <input
            type="text"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="e.g. Hero Tagline"
            className="w-full bg-navy-900 border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold-500/50 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1 uppercase tracking-wider">Section</label>
          <select
            value={form.section}
            onChange={(e) => setForm({ ...form, section: e.target.value })}
            className="w-full bg-navy-900 border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold-500/50 focus:outline-none"
          >
            {Object.entries(SECTION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1 uppercase tracking-wider">Type</label>
          <select
            value={form.content_type}
            onChange={(e) => setForm({ ...form, content_type: e.target.value })}
            className="w-full bg-navy-900 border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold-500/50 focus:outline-none"
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-text-muted mb-1 uppercase tracking-wider">English Value</label>
        <input
          type="text"
          value={form.value_en}
          onChange={(e) => setForm({ ...form, value_en: e.target.value })}
          placeholder="Enter the English text — other languages will be auto-translated"
          className="w-full bg-navy-900 border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold-500/50 focus:outline-none"
        />
        <p className="text-[11px] text-text-muted mt-1">
          Other languages will be auto-translated on save.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={handleCreate}
          disabled={saving || !form.key || !form.label}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gold-500 text-navy-900 text-sm font-bold uppercase tracking-wider hover:bg-gold-400 disabled:opacity-50 transition-colors"
        >
          <Plus size={14} />
          {saving ? 'Creating...' : 'Create'}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-4 py-2 border border-white/10 text-text-secondary text-sm hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function ContentAdmin() {
  const [grouped, setGrouped] = useState<SiteContentGrouped>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchContents = useCallback(async () => {
    try {
      const data = await api.admin.getSiteContents();
      setGrouped(data.site_contents);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load site contents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchContents(); }, [fetchContents]);

  const handleSave = async (entry: SiteContentEntry) => {
    await api.admin.updateSiteContent(entry.id, entry);
    setSuccess('Content saved — translations will update automatically');
    setTimeout(() => setSuccess(''), 4000);
    invalidateSiteContentCache();
    await fetchContents();
  };

  const handleDelete = async (id: number) => {
    await api.admin.deleteSiteContent(id);
    setSuccess('Content entry deleted');
    setTimeout(() => setSuccess(''), 3000);
    invalidateSiteContentCache();
    await fetchContents();
  };

  const handleRetranslate = async (id: number) => {
    try {
      await api.admin.retranslateSiteContent(id);
      setSuccess('Re-translation queued');
      setTimeout(() => setSuccess(''), 3000);
      await fetchContents();
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-black uppercase tracking-tight">Site Content</h1>
          <p className="text-text-secondary text-sm mt-1">
            Manage homepage text, stats, and page content. Translations are automatic — just edit in English.
          </p>
        </div>
        <NewContentForm onCreated={fetchContents} />
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
            onDelete={handleDelete}
            onRetranslate={handleRetranslate}
          />
        ))}
      </div>
    </div>
  );
}
