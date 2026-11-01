import { useEffect, useState, useCallback, useRef } from 'react'
import { Plus, Pencil, Trash2, Loader2, Save, Hotel } from 'lucide-react'
import { discardMessage } from './useDirtyNavigation'
import { api } from '../../../services/api'
import type { EventAccommodation, EventAccommodationFormData } from '../../../services/api'
import ImageUpload from '../../ImageUpload'
import { resolveMediaUrl } from '../../../utils/images'
import { formatDate } from '../../../utils/dates'

export default function AccommodationsSection({
  eventId,
  onDirtyChange,
}: {
  eventId: number
  onDirtyChange?: (dirty: boolean) => void
}) {
  const [accommodations, setAccommodations] = useState<EventAccommodation[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState<EventAccommodationFormData>({
    hotel_name: '',
    description: '',
    room_types: '',
    rate_info: '',
    inclusions: '',
    check_in_date: '',
    check_out_date: '',
    booking_url: '',
    booking_code: '',
    contact_email: '',
    contact_phone: '',
    sort_order: 0,
    active: true,
  })
  const [formBaseline, setFormBaseline] = useState('')
  const openedEditor = useRef<number | 'new' | null>(null)
  useEffect(() => {
    if (openedEditor.current !== editing) {
      openedEditor.current = editing
      setFormBaseline(JSON.stringify(form))
    }
  }, [editing, form])
  useEffect(() => {
    onDirtyChange?.(editing !== null && JSON.stringify(form) !== formBaseline)
  }, [editing, form, formBaseline, onDirtyChange])
  useEffect(
    () => () => {
      onDirtyChange?.(false)
    },
    [onDirtyChange]
  )
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await api.admin.getAccommodations(eventId)
      setAccommodations(res.accommodations)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accommodations')
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    load()
  }, [load])

  const handleSave = async () => {
    if (!form.hotel_name.trim()) {
      setError('Enter a hotel name.')
      return
    }
    if (form.check_in_date && form.check_out_date && form.check_out_date < form.check_in_date) {
      setError('Check-out must be on or after check-in.')
      return
    }
    if (form.booking_url && !/^https?:\/\//i.test(form.booking_url)) {
      setError('Enter a full http or https booking URL.')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (editing === 'new') {
        await api.admin.createAccommodation(eventId, form)
      } else if (typeof editing === 'number') {
        await api.admin.updateAccommodation(eventId, editing, form)
      }
      setEditing(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save accommodation')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    setError('')
    try {
      await api.admin.deleteAccommodation(eventId, id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete accommodation')
    }
  }

  const editAccommodation = (a: EventAccommodation) => {
    if (editing !== null && JSON.stringify(form) !== formBaseline && !window.confirm(discardMessage)) return
    setForm({
      hotel_name: a.hotel_name,
      description: a.description || '',
      room_types: a.room_types || '',
      rate_info: a.rate_info || '',
      inclusions: a.inclusions || '',
      check_in_date: a.check_in_date || '',
      check_out_date: a.check_out_date || '',
      booking_url: a.booking_url || '',
      booking_code: a.booking_code || '',
      contact_email: a.contact_email || '',
      contact_phone: a.contact_phone || '',
      sort_order: a.sort_order,
      active: a.active,
    })
    setEditing(a.id)
  }

  return (
    <div className="border border-white/5">
      <div className="px-4 py-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <Hotel className="w-4 h-4 text-text-muted" />
          Accommodations ({accommodations.length})
        </span>
        {editing === null && (
          <button
            onClick={() => {
              setForm({
                hotel_name: '',
                description: '',
                room_types: '',
                rate_info: '',
                inclusions: '',
                check_in_date: '',
                check_out_date: '',
                booking_url: '',
                booking_code: '',
                contact_email: '',
                contact_phone: '',
                sort_order: accommodations.length,
                active: true,
              })
              setEditing('new')
            }}
            className="flex items-center gap-1.5 text-xs text-gold hover:text-gold/80"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="mx-4 mb-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-4 text-center">
          <Loader2 className="w-4 h-4 animate-spin mx-auto text-text-muted" />
        </div>
      ) : (
        <div className="border-t border-white/5">
          {accommodations.map((a) => (
            <div
              key={a.id}
              className="px-4 py-3 flex items-center justify-between border-b border-white/5 last:border-0"
            >
              <div className="flex items-center gap-3">
                {a.image_url && (
                  <img
                    src={resolveMediaUrl(a.image_url) || ''}
                    alt={a.hotel_name}
                    className="w-12 h-12 object-cover rounded"
                  />
                )}
                <div>
                  <div className="text-sm text-text-primary font-medium">{a.hotel_name}</div>
                  <div className="text-xs text-text-muted">
                    {a.check_in_date && a.check_out_date
                      ? `${formatDate(a.check_in_date)} — ${formatDate(a.check_out_date)}`
                      : 'No dates set'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-1.5 py-0.5 ${a.active ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-text-muted'}`}
                >
                  {a.active ? 'Active' : 'Hidden'}
                </span>
                <button
                  aria-label={`Edit hotel: ${a.hotel_name}`}
                  onClick={() => editAccommodation(a)}
                  className="p-1 text-text-muted hover:text-text-primary"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  aria-label={`Delete hotel: ${a.hotel_name}`}
                  onClick={() => handleDelete(a.id)}
                  className="p-1 text-text-muted hover:text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}

          {editing !== null && (
            <div className="p-4 space-y-3 bg-white/[0.01]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label
                    className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
                    htmlFor="accommodationssection-field-1"
                  >
                    Hotel Name *
                  </label>
                  <input
                    id="accommodationssection-field-1"
                    value={form.hotel_name}
                    onChange={(e) => setForm((p) => ({ ...p, hotel_name: e.target.value }))}
                    className="w-full bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary focus:border-gold/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
                    htmlFor="accommodationssection-field-2"
                  >
                    Rate Info
                  </label>
                  <input
                    id="accommodationssection-field-2"
                    value={form.rate_info}
                    onChange={(e) => setForm((p) => ({ ...p, rate_info: e.target.value }))}
                    placeholder="e.g. From $89/night"
                    className="w-full bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
                    htmlFor="accommodationssection-field-3"
                  >
                    Room Types
                  </label>
                  <input
                    id="accommodationssection-field-3"
                    value={form.room_types}
                    onChange={(e) => setForm((p) => ({ ...p, room_types: e.target.value }))}
                    placeholder="Standard Queen, Standard Twin, Family"
                    className="w-full bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
                    htmlFor="accommodationssection-field-4"
                  >
                    Inclusions
                  </label>
                  <input
                    id="accommodationssection-field-4"
                    value={form.inclusions}
                    onChange={(e) => setForm((p) => ({ ...p, inclusions: e.target.value }))}
                    placeholder="Breakfast for 2, Wi-Fi"
                    className="w-full bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
                    htmlFor="accommodationssection-field-5"
                  >
                    Check-in Date
                  </label>
                  <input
                    id="accommodationssection-field-5"
                    type="date"
                    value={form.check_in_date}
                    onChange={(e) => setForm((p) => ({ ...p, check_in_date: e.target.value }))}
                    className="w-full bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary focus:border-gold/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
                    htmlFor="accommodationssection-field-6"
                  >
                    Check-out Date
                  </label>
                  <input
                    id="accommodationssection-field-6"
                    type="date"
                    value={form.check_out_date}
                    onChange={(e) => setForm((p) => ({ ...p, check_out_date: e.target.value }))}
                    className="w-full bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary focus:border-gold/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
                    htmlFor="accommodationssection-field-7"
                  >
                    Booking URL
                  </label>
                  <input
                    id="accommodationssection-field-7"
                    value={form.booking_url}
                    onChange={(e) => setForm((p) => ({ ...p, booking_url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
                    htmlFor="accommodationssection-field-8"
                  >
                    Booking Code
                  </label>
                  <input
                    id="accommodationssection-field-8"
                    value={form.booking_code}
                    onChange={(e) => setForm((p) => ({ ...p, booking_code: e.target.value }))}
                    placeholder="MARIANAS2026"
                    className="w-full bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
                    htmlFor="accommodationssection-field-9"
                  >
                    Contact Email
                  </label>
                  <input
                    id="accommodationssection-field-9"
                    value={form.contact_email}
                    onChange={(e) => setForm((p) => ({ ...p, contact_email: e.target.value }))}
                    className="w-full bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
                    htmlFor="accommodationssection-field-10"
                  >
                    Contact Phone
                  </label>
                  <input
                    id="accommodationssection-field-10"
                    value={form.contact_phone}
                    onChange={(e) => setForm((p) => ({ ...p, contact_phone: e.target.value }))}
                    className="w-full bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label
                  className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
                  htmlFor="accommodationssection-field-11"
                >
                  Description
                </label>
                <textarea
                  id="accommodationssection-field-11"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none resize-none"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                  className="accent-gold"
                />
                Active (visible on public site)
              </label>
              {typeof editing === 'number' && (
                <ImageUpload
                  currentUrl={resolveMediaUrl(accommodations.find((a) => a.id === editing)?.image_url) || null}
                  onUpload={async (file) => {
                    try {
                      await api.admin.uploadAccommodationImage(eventId, editing, file)
                      await load()
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Image upload failed')
                    }
                  }}
                  label="Hotel Photo"
                />
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-gold/10 text-gold text-xs font-medium hover:bg-gold/15 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    if (JSON.stringify(form) === formBaseline || window.confirm(discardMessage)) setEditing(null)
                  }}
                  className="px-4 py-1.5 text-text-muted text-xs hover:text-text-primary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {accommodations.length === 0 && editing === null && (
            <div className="p-4 text-center text-text-muted text-xs">No accommodations yet.</div>
          )}
        </div>
      )}
    </div>
  )
}
