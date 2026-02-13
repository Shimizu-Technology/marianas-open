import { useState, useEffect, useCallback } from 'react';
import { Save, Plus, Trash2, ChevronDown, ChevronRight, X } from 'lucide-react';
import { api } from '../../services/api';
import type { SiteContentEntry, SiteContentGrouped } from '../../services/api';
import { invalidateSiteContentCache } from '../../hooks/useSiteContent';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'tl', label: 'Filipino' },
  { code: 'zh', label: '中文' },
] as const;

const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero Section',
  stats: 'Statistics',
  featured: 'Featured Section',
  about: 'About Page',
  general: 'General',
};

function SectionGroup({
  section,
  entries,
  onSave,
  onDelete,
}: {
  section: string;
  entries: SiteContentEntry[];
  onSave: (entry: SiteContentEntry) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<SiteContentEntry>>({});
  const [saving, setSaving] = useState(false);

  const startEdit = (entry: SiteContentEntry) => {
    setEditingId(entry.id);
    setEditData({ ...entry });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleSave = async () => {
    if (!editData.id) return;
    setSaving(true);
    try {
      await onSave(editData as SiteContentEntry);
      setEditingId(null);
      setEditData({});
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
                  <div className="grid grid-cols-1 gap-3">
                    {LANGUAGES.map((lang) => {
                      const field = `value_${lang.code}` as keyof SiteContentEntry;
                      return (
                        <div key={lang.code}>
                          <label className="block text-xs text-text-muted mb-1 uppercase tracking-wider">
                            {lang.label}
                          </label>
                          {(editData[field] as string || '').length > 100 ? (
                            <textarea
                              value={(editData[field] as string) || ''}
                              onChange={(e) => setEditData({ ...editData, [field]: e.target.value })}
                              rows={3}
                              className="w-full bg-navy-900 border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold-500/50 focus:outline-none transition-colors"
                            />
                          ) : (
                            <input
                              type="text"
                              value={(editData[field] as string) || ''}
                              onChange={(e) => setEditData({ ...editData, [field]: e.target.value })}
                              className="w-full bg-navy-900 border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold-500/50 focus:outline-none transition-colors"
                            />
                          )}
                        </div>
                      );
                    })}
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
                    </div>
                    <p className="text-sm text-text-secondary truncate">
                      {entry.value_en || '(empty)'}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                    className="shrink-0 p-1.5 text-text-muted hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
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
    value_ja: '',
    value_ko: '',
    value_tl: '',
    value_zh: '',
  });

  const handleCreate = async () => {
    if (!form.key || !form.label) return;
    setSaving(true);
    try {
      await api.admin.createSiteContent(form);
      invalidateSiteContentCache();
      setForm({ key: '', label: '', section: 'general', content_type: 'text', value_en: '', value_ja: '', value_ko: '', value_tl: '', value_zh: '' });
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
            <option value="rich_text">Rich Text</option>
            <option value="json">JSON</option>
          </select>
        </div>
      </div>
      {LANGUAGES.map((lang) => (
        <div key={lang.code}>
          <label className="block text-xs text-text-muted mb-1 uppercase tracking-wider">{lang.label}</label>
          <input
            type="text"
            value={form[`value_${lang.code}` as keyof typeof form]}
            onChange={(e) => setForm({ ...form, [`value_${lang.code}`]: e.target.value })}
            className="w-full bg-navy-900 border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold-500/50 focus:outline-none"
          />
        </div>
      ))}
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

  const fetchContents = useCallback(async () => {
    try {
      const data = await api.admin.getSiteContents();
      setGrouped(data.site_contents);
    } catch (e) {
      console.error('Failed to load site contents', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchContents(); }, [fetchContents]);

  const handleSave = async (entry: SiteContentEntry) => {
    await api.admin.updateSiteContent(entry.id, entry);
    invalidateSiteContentCache();
    await fetchContents();
  };

  const handleDelete = async (id: number) => {
    await api.admin.deleteSiteContent(id);
    invalidateSiteContentCache();
    await fetchContents();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-muted">Loading content...</div>
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
            Manage homepage text, stats, and about page content across all languages.
          </p>
        </div>
        <NewContentForm onCreated={fetchContents} />
      </div>

      <div className="space-y-4">
        {sortedSections.map((section) => (
          <SectionGroup
            key={section}
            section={section}
            entries={grouped[section]}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
