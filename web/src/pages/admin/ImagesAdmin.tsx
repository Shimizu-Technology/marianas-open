import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Eye, EyeOff, GripVertical, X, Save, Image as ImageIcon } from 'lucide-react';
import { api } from '../../services/api';
import type { SiteImage } from '../../services/api';
import ImageUpload from '../../components/ImageUpload';

const PLACEMENTS = [
  { value: 'hero', label: 'Hero Background', description: 'Main hero section background' },
  { value: 'gallery', label: 'Gallery', description: 'Bento grid and gallery sections' },
  { value: 'about', label: 'About', description: 'About page images' },
  { value: 'event_default', label: 'Event Default', description: 'Default event hero image' },
  { value: 'sponsor_default', label: 'Sponsor Default', description: 'Default sponsor logo' },
] as const;

interface EditingSiteImage {
  id?: number;
  title: string;
  alt_text: string;
  placement: string;
  sort_order: number;
  active: boolean;
  caption: string;
}

const emptyForm: EditingSiteImage = {
  title: '',
  alt_text: '',
  placement: 'gallery',
  sort_order: 0,
  active: true,
  caption: '',
};

export default function ImagesAdmin() {
  const [images, setImages] = useState<SiteImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EditingSiteImage>(emptyForm);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const fetchImages = useCallback(async () => {
    try {
      const res = await api.admin.getSiteImages();
      setImages(res.site_images || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing.id) {
        // Update metadata
        await api.admin.updateSiteImage(editing.id, {
          title: editing.title,
          alt_text: editing.alt_text,
          placement: editing.placement as SiteImage['placement'],
          sort_order: editing.sort_order,
          active: editing.active,
          caption: editing.caption,
        });
        // Upload new image if changed
        if (pendingFile) {
          await api.admin.uploadSiteImage(editing.id, pendingFile);
        }
      } else {
        // Create new
        const formData = new FormData();
        formData.append('title', editing.title);
        formData.append('alt_text', editing.alt_text);
        formData.append('placement', editing.placement);
        formData.append('sort_order', String(editing.sort_order));
        formData.append('active', String(editing.active));
        formData.append('caption', editing.caption);
        if (pendingFile) {
          formData.append('image', pendingFile);
        }
        await api.admin.createSiteImage(formData);
      }
      setShowForm(false);
      setEditing(emptyForm);
      setPendingFile(null);
      await fetchImages();
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.admin.deleteSiteImage(id);
      setDeleteConfirm(null);
      await fetchImages();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleToggleActive = async (image: SiteImage) => {
    try {
      await api.admin.updateSiteImage(image.id, { active: !image.active });
      await fetchImages();
    } catch (err) {
      console.error('Failed to toggle:', err);
    }
  };

  const openEdit = (image: SiteImage) => {
    setEditing({
      id: image.id,
      title: image.title || '',
      alt_text: image.alt_text || '',
      placement: image.placement,
      sort_order: image.sort_order,
      active: image.active,
      caption: image.caption || '',
    });
    setPendingFile(null);
    setShowForm(true);
  };

  const openNew = () => {
    setEditing({ ...emptyForm, placement: filter !== 'all' ? filter : 'gallery' });
    setPendingFile(null);
    setShowForm(true);
  };

  const filteredImages = filter === 'all' ? images : images.filter(i => i.placement === filter);

  const groupedImages = PLACEMENTS.reduce<Record<string, SiteImage[]>>((acc, p) => {
    acc[p.value] = filteredImages.filter(i => i.placement === p.value);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-text-primary">Site Images</h1>
          <p className="text-sm text-text-muted mt-1">
            Manage hero backgrounds, gallery photos, and page images
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gold text-navy-900 font-heading font-semibold text-sm uppercase tracking-wider hover:bg-gold-400 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Image
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-white/5 pb-px">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            filter === 'all'
              ? 'text-gold border-gold'
              : 'text-text-muted border-transparent hover:text-text-secondary'
          }`}
        >
          All ({images.length})
        </button>
        {PLACEMENTS.map((p) => {
          const count = images.filter(i => i.placement === p.value).length;
          return (
            <button
              key={p.value}
              onClick={() => setFilter(p.value)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                filter === p.value
                  ? 'text-gold border-gold'
                  : 'text-text-muted border-transparent hover:text-text-secondary'
              }`}
            >
              {p.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Image Grid by Placement */}
      {filter === 'all' ? (
        PLACEMENTS.map((p) => {
          const imgs = groupedImages[p.value];
          if (!imgs || imgs.length === 0) return null;
          return (
            <div key={p.value} className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-heading font-semibold text-text-secondary uppercase tracking-wider">
                  {p.label}
                </h2>
                <span className="text-xs text-text-muted">— {p.description}</span>
              </div>
              <ImageGrid
                images={imgs}
                onEdit={openEdit}
                onToggle={handleToggleActive}
                onDelete={(id) => setDeleteConfirm(id)}
              />
            </div>
          );
        })
      ) : (
        <ImageGrid
          images={filteredImages}
          onEdit={openEdit}
          onToggle={handleToggleActive}
          onDelete={(id) => setDeleteConfirm(id)}
        />
      )}

      {filteredImages.length === 0 && (
        <div className="text-center py-16 text-text-muted">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No images{filter !== 'all' ? ` in ${filter}` : ''}.</p>
          <button onClick={openNew} className="text-gold text-sm mt-2 hover:underline">
            Upload one
          </button>
        </div>
      )}

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface border border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-5 border-b border-white/5">
                <h3 className="font-heading font-semibold text-text-primary">
                  {editing.id ? 'Edit Image' : 'New Image'}
                </h3>
                <button onClick={() => setShowForm(false)} className="text-text-muted hover:text-text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                <ImageUpload
                  currentUrl={editing.id ? (images.find(i => i.id === editing.id)?.image_url ?? null) : null}
                  onUpload={async (file) => { setPendingFile(file); }}
                  label="Image"
                />

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">
                      Title
                    </label>
                    <input
                      type="text"
                      value={editing.title}
                      onChange={(e) => setEditing(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none transition-colors"
                      placeholder="e.g., Hero Background"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">
                      Alt Text
                    </label>
                    <input
                      type="text"
                      value={editing.alt_text}
                      onChange={(e) => setEditing(prev => ({ ...prev, alt_text: e.target.value }))}
                      className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none transition-colors"
                      placeholder="Describe the image for accessibility"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">
                      Placement
                    </label>
                    <select
                      value={editing.placement}
                      onChange={(e) => setEditing(prev => ({ ...prev, placement: e.target.value }))}
                      className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none transition-colors"
                    >
                      {PLACEMENTS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      value={editing.sort_order}
                      onChange={(e) => setEditing(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">
                      Caption
                    </label>
                    <input
                      type="text"
                      value={editing.caption}
                      onChange={(e) => setEditing(prev => ({ ...prev, caption: e.target.value }))}
                      className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none transition-colors"
                      placeholder="Optional caption for gallery"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editing.active}
                        onChange={(e) => setEditing(prev => ({ ...prev, active: e.target.checked }))}
                        className="w-4 h-4 accent-gold-500"
                      />
                      <span className="text-sm text-text-secondary">Active (visible on site)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-5 border-t border-white/5">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-gold text-navy-900 font-heading font-semibold text-sm uppercase tracking-wider hover:bg-gold-400 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirm !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-white/10 p-6 max-w-sm w-full text-center"
            >
              <Trash2 className="w-10 h-10 text-red-400 mx-auto mb-4" />
              <h3 className="font-heading font-semibold text-text-primary mb-2">Delete Image?</h3>
              <p className="text-sm text-text-muted mb-6">This action cannot be undone.</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-sm text-text-muted hover:text-text-primary border border-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="px-4 py-2 text-sm bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ImageGrid({
  images,
  onEdit,
  onToggle,
  onDelete,
}: {
  images: SiteImage[];
  onEdit: (img: SiteImage) => void;
  onToggle: (img: SiteImage) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {images.map((image) => (
        <motion.div
          key={image.id}
          layout
          className={`group relative border transition-colors ${
            image.active ? 'border-white/5 hover:border-white/15' : 'border-white/5 opacity-50'
          }`}
        >
          {/* Image */}
          <div
            className="aspect-[4/3] bg-white/[0.02] cursor-pointer overflow-hidden"
            onClick={() => onEdit(image)}
          >
            {image.image_url ? (
              <img
                src={image.image_url}
                alt={image.alt_text || ''}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-text-muted/30" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-3 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-primary font-medium truncate">
                {image.title || 'Untitled'}
              </p>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <GripVertical className="w-3.5 h-3.5 text-text-muted/40" />
                <span className="text-xs text-text-muted tabular-nums">{image.sort_order}</span>
              </div>
            </div>
            <p className="text-xs text-text-muted truncate">
              {image.placement} {image.caption ? `· ${image.caption}` : ''}
            </p>
          </div>

          {/* Actions overlay */}
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(image); }}
              className="p-1.5 bg-black/60 hover:bg-black/80 transition-colors"
              title={image.active ? 'Deactivate' : 'Activate'}
            >
              {image.active ? (
                <Eye className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-text-muted" />
              )}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(image.id); }}
              className="p-1.5 bg-black/60 hover:bg-red-900/80 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
