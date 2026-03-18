import { useEffect, useState, useCallback } from 'react'
import { CalendarDays, Plus, Pencil, Trash2, X, Loader2, Star, Clock, Trophy, Save, ChevronDown, ChevronUp, Radio, Hotel } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { api } from '../../services/api'
import type { Event, EventFormData, EventScheduleItem, PrizeCategory, EventAccommodation, EventAccommodationFormData } from '../../services/api'
import ImageUpload from '../../components/ImageUpload'

const emptyForm: EventFormData = {
  name: '', slug: '', description: '', date: '', end_date: '',
  venue_name: '', venue_address: '', city: '', country: '', country_code: '',
  asjjf_stars: 0, is_main_event: false, prize_pool: '', registration_url: '',
  status: 'draft', latitude: '', longitude: '',
  live_stream_url: '', live_stream_active: false,
  event_schedule_items_attributes: [],
  prize_categories_attributes: [],
}

function eventToForm(e: Event): EventFormData {
  return {
    name: e.name, slug: e.slug, description: e.description || '',
    date: e.date, end_date: e.end_date || '',
    venue_name: e.venue_name || '', venue_address: e.venue_address || '',
    city: e.city || '', country: e.country || '', country_code: e.country_code || '',
    asjjf_stars: e.asjjf_stars || 0, is_main_event: e.is_main_event || false,
    prize_pool: e.prize_pool || '', registration_url: e.registration_url || '',
    status: e.status || 'draft',
    latitude: e.latitude?.toString() || '', longitude: e.longitude?.toString() || '',
    live_stream_url: e.live_stream_url || '', live_stream_active: e.live_stream_active || false,
    event_schedule_items_attributes: e.event_schedule_items.map(s => ({
      id: s.id, time: s.time, description: s.description, sort_order: s.sort_order,
    })),
    prize_categories_attributes: e.prize_categories.map(p => ({
      id: p.id, name: p.name, amount: p.amount, sort_order: p.sort_order,
    })),
  }
}

export default function EventsAdmin() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<EventFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  const loadEvents = useCallback(async () => {
    try {
      const res = await api.admin.getEvents()
      setEvents(res.events)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadEvents() }, [loadEvents])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      if (editing === 'new') {
        await api.admin.createEvent(form)
        setSuccess('Event created')
      } else if (typeof editing === 'number') {
        await api.admin.updateEvent(editing, form)
        setSuccess('Event updated')
      }
      setEditing(null)
      await loadEvents()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.admin.deleteEvent(id)
      setDeleteConfirm(null)
      setSuccess('Event deleted')
      await loadEvents()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const handleImageUpload = async (file: File) => {
    if (typeof editing !== 'number') return
    await api.admin.uploadEventImage(editing, file)
    await loadEvents()
  }

  const updateForm = (field: string, value: string | number | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const addScheduleItem = () => {
    setForm(prev => ({
      ...prev,
      event_schedule_items_attributes: [
        ...prev.event_schedule_items_attributes,
        { time: '', description: '', sort_order: prev.event_schedule_items_attributes.length },
      ],
    }))
  }

  const updateScheduleItem = (idx: number, field: keyof EventScheduleItem, value: string | number) => {
    setForm(prev => ({
      ...prev,
      event_schedule_items_attributes: prev.event_schedule_items_attributes.map((item, i) =>
        i === idx ? { ...item, [field]: value } : item
      ),
    }))
  }

  const removeScheduleItem = (idx: number) => {
    setForm(prev => {
      const item = prev.event_schedule_items_attributes[idx]
      if (item.id) {
        return {
          ...prev,
          event_schedule_items_attributes: prev.event_schedule_items_attributes.map((it, i) =>
            i === idx ? { ...it, _destroy: true } : it
          ),
        }
      }
      return {
        ...prev,
        event_schedule_items_attributes: prev.event_schedule_items_attributes.filter((_, i) => i !== idx),
      }
    })
  }

  const addPrizeCategory = () => {
    setForm(prev => ({
      ...prev,
      prize_categories_attributes: [
        ...prev.prize_categories_attributes,
        { name: '', amount: '', sort_order: prev.prize_categories_attributes.length },
      ],
    }))
  }

  const updatePrizeCategory = (idx: number, field: keyof PrizeCategory, value: string | number) => {
    setForm(prev => ({
      ...prev,
      prize_categories_attributes: prev.prize_categories_attributes.map((item, i) =>
        i === idx ? { ...item, [field]: value } : item
      ),
    }))
  }

  const removePrizeCategory = (idx: number) => {
    setForm(prev => {
      const item = prev.prize_categories_attributes[idx]
      if (item.id) {
        return {
          ...prev,
          prize_categories_attributes: prev.prize_categories_attributes.map((it, i) =>
            i === idx ? { ...it, _destroy: true } : it
          ),
        }
      }
      return {
        ...prev,
        prize_categories_attributes: prev.prize_categories_attributes.filter((_, i) => i !== idx),
      }
    })
  }

  const currentEvent = typeof editing === 'number' ? events.find(e => e.id === editing) : null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-gold animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-6 h-6 text-gold" />
          <h1 className="font-heading text-2xl font-bold text-text-primary">Events</h1>
        </div>
        {!editing && (
          <button
            onClick={() => { setForm(emptyForm); setEditing('new'); setError('') }}
            className="flex items-center gap-2 px-4 py-2 bg-gold/10 text-gold text-sm font-medium hover:bg-gold/15 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Event
          </button>
        )}
      </div>

      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 text-sm"
          >
            {success}
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {editing !== null ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface border border-white/5"
        >
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-heading text-sm font-semibold text-text-primary">
              {editing === 'new' ? 'New Event' : 'Edit Event'}
            </h2>
            <button onClick={() => { setEditing(null); setError('') }} className="text-text-muted hover:text-text-primary">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Name" value={form.name} onChange={v => updateForm('name', v)} />
              <Field label="Slug" value={form.slug} onChange={v => updateForm('slug', v)} placeholder="auto-generated-if-blank" />
              <Field label="Date" type="date" value={form.date} onChange={v => updateForm('date', v)} />
              <Field label="End Date" type="date" value={form.end_date} onChange={v => updateForm('end_date', v)} />
              <Field label="Venue Name" value={form.venue_name} onChange={v => updateForm('venue_name', v)} />
              <Field label="Venue Address" value={form.venue_address} onChange={v => updateForm('venue_address', v)} />
              <Field label="City" value={form.city} onChange={v => updateForm('city', v)} />
              <Field label="Country" value={form.country} onChange={v => updateForm('country', v)} />
              <Field label="Country Code" value={form.country_code} onChange={v => updateForm('country_code', v)} placeholder="GU" />
              <SelectField
                label="Status"
                value={form.status}
                onChange={v => updateForm('status', v)}
                options={[
                  { value: 'draft', label: 'Draft' },
                  { value: 'upcoming', label: 'Upcoming' },
                  { value: 'published', label: 'Published' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
              />
              <Field label="ASJJF Stars" type="number" value={form.asjjf_stars.toString()} onChange={v => updateForm('asjjf_stars', parseInt(v) || 0)} />
              <Field label="Prize Pool" value={form.prize_pool} onChange={v => updateForm('prize_pool', v)} placeholder="$10,000" />
              <Field label="ASJJF Registration URL" value={form.registration_url} onChange={v => updateForm('registration_url', v)} placeholder="https://asjjf.org/events/..." />
              <Field label="Latitude" value={form.latitude} onChange={v => updateForm('latitude', v)} />
              <Field label="Longitude" value={form.longitude} onChange={v => updateForm('longitude', v)} />
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_main_event}
                  onChange={e => updateForm('is_main_event', e.target.checked)}
                  className="accent-gold"
                />
                Main Event
              </label>
            </div>

            {/* Live Stream */}
            <div className="border border-white/5">
              <button
                type="button"
                onClick={() => toggleSection('livestream')}
                className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-text-primary hover:bg-white/[0.02] transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-text-muted" />
                  Live Stream
                  {form.live_stream_active && <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 animate-pulse">LIVE</span>}
                </span>
                {expandedSections.livestream ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedSections.livestream && (
                <div className="p-4 border-t border-white/5 space-y-3">
                  <Field
                    label="Live Stream URL"
                    value={form.live_stream_url}
                    onChange={v => updateForm('live_stream_url', v)}
                    placeholder="https://www.youtube.com/@themarianasopen/live"
                  />
                  <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.live_stream_active}
                      onChange={e => updateForm('live_stream_active', e.target.checked)}
                      className="accent-gold"
                    />
                    <span>Stream is LIVE now</span>
                    {form.live_stream_active && <span className="text-xs text-red-400">(Visitors will see a live banner)</span>}
                  </label>
                </div>
              )}
            </div>

            {/* Accommodations (only when editing existing event) */}
            {typeof editing === 'number' && (
              <AccommodationsSection eventId={editing} />
            )}

            <div>
              <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={e => updateForm('description', e.target.value)}
                rows={4}
                className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none resize-none"
              />
            </div>

            {/* Hero Image */}
            {typeof editing === 'number' && (
              <ImageUpload
                currentUrl={currentEvent?.hero_image_url || null}
                onUpload={handleImageUpload}
                label="Hero Image"
              />
            )}

            {/* Schedule Items */}
            <div className="border border-white/5">
              <button
                type="button"
                onClick={() => toggleSection('schedule')}
                className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-text-primary hover:bg-white/[0.02] transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-text-muted" />
                  Schedule Items ({form.event_schedule_items_attributes.filter(s => !s._destroy).length})
                </span>
                {expandedSections.schedule ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedSections.schedule && (
                <div className="p-4 border-t border-white/5 space-y-3">
                  {form.event_schedule_items_attributes.map((item, idx) =>
                    item._destroy ? null : (
                      <div key={idx} className="flex gap-3 items-start">
                        <input
                          value={item.time}
                          onChange={e => updateScheduleItem(idx, 'time', e.target.value)}
                          placeholder="9:00 AM"
                          className="w-28 bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                        />
                        <input
                          value={item.description}
                          onChange={e => updateScheduleItem(idx, 'description', e.target.value)}
                          placeholder="Description"
                          className="flex-1 bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                        />
                        <button onClick={() => removeScheduleItem(idx)} className="p-1.5 text-text-muted hover:text-red-400">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  )}
                  <button
                    onClick={addScheduleItem}
                    className="flex items-center gap-1.5 text-xs text-gold hover:text-gold/80"
                  >
                    <Plus className="w-3 h-3" /> Add Schedule Item
                  </button>
                </div>
              )}
            </div>

            {/* Prize Categories */}
            <div className="border border-white/5">
              <button
                type="button"
                onClick={() => toggleSection('prizes')}
                className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-text-primary hover:bg-white/[0.02] transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-text-muted" />
                  Prize Categories ({form.prize_categories_attributes.filter(p => !p._destroy).length})
                </span>
                {expandedSections.prizes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedSections.prizes && (
                <div className="p-4 border-t border-white/5 space-y-3">
                  {form.prize_categories_attributes.map((item, idx) =>
                    item._destroy ? null : (
                      <div key={idx} className="flex gap-3 items-start">
                        <input
                          value={item.name}
                          onChange={e => updatePrizeCategory(idx, 'name', e.target.value)}
                          placeholder="Category name"
                          className="flex-1 bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                        />
                        <input
                          value={item.amount}
                          onChange={e => updatePrizeCategory(idx, 'amount', e.target.value)}
                          placeholder="$0"
                          className="w-28 bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                        />
                        <button onClick={() => removePrizeCategory(idx)} className="p-1.5 text-text-muted hover:text-red-400">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  )}
                  <button
                    onClick={addPrizeCategory}
                    className="flex items-center gap-1.5 text-xs text-gold hover:text-gold/80"
                  >
                    <Plus className="w-3 h-3" /> Add Prize Category
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-gold/10 text-gold text-sm font-medium hover:bg-gold/15 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => { setEditing(null); setError('') }}
                className="px-5 py-2.5 text-text-muted text-sm hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        /* Events Table */
        <div className="bg-surface border border-white/5">
          {events.length === 0 ? (
            <div className="p-8 text-center text-text-muted text-sm">No events yet. Create your first event.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  <th className="px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wide">Name</th>
                  <th className="px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wide">Date</th>
                  <th className="px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wide">Location</th>
                  <th className="px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wide">Stars</th>
                  <th className="px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wide w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {events.map(event => (
                  <tr key={event.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 text-text-primary font-medium">{event.name}</td>
                    <td className="px-5 py-3 text-text-secondary">{event.date}</td>
                    <td className="px-5 py-3 text-text-secondary">{event.city}, {event.country}</td>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-1 text-gold">
                        <Star className="w-3 h-3 fill-current" />
                        {event.asjjf_stars || 0}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 ${
                        event.status === 'upcoming' ? 'bg-gold/10 text-gold' :
                        event.status === 'published' ? 'bg-green-500/10 text-green-400' :
                        event.status === 'completed' ? 'bg-blue-500/10 text-blue-400' :
                        event.status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                        'bg-white/5 text-text-muted'
                      }`}>
                        {event.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/admin/events/${event.id}/results`}
                          className="p-1.5 text-text-muted hover:text-gold transition-colors"
                          title="Manage Results"
                        >
                          <Trophy className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => { setForm(eventToForm(event)); setEditing(event.id); setError('') }}
                          className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(event.id)}
                          className="p-1.5 text-text-muted hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirm !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-surface border border-white/10 p-6 max-w-sm w-full mx-4"
            >
              <h3 className="font-heading text-lg font-semibold text-text-primary mb-2">Delete Event</h3>
              <p className="text-sm text-text-secondary mb-5">
                Are you sure? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-sm text-text-muted hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="px-4 py-2 text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function AccommodationsSection({ eventId }: { eventId: number }) {
  const [accommodations, setAccommodations] = useState<EventAccommodation[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<EventAccommodationFormData>({
    hotel_name: '', description: '', room_types: '', rate_info: '',
    inclusions: '', check_in_date: '', check_out_date: '',
    booking_url: '', booking_code: '', contact_email: '', contact_phone: '',
    sort_order: 0, active: true,
  })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await api.admin.getAccommodations(eventId)
      setAccommodations(res.accommodations)
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [eventId])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editing === 'new') {
        await api.admin.createAccommodation(eventId, form)
      } else if (typeof editing === 'number') {
        await api.admin.updateAccommodation(eventId, editing, form)
      }
      setEditing(null)
      await load()
    } catch { /* ignore */ } finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    await api.admin.deleteAccommodation(eventId, id)
    await load()
  }

  const editAccommodation = (a: EventAccommodation) => {
    setForm({
      hotel_name: a.hotel_name, description: a.description || '',
      room_types: a.room_types || '', rate_info: a.rate_info || '',
      inclusions: a.inclusions || '', check_in_date: a.check_in_date || '',
      check_out_date: a.check_out_date || '', booking_url: a.booking_url || '',
      booking_code: a.booking_code || '', contact_email: a.contact_email || '',
      contact_phone: a.contact_phone || '', sort_order: a.sort_order, active: a.active,
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
              setForm({ hotel_name: '', description: '', room_types: '', rate_info: '', inclusions: '', check_in_date: '', check_out_date: '', booking_url: '', booking_code: '', contact_email: '', contact_phone: '', sort_order: accommodations.length, active: true })
              setEditing('new')
            }}
            className="flex items-center gap-1.5 text-xs text-gold hover:text-gold/80"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-4 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto text-text-muted" /></div>
      ) : (
        <div className="border-t border-white/5">
          {accommodations.map(a => (
            <div key={a.id} className="px-4 py-3 flex items-center justify-between border-b border-white/5 last:border-0">
              <div>
                <div className="text-sm text-text-primary font-medium">{a.hotel_name}</div>
                <div className="text-xs text-text-muted">{a.check_in_date && a.check_out_date ? `${a.check_in_date} — ${a.check_out_date}` : 'No dates set'}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-1.5 py-0.5 ${a.active ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-text-muted'}`}>
                  {a.active ? 'Active' : 'Hidden'}
                </span>
                <button onClick={() => editAccommodation(a)} className="p-1 text-text-muted hover:text-text-primary"><Pencil className="w-3 h-3" /></button>
                <button onClick={() => handleDelete(a.id)} className="p-1 text-text-muted hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}

          {editing !== null && (
            <div className="p-4 space-y-3 bg-white/[0.01]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Hotel Name *</label>
                  <input value={form.hotel_name} onChange={e => setForm(p => ({ ...p, hotel_name: e.target.value }))} className="w-full bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary focus:border-gold/40 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Rate Info</label>
                  <input value={form.rate_info} onChange={e => setForm(p => ({ ...p, rate_info: e.target.value }))} placeholder="e.g. From $89/night" className="w-full bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Room Types</label>
                  <input value={form.room_types} onChange={e => setForm(p => ({ ...p, room_types: e.target.value }))} placeholder="Standard Queen, Standard Twin, Family" className="w-full bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Inclusions</label>
                  <input value={form.inclusions} onChange={e => setForm(p => ({ ...p, inclusions: e.target.value }))} placeholder="Breakfast for 2, Wi-Fi" className="w-full bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Check-in Date</label>
                  <input type="date" value={form.check_in_date} onChange={e => setForm(p => ({ ...p, check_in_date: e.target.value }))} className="w-full bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary focus:border-gold/40 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Check-out Date</label>
                  <input type="date" value={form.check_out_date} onChange={e => setForm(p => ({ ...p, check_out_date: e.target.value }))} className="w-full bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary focus:border-gold/40 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Booking URL</label>
                  <input value={form.booking_url} onChange={e => setForm(p => ({ ...p, booking_url: e.target.value }))} placeholder="https://..." className="w-full bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Booking Code</label>
                  <input value={form.booking_code} onChange={e => setForm(p => ({ ...p, booking_code: e.target.value }))} placeholder="MARIANAS2026" className="w-full bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Contact Email</label>
                  <input value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))} className="w-full bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Contact Phone</label>
                  <input value={form.contact_phone} onChange={e => setForm(p => ({ ...p, contact_phone: e.target.value }))} className="w-full bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none resize-none" />
              </div>
              <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} className="accent-gold" />
                Active (visible on public site)
              </label>
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-1.5 bg-gold/10 text-gold text-xs font-medium hover:bg-gold/15 disabled:opacity-50">
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => setEditing(null)} className="px-4 py-1.5 text-text-muted text-xs hover:text-text-primary">Cancel</button>
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

function Field({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
      />
    </div>
  )
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}
