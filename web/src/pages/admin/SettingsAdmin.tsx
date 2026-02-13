import { useEffect, useState, useCallback } from 'react'
import { Settings, Loader2, Save, Globe, Mail, Phone } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../services/api'
import type { Organization } from '../../services/api'
import ImageUpload from '../../components/ImageUpload'

interface OrgForm {
  name: string
  description: string
  primary_color: string
  secondary_color: string
  contact_email: string
  phone: string
  website_url: string
  instagram_url: string
  facebook_url: string
}

export default function SettingsAdmin() {
  const [org, setOrg] = useState<Organization | null>(null)
  const [form, setForm] = useState<OrgForm>({
    name: '', description: '', primary_color: '', secondary_color: '',
    contact_email: '', phone: '', website_url: '', instagram_url: '', facebook_url: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = useCallback(async () => {
    try {
      const data = await api.admin.getOrganization()
      setOrg(data)
      setForm({
        name: data.name || '',
        description: data.description || '',
        primary_color: data.primary_color || '#004581',
        secondary_color: data.secondary_color || '#D4A843',
        contact_email: data.contact_email || '',
        phone: data.phone || '',
        website_url: data.website_url || '',
        instagram_url: data.instagram_url || '',
        facebook_url: data.facebook_url || '',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      await api.admin.updateOrganization(form)
      setSuccess('Settings saved')
      await load()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (file: File) => {
    await api.admin.uploadOrgLogo(file)
    await load()
  }

  const handleBannerUpload = async (file: File) => {
    await api.admin.uploadOrgBanner(file)
    await load()
  }

  const updateForm = (field: keyof OrgForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-gold animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Settings className="w-6 h-6 text-gold" />
        <h1 className="font-heading text-2xl font-bold text-text-primary">Settings</h1>
      </div>

      <AnimatePresence>
        {success && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-4 px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 text-sm"
          >{success}</motion.div>
        )}
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-4 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
          >{error}</motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        {/* General */}
        <div className="bg-surface border border-white/5">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="font-heading text-sm font-semibold text-text-primary">General</h2>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Organization Name</label>
              <input
                value={form.name}
                onChange={e => updateForm('name', e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={e => updateForm('description', e.target.value)}
                rows={4}
                className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="bg-surface border border-white/5">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="font-heading text-sm font-semibold text-text-primary">Branding</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ImageUpload currentUrl={org?.logo_url || null} onUpload={handleLogoUpload} label="Logo" />
              <ImageUpload currentUrl={org?.banner_url || null} onUpload={handleBannerUpload} label="Banner" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.primary_color}
                    onChange={e => updateForm('primary_color', e.target.value)}
                    className="w-10 h-10 border border-white/10 cursor-pointer bg-transparent"
                  />
                  <input
                    value={form.primary_color}
                    onChange={e => updateForm('primary_color', e.target.value)}
                    className="flex-1 bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary font-mono focus:border-gold/40 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Secondary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.secondary_color}
                    onChange={e => updateForm('secondary_color', e.target.value)}
                    className="w-10 h-10 border border-white/10 cursor-pointer bg-transparent"
                  />
                  <input
                    value={form.secondary_color}
                    onChange={e => updateForm('secondary_color', e.target.value)}
                    className="flex-1 bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary font-mono focus:border-gold/40 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-surface border border-white/5">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="font-heading text-sm font-semibold text-text-primary">Contact Info</h2>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">
                <Mail className="w-3 h-3 inline mr-1" />Email
              </label>
              <input
                value={form.contact_email}
                onChange={e => updateForm('contact_email', e.target.value)}
                type="email"
                className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">
                <Phone className="w-3 h-3 inline mr-1" />Phone
              </label>
              <input
                value={form.phone}
                onChange={e => updateForm('phone', e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="bg-surface border border-white/5">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="font-heading text-sm font-semibold text-text-primary">Social Links</h2>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">
                <Globe className="w-3 h-3 inline mr-1" />Website
              </label>
              <input
                value={form.website_url}
                onChange={e => updateForm('website_url', e.target.value)}
                placeholder="https://"
                className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Instagram</label>
              <input
                value={form.instagram_url}
                onChange={e => updateForm('instagram_url', e.target.value)}
                placeholder="https://instagram.com/..."
                className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Facebook</label>
              <input
                value={form.facebook_url}
                onChange={e => updateForm('facebook_url', e.target.value)}
                placeholder="https://facebook.com/..."
                className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-gold/10 text-gold text-sm font-medium hover:bg-gold/15 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
