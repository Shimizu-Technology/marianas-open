import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import type { DragEvent } from 'react'
import { CalendarDays, Plus, Pencil, Trash2, X, Loader2, Star, Clock, Trophy, Save, ChevronDown, ChevronUp, Radio, Hotel, Image as ImageIcon, FileText, Search, ArrowUpDown, ArrowUp, ArrowDown, Eye, Upload, Languages, RefreshCw, Copy, UploadCloud, CheckSquare, Square, EyeOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { api } from '../../services/api'
import type {
  Event,
  EventFormData,
  EventScheduleItem,
  PrizeCategory,
  EventAccommodation,
  EventAccommodationFormData,
  EventGalleryImage,
  EventGalleryImageFormData,
  EventVenueHighlight,
  EventRegistrationStep,
  EventRegistrationFeeSection,
  EventRegistrationInfoItem,
  EventTravelItem,
  EventVisaItem,
} from '../../services/api'
import ImageUpload from '../../components/ImageUpload'
import { resolveMediaUrl } from '../../utils/images'
import { formatDate } from '../../utils/dates'
import { useEditingParam } from '../../hooks/useEditingParam'
import { GALLERY_IMAGE_ACCEPT, GALLERY_IMAGE_MAX_BYTES, isSupportedGalleryImage, useGalleryUploads } from '../../contexts/GalleryUploadContext'

type SortField = 'name' | 'date' | 'location' | 'stars' | 'status'
type SortDir = 'asc' | 'desc'

const DEFAULT_LIVE_STREAM_URL = 'https://www.youtube.com/@themarianasopen/live';

const emptyForm: EventFormData = {
  name: '', slug: '', description: '', date: '', end_date: '',
  venue_name: '', venue_address: '', city: '', country: '', country_code: '',
  asjjf_stars: 0, is_main_event: false, prize_pool: '', prize_title: '', prize_description: '',
  registration_url: '', registration_url_gi: '', registration_url_nogi: '',
  status: 'draft', latitude: '', longitude: '',
  live_stream_url: '', live_stream_active: false,
  tagline: '', schedule_note: '',
  asjjf_event_ids: [],
  venue_highlights: [],
  registration_steps: [],
  registration_fee_sections: [],
  registration_info_items: [],
  travel_description: '',
  travel_items: [],
  visa_description: '',
  visa_items: [],
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
    prize_pool: e.prize_pool || '', prize_title: e.prize_title || '', prize_description: e.prize_description || '',
    registration_url: e.registration_url || '',
    registration_url_gi: e.registration_url_gi || '',
    registration_url_nogi: e.registration_url_nogi || '',
    status: e.status || 'draft',
    latitude: e.latitude?.toString() || '', longitude: e.longitude?.toString() || '',
    live_stream_url: e.live_stream_url || '', live_stream_active: e.live_stream_active || false,
    tagline: e.tagline || '',
    schedule_note: e.schedule_note || '',
    asjjf_event_ids: e.asjjf_event_ids || [],
    venue_highlights: e.venue_highlights || [],
    registration_steps: e.registration_steps || [],
    registration_fee_sections: e.registration_fee_sections || [],
    registration_info_items: e.registration_info_items || [],
    travel_description: e.travel_description || '',
    travel_items: e.travel_items || [],
    visa_description: e.visa_description || '',
    visa_items: e.visa_items || [],
    event_schedule_items_attributes: e.event_schedule_items.map(s => ({
      id: s.id, time: s.time, description: s.description, sort_order: s.sort_order,
    })),
    prize_categories_attributes: e.prize_categories.map(p => ({
      id: p.id, name: p.name, amount: p.amount, sort_order: p.sort_order,
    })),
    translation_status: e.translation_status,
  }
}

export default function EventsAdmin() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useEditingParam()

  const [form, setForm] = useState<EventFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [pendingHeroImage, setPendingHeroImage] = useState<File | null>(null)
  const heroInputRef = useRef<HTMLInputElement>(null)
  const posterInputRef = useRef<HTMLInputElement>(null)

  const pendingHeroPreviewUrl = useMemo(
    () => (pendingHeroImage ? URL.createObjectURL(pendingHeroImage) : null),
    [pendingHeroImage]
  )

  useEffect(() => {
    return () => {
      if (pendingHeroPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(pendingHeroPreviewUrl)
    }
  }, [pendingHeroPreviewUrl])

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

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

  useEffect(() => {
    return () => { pollingGenRef.current++ }
  }, [editing])

  useEffect(() => {
    if (editing === 'new') {
      setForm(emptyForm)
      setPendingHeroImage(null)
    } else if (typeof editing === 'number' && events.length > 0) {
      const event = events.find(e => e.id === editing)
      if (event) {
        setForm(eventToForm(event))
        setPendingHeroImage(null)
      }
    }
  }, [editing, events])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir(field === 'date' ? 'desc' : 'asc')
    }
  }

  const filteredEvents = useMemo(() => {
    let result = events

    if (statusFilter !== 'all') {
      result = result.filter(e => e.status === statusFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.city?.toLowerCase().includes(q) ||
        e.country?.toLowerCase().includes(q) ||
        e.slug.toLowerCase().includes(q)
      )
    }

    const sorted = [...result].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break
        case 'date': cmp = (a.date || '').localeCompare(b.date || ''); break
        case 'location': cmp = `${a.city} ${a.country}`.localeCompare(`${b.city} ${b.country}`); break
        case 'stars': cmp = (a.asjjf_stars || 0) - (b.asjjf_stars || 0); break
        case 'status': cmp = (a.status || '').localeCompare(b.status || ''); break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return sorted
  }, [events, searchQuery, statusFilter, sortField, sortDir])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    events.forEach(e => { counts[e.status] = (counts[e.status] || 0) + 1 })
    return counts
  }, [events])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      let savedEventId: number | null = null
      if (editing === 'new') {
        const res = await api.admin.createEvent(form)
        savedEventId = res.event.id
        setEditing(savedEventId)
        let imageUploadFailed = false
        if (pendingHeroImage && savedEventId) {
          try {
            await api.admin.uploadEventImage(savedEventId, pendingHeroImage)
          } catch (imgErr) {
            imageUploadFailed = true
            setError(imgErr instanceof Error ? imgErr.message : 'Event created but hero image upload failed')
          }
        }
        if (!imageUploadFailed) setSuccess('Event created')
        if (savedEventId && res.event.translation_status === 'pending') {
          setForm(prev => ({ ...prev, translation_status: 'pending' }))
          setSuccess('Event created — translating...')
          pollTranslationStatus(savedEventId)
        }
      } else if (typeof editing === 'number') {
        const res = await api.admin.updateEvent(editing, form)
        setSuccess('Event updated')
        if (res.event.translation_status === 'pending') {
          setForm(prev => ({ ...prev, translation_status: 'pending' }))
          setSuccess('Event saved — translating changes...')
          pollTranslationStatus(editing)
      }
      }
      setPendingHeroImage(null)
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

  const handleClone = async (id: number) => {
    try {
      const res = await api.admin.cloneEvent(id)
      setSuccess(`Event cloned as "${res.event.name}"`)
      await loadEvents()
      setForm(eventToForm(res.event))
      setEditing(res.event.id)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clone failed')
    }
  }

  const handleImageUpload = async (file: File) => {
    if (typeof editing !== 'number') return
    try {
    await api.admin.uploadEventImage(editing, file)
    await loadEvents()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed')
    }
  }

  const [translating, setTranslating] = useState(false)
  const pollingGenRef = useRef(0)

  const pollTranslationStatus = useCallback(async (eventId: number) => {
    const generation = ++pollingGenRef.current
    setTranslating(true)
    for (let attempt = 0; attempt < 24; attempt++) {
      await new Promise(r => setTimeout(r, 3000))
      if (generation !== pollingGenRef.current) return
      try {
        const { event: updated } = await api.admin.getEvent(eventId)
        if (updated.translation_status === 'translated' || updated.translation_status === 'failed') {
          if (generation !== pollingGenRef.current) return
          setTranslating(false)
          setForm(prev => ({ ...prev, translation_status: updated.translation_status }))
          setEvents(prev => prev.map(e => e.id === eventId ? { ...e, translation_status: updated.translation_status } : e))
          if (updated.translation_status === 'translated') {
            setSuccess('Translation complete!')
          } else {
            setError('Translation failed — check server logs')
          }
          setTimeout(() => { setSuccess(''); setError('') }, 5000)
          return
        }
      } catch {
        // keep polling
      }
    }
    if (generation !== pollingGenRef.current) return
    setTranslating(false)
    setSuccess('Translation is still processing. Refresh the page in a moment.')
    setTimeout(() => setSuccess(''), 5000)
  }, [])

  const handleRetranslate = async () => {
    if (typeof editing !== 'number') return
    setTranslating(true)
    try {
      await api.admin.retranslateEvent(editing)
      setSuccess('Translating...')
      pollTranslationStatus(editing)
    } catch (err) {
      setTranslating(false)
      setError(err instanceof Error ? err.message : 'Retranslate failed')
    }
  }

  const updateForm = (field: string, value: string | number | boolean | number[]) => {
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

  const addVenueHighlight = () => {
    setForm(prev => ({
      ...prev,
      venue_highlights: [...prev.venue_highlights, { title: '', description: '' }],
    }))
  }

  const updateVenueHighlight = (idx: number, field: keyof EventVenueHighlight, value: string) => {
    setForm(prev => ({
      ...prev,
      venue_highlights: prev.venue_highlights.map((item, i) =>
        i === idx ? { ...item, [field]: value } : item
      ),
    }))
  }

  const removeVenueHighlight = (idx: number) => {
    setForm(prev => ({
      ...prev,
      venue_highlights: prev.venue_highlights.filter((_, i) => i !== idx),
    }))
  }

  const addRegistrationStep = () => {
    setForm(prev => ({
      ...prev,
      registration_steps: [...prev.registration_steps, { title: '', description: '', url: '', link_label: '' }],
    }))
  }

  const updateRegistrationStep = (idx: number, field: keyof EventRegistrationStep, value: string) => {
    setForm(prev => ({
      ...prev,
      registration_steps: prev.registration_steps.map((item, i) =>
        i === idx ? { ...item, [field]: value } : item
      ),
    }))
  }

  const removeRegistrationStep = (idx: number) => {
    setForm(prev => ({
      ...prev,
      registration_steps: prev.registration_steps.filter((_, i) => i !== idx),
    }))
  }

  const addRegistrationFeeSection = () => {
    setForm(prev => ({
      ...prev,
      registration_fee_sections: [...prev.registration_fee_sections, { title: '', rows: [{ deadline: '', fee: '', option: '' }] }],
    }))
  }

  const updateRegistrationFeeSection = (idx: number, field: keyof EventRegistrationFeeSection, value: string) => {
    setForm(prev => ({
      ...prev,
      registration_fee_sections: prev.registration_fee_sections.map((item, i) =>
        i === idx ? { ...item, [field]: value } : item
      ),
    }))
  }

  const removeRegistrationFeeSection = (idx: number) => {
    setForm(prev => ({
      ...prev,
      registration_fee_sections: prev.registration_fee_sections.filter((_, i) => i !== idx),
    }))
  }

  const addRegistrationFeeRow = (sectionIdx: number) => {
    setForm(prev => ({
      ...prev,
      registration_fee_sections: prev.registration_fee_sections.map((section, i) =>
        i === sectionIdx
          ? { ...section, rows: [...section.rows, { deadline: '', fee: '', option: '' }] }
          : section
      ),
    }))
  }

  const updateRegistrationFeeRow = (
    sectionIdx: number,
    rowIdx: number,
    field: 'deadline' | 'fee' | 'option',
    value: string
  ) => {
    setForm(prev => ({
      ...prev,
      registration_fee_sections: prev.registration_fee_sections.map((section, i) =>
        i === sectionIdx
          ? {
              ...section,
              rows: section.rows.map((row, j) => (j === rowIdx ? { ...row, [field]: value } : row)),
            }
          : section
      ),
    }))
  }

  const removeRegistrationFeeRow = (sectionIdx: number, rowIdx: number) => {
    setForm(prev => ({
      ...prev,
      registration_fee_sections: prev.registration_fee_sections.map((section, i) =>
        i === sectionIdx
          ? { ...section, rows: section.rows.filter((_, j) => j !== rowIdx) }
          : section
      ),
    }))
  }

  const addRegistrationInfoItem = () => {
    setForm(prev => ({
      ...prev,
      registration_info_items: [...prev.registration_info_items, { label: '', value: '' }],
    }))
  }

  const updateRegistrationInfoItem = (idx: number, field: keyof EventRegistrationInfoItem, value: string) => {
    setForm(prev => ({
      ...prev,
      registration_info_items: prev.registration_info_items.map((item, i) =>
        i === idx ? { ...item, [field]: value } : item
      ),
    }))
  }

  const removeRegistrationInfoItem = (idx: number) => {
    setForm(prev => ({
      ...prev,
      registration_info_items: prev.registration_info_items.filter((_, i) => i !== idx),
    }))
  }

  const addTravelItem = () => {
    setForm(prev => ({
      ...prev,
      travel_items: [...prev.travel_items, { title: '', description: '', value: '', url: '', link_label: '' }],
    }))
  }

  const updateTravelItem = (idx: number, field: keyof EventTravelItem, value: string) => {
    setForm(prev => ({
      ...prev,
      travel_items: prev.travel_items.map((item, i) =>
        i === idx ? { ...item, [field]: value } : item
      ),
    }))
  }

  const removeTravelItem = (idx: number) => {
    setForm(prev => ({
      ...prev,
      travel_items: prev.travel_items.filter((_, i) => i !== idx),
    }))
  }

  const addVisaItem = () => {
    setForm(prev => ({
      ...prev,
      visa_items: [...prev.visa_items, { title: '', description: '' }],
    }))
  }

  const updateVisaItem = (idx: number, field: keyof EventVisaItem, value: string) => {
    setForm(prev => ({
      ...prev,
      visa_items: prev.visa_items.map((item, i) =>
        i === idx ? { ...item, [field]: value } : item
      ),
    }))
  }

  const removeVisaItem = (idx: number) => {
    setForm(prev => ({
      ...prev,
      visa_items: prev.visa_items.filter((_, i) => i !== idx),
    }))
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div
          className={`flex items-center gap-3 ${editing ? 'cursor-pointer group' : ''}`}
          onClick={editing ? () => { setEditing(null); setError('') } : undefined}
        >
          <CalendarDays className={`w-6 h-6 text-gold ${editing ? 'group-hover:text-gold/70' : ''}`} />
          <h1 className={`font-heading text-2xl font-bold text-text-primary ${editing ? 'group-hover:text-gold transition-colors' : ''}`}>
            Events
          </h1>
          {editing && (
            <span className="text-xs text-text-muted group-hover:text-text-secondary transition-colors">(back to list)</span>
          )}
        </div>
        {!editing && (
          <button
            onClick={() => { setForm(emptyForm); setEditing('new'); setError('') }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gold/10 text-gold text-sm font-medium hover:bg-gold/15 transition-colors"
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
          <div className="px-4 sm:px-5 py-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="font-heading text-sm font-semibold text-text-primary">
              {editing === 'new' ? 'New Event' : 'Edit Event'}
            </h2>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {typeof editing === 'number' && (
                <>
                <Link
                  to={`/admin/events/${editing}/results`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gold/10 text-gold text-xs font-medium hover:bg-gold/15 transition-colors"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  Manage Results
                </Link>
                <button
                  onClick={handleRetranslate}
                  disabled={translating}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                    translating
                      ? 'bg-blue-500/5 text-blue-400/50 cursor-wait'
                      : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/15'
                  }`}
                  title="Retranslate this event and all its child records"
                >
                  {translating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
                  {translating ? 'Translating...' : 'Translate'}
                </button>
                {form.translation_status && form.translation_status !== 'untranslated' && (
                  <span className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    form.translation_status === 'translated' ? 'bg-green-500/10 text-green-400' :
                    form.translation_status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                    form.translation_status === 'failed' ? 'bg-red-500/10 text-red-400' : 'bg-white/5 text-text-muted'
                  }`}>
                    {form.translation_status === 'pending' && <RefreshCw className="w-3 h-3 animate-spin" />}
                    {form.translation_status}
                  </span>
                )}
                </>
              )}
            <button onClick={() => { setEditing(null); setError('') }} className="text-text-muted hover:text-text-primary">
              <X className="w-4 h-4" />
            </button>
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-5">
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
                  { value: 'live', label: 'Live' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
              />
              <Field label="ASJJF Stars" type="number" value={form.asjjf_stars.toString()} onChange={v => updateForm('asjjf_stars', parseInt(v, 10) || 0)} />
              <Field label="Prize Pool" value={form.prize_pool} onChange={v => updateForm('prize_pool', v)} placeholder="$10,000" />
              <Field label="Prize Card Title" value={form.prize_title} onChange={v => updateForm('prize_title', v)} placeholder="e.g. Win Your Way to Guam!" />
              <Field label="Prize Card Description" value={form.prize_description} onChange={v => updateForm('prize_description', v)} placeholder="e.g. Compete for a trip package to..." />
              <Field label="ASJJF Registration URL (Gi)" value={form.registration_url_gi} onChange={v => updateForm('registration_url_gi', v)} placeholder="https://asjjf.org/main/eventInfo/..." />
              <Field label="ASJJF Registration URL (No-Gi)" value={form.registration_url_nogi} onChange={v => updateForm('registration_url_nogi', v)} placeholder="https://asjjf.org/main/eventInfo/..." />
              <Field label="ASJJF Registration URL (Legacy)" value={form.registration_url} onChange={v => updateForm('registration_url', v)} placeholder="https://asjjf.org/events/..." />
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">ASJJF Event IDs (for results import)</label>
                <input
                  key={`${editing}-${form.asjjf_event_ids.join(',')}`}
                  defaultValue={form.asjjf_event_ids.join(', ')}
                  onBlur={e => {
                    const ids = e.target.value.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0)
                    updateForm('asjjf_event_ids', ids)
                  }}
                  placeholder="1863, 1864 (comma-separated)"
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                />
                <p className="text-[10px] text-text-muted mt-1">Numeric IDs from asjjf.org event URLs. Gi and No-Gi are separate IDs.</p>
              </div>
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
                      onChange={e => {
                        const checked = e.target.checked;
                        updateForm('live_stream_active', checked);
                        if (checked && !form.live_stream_url) {
                          updateForm('live_stream_url', DEFAULT_LIVE_STREAM_URL);
                        }
                      }}
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

            {/* Event Gallery (only when editing existing event) */}
            {typeof editing === 'number' && (
              <EventGallerySection eventId={editing} eventName={form.name || 'Event'} />
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

            <div className="border border-white/5">
              <button
                type="button"
                onClick={() => toggleSection('detailContent')}
                className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-text-primary hover:bg-white/[0.02] transition-colors"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-text-muted" />
                  Event Page Content
                </span>
                {expandedSections.detailContent ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedSections.detailContent && (
                <div className="p-4 border-t border-white/5 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field
                      label="Tagline"
                      value={form.tagline}
                      onChange={v => updateForm('tagline', v)}
                      placeholder="The Grand Championship"
                    />
                    <div>
                      <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Schedule Note</label>
                      <textarea
                        value={form.schedule_note}
                        onChange={e => updateForm('schedule_note', e.target.value)}
                        rows={3}
                        className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none resize-none"
                        placeholder="Official match schedule provided by the organizer..."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Travel Description</label>
                      <textarea
                        value={form.travel_description}
                        onChange={e => updateForm('travel_description', e.target.value)}
                        rows={3}
                        className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none resize-none"
                        placeholder="Helpful travel context for this specific event."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Visa Description</label>
                      <textarea
                        value={form.visa_description}
                        onChange={e => updateForm('visa_description', e.target.value)}
                        rows={3}
                        className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none resize-none"
                        placeholder="Visa or entry guidance for this event."
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-heading text-sm font-semibold text-text-primary">Venue Highlights</h3>
                      <button onClick={addVenueHighlight} className="flex items-center gap-1.5 text-xs text-gold hover:text-gold/80">
                        <Plus className="w-3 h-3" /> Add Highlight
                      </button>
                    </div>
                    {form.venue_highlights.map((item, idx) => (
                      <div key={`venue-${idx}`} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-3 items-start">
                        <input
                          value={item.title}
                          onChange={e => updateVenueHighlight(idx, 'title', e.target.value)}
                          placeholder="Highlight title"
                          className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                        />
                        <input
                          value={item.description}
                          onChange={e => updateVenueHighlight(idx, 'description', e.target.value)}
                          placeholder="Highlight description"
                          className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                        />
                        <button onClick={() => removeVenueHighlight(idx)} className="p-2 text-text-muted hover:text-red-400">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-heading text-sm font-semibold text-text-primary">Registration Steps</h3>
                      <button onClick={addRegistrationStep} className="flex items-center gap-1.5 text-xs text-gold hover:text-gold/80">
                        <Plus className="w-3 h-3" /> Add Step
                      </button>
                    </div>
                    {form.registration_steps.map((item, idx) => (
                      <div key={`registration-${idx}`} className="grid grid-cols-1 md:grid-cols-2 gap-3 border border-white/5 p-3">
                        <input
                          value={item.title || ''}
                          onChange={e => updateRegistrationStep(idx, 'title', e.target.value)}
                          placeholder="Step title"
                          className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                        />
                        <input
                          value={item.link_label || ''}
                          onChange={e => updateRegistrationStep(idx, 'link_label', e.target.value)}
                          placeholder="Optional link label"
                          className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                        />
                        <div className="md:col-span-2">
                          <textarea
                            value={item.description}
                            onChange={e => updateRegistrationStep(idx, 'description', e.target.value)}
                            rows={2}
                            placeholder="Step description"
                            className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none resize-none"
                          />
                        </div>
                        <input
                          value={item.url || ''}
                          onChange={e => updateRegistrationStep(idx, 'url', e.target.value)}
                          placeholder="Optional URL"
                          className="md:col-span-2 w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                        />
                        <button onClick={() => removeRegistrationStep(idx)} className="justify-self-start p-2 text-text-muted hover:text-red-400">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-heading text-sm font-semibold text-text-primary">Registration Fee Tables</h3>
                      <button onClick={addRegistrationFeeSection} className="flex items-center gap-1.5 text-xs text-gold hover:text-gold/80">
                        <Plus className="w-3 h-3" /> Add Table
                      </button>
                    </div>
                    {form.registration_fee_sections.map((section, sectionIdx) => (
                      <div key={`fee-section-${sectionIdx}`} className="border border-white/5 p-3 space-y-3">
                        <div className="flex items-start gap-3">
                          <input
                            value={section.title}
                            onChange={e => updateRegistrationFeeSection(sectionIdx, 'title', e.target.value)}
                            placeholder="Table title"
                            className="flex-1 bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                          />
                          <button onClick={() => removeRegistrationFeeSection(sectionIdx)} className="p-2 text-text-muted hover:text-red-400">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-2">
                          {section.rows.map((row, rowIdx) => (
                            <div key={`fee-row-${sectionIdx}-${rowIdx}`} className="grid grid-cols-1 md:grid-cols-[1.4fr_0.9fr_1fr_auto] gap-3 items-start">
                              <input
                                value={row.deadline}
                                onChange={e => updateRegistrationFeeRow(sectionIdx, rowIdx, 'deadline', e.target.value)}
                                placeholder="Deadline"
                                className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                              />
                              <input
                                value={row.fee}
                                onChange={e => updateRegistrationFeeRow(sectionIdx, rowIdx, 'fee', e.target.value)}
                                placeholder="Fee"
                                className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                              />
                              <input
                                value={row.option}
                                onChange={e => updateRegistrationFeeRow(sectionIdx, rowIdx, 'option', e.target.value)}
                                placeholder="Division option"
                                className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                              />
                              <button onClick={() => removeRegistrationFeeRow(sectionIdx, rowIdx)} className="p-2 text-text-muted hover:text-red-400">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => addRegistrationFeeRow(sectionIdx)} className="flex items-center gap-1.5 text-xs text-gold hover:text-gold/80">
                          <Plus className="w-3 h-3" /> Add Row
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-heading text-sm font-semibold text-text-primary">Registration Info</h3>
                      <button onClick={addRegistrationInfoItem} className="flex items-center gap-1.5 text-xs text-gold hover:text-gold/80">
                        <Plus className="w-3 h-3" /> Add Item
                      </button>
                    </div>
                    {form.registration_info_items.map((item, idx) => (
                      <div key={`registration-info-${idx}`} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-3 items-start">
                        <input
                          value={item.label}
                          onChange={e => updateRegistrationInfoItem(idx, 'label', e.target.value)}
                          placeholder="Label"
                          className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                        />
                        <textarea
                          value={item.value}
                          onChange={e => updateRegistrationInfoItem(idx, 'value', e.target.value)}
                          rows={2}
                          placeholder="Value"
                          className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none resize-none"
                        />
                        <button onClick={() => removeRegistrationInfoItem(idx)} className="p-2 text-text-muted hover:text-red-400">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-heading text-sm font-semibold text-text-primary">Travel Cards</h3>
                      <button onClick={addTravelItem} className="flex items-center gap-1.5 text-xs text-gold hover:text-gold/80">
                        <Plus className="w-3 h-3" /> Add Card
                      </button>
                    </div>
                    {form.travel_items.map((item, idx) => (
                      <div key={`travel-${idx}`} className="grid grid-cols-1 md:grid-cols-2 gap-3 border border-white/5 p-3">
                        <input
                          value={item.title}
                          onChange={e => updateTravelItem(idx, 'title', e.target.value)}
                          placeholder="Card title"
                          className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                        />
                        <input
                          value={item.value || ''}
                          onChange={e => updateTravelItem(idx, 'value', e.target.value)}
                          placeholder="Optional value"
                          className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                        />
                        <div className="md:col-span-2">
                          <textarea
                            value={item.description}
                            onChange={e => updateTravelItem(idx, 'description', e.target.value)}
                            rows={2}
                            placeholder="Card description"
                            className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none resize-none"
                          />
                        </div>
                        <input
                          value={item.url || ''}
                          onChange={e => updateTravelItem(idx, 'url', e.target.value)}
                          placeholder="Optional URL"
                          className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                        />
                        <input
                          value={item.link_label || ''}
                          onChange={e => updateTravelItem(idx, 'link_label', e.target.value)}
                          placeholder="Optional link label"
                          className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                        />
                        <button onClick={() => removeTravelItem(idx)} className="justify-self-start p-2 text-text-muted hover:text-red-400">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-heading text-sm font-semibold text-text-primary">Visa Items</h3>
                      <button onClick={addVisaItem} className="flex items-center gap-1.5 text-xs text-gold hover:text-gold/80">
                        <Plus className="w-3 h-3" /> Add Visa Item
                      </button>
                    </div>
                    {form.visa_items.map((item, idx) => (
                      <div key={`visa-${idx}`} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-3 items-start">
                        <input
                          value={item.title}
                          onChange={e => updateVisaItem(idx, 'title', e.target.value)}
                          placeholder="Visa item title"
                          className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                        />
                        <textarea
                          value={item.description}
                          onChange={e => updateVisaItem(idx, 'description', e.target.value)}
                          rows={2}
                          placeholder="Visa item description"
                          className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none resize-none"
                        />
                        <button onClick={() => removeVisaItem(idx)} className="p-2 text-text-muted hover:text-red-400">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Hero Image */}
            {(() => {
              const heroUrl = typeof editing === 'number'
                ? resolveMediaUrl(currentEvent?.hero_image_url) || null
                : pendingHeroPreviewUrl

              const handleHeroFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0]
                if (!file) return
                if (typeof editing === 'number') {
                  await handleImageUpload(file)
                } else {
                  setPendingHeroImage(file)
                }
              }

              return (
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">Hero Image</label>
                    <input ref={heroInputRef} type="file" accept="image/*" onChange={handleHeroFileChange} className="hidden" />
                    <button
                      type="button"
                      onClick={() => heroInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-text-secondary rounded transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {heroUrl ? 'Change Image' : 'Upload Image'}
                    </button>
                    {pendingHeroImage && (
                      <button
                        type="button"
                        onClick={() => setPendingHeroImage(null)}
                        className="text-text-muted hover:text-red-400 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {heroUrl && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Eye className="w-3.5 h-3.5 text-text-muted" />
                        <span className="text-[10px] text-text-muted uppercase tracking-wide">Site Preview — how it appears on the event page hero</span>
                      </div>
                      <div className="relative overflow-hidden border border-white/10 rounded aspect-[16/6]">
                        <img src={heroUrl} alt="Hero preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-navy-900/75" />
                        <div className="absolute inset-0 bg-linear-to-t from-navy-900 via-navy-900/50 to-transparent" />
                        <div className="absolute bottom-3 left-4 right-4 z-10">
                          <div className="text-gold-500 text-[10px] font-heading uppercase tracking-wider mb-1">
                            {form.asjjf_stars > 0 ? `${'★'.repeat(form.asjjf_stars)} ASJJF ${form.asjjf_stars}-STAR RANKED EVENT` : ''}
                          </div>
                          <div className="text-white font-heading font-black text-sm sm:text-base uppercase leading-tight">
                            {form.name || 'Event Name'}
                          </div>
                          {form.tagline && (
                            <div className="text-text-secondary text-[10px] font-heading uppercase tracking-wider mt-1">{form.tagline}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Poster Image (for Calendar qualifying series) */}
            {typeof editing === 'number' && (
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">Poster Image</label>
                  <input ref={posterInputRef} type="file" accept="image/*" onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file || typeof editing !== 'number') return
                    try {
                      await api.admin.uploadEventPoster(editing, file)
                      await loadEvents()
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Poster upload failed')
                    }
                  }} className="hidden" />
                  <button
                    type="button"
                    onClick={() => posterInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-text-secondary rounded transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {currentEvent?.poster_image_url ? 'Change Poster' : 'Upload Poster'}
                  </button>
                  {currentEvent?.poster_image_url && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (typeof editing !== 'number') return
                        try {
                          await api.admin.removeEventPoster(editing)
                          await loadEvents()
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Failed to remove poster')
                        }
                      }}
                      className="text-text-muted hover:text-red-400 transition-colors text-xs"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-text-muted">Promotional poster shown in the "Qualifying Series" section on the Calendar page.</p>
                {currentEvent?.poster_image_url && (
                  <div className="w-32 aspect-[3/4] border border-white/10 overflow-hidden">
                    <img src={resolveMediaUrl(currentEvent.poster_image_url) || ''} alt="Poster" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
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
                      <div key={idx} className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-start">
                        <input
                          value={item.time}
                          onChange={e => updateScheduleItem(idx, 'time', e.target.value)}
                          placeholder="9:00 AM"
                          className="w-full sm:w-44 sm:shrink-0 bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                        />
                        <div className="flex gap-2 sm:gap-3 flex-1 items-start">
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
                      <div key={idx} className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-start">
                        <input
                          value={item.name}
                          onChange={e => updatePrizeCategory(idx, 'name', e.target.value)}
                          placeholder="Category name"
                          className="flex-1 bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                        />
                        <div className="flex gap-2 sm:gap-3 items-start">
                          <input
                            value={item.amount}
                            onChange={e => updatePrizeCategory(idx, 'amount', e.target.value)}
                            placeholder="Amount (0 if non-cash)"
                            className="w-full sm:w-28 bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                          />
                          <button onClick={() => removePrizeCategory(idx)} className="p-1.5 text-text-muted hover:text-red-400">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gold/10 text-gold text-sm font-medium hover:bg-gold/15 transition-colors disabled:opacity-50"
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
        <div className="bg-surface border border-white/5 overflow-hidden">
          {/* Search + Filter Bar */}
          <div className="px-4 py-3 border-b border-white/5 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search events..."
                className="w-full bg-white/[0.03] border border-white/10 pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none"
            >
              <option value="all">All statuses ({events.length})</option>
              {Object.entries(statusCounts).sort().map(([status, count]) => (
                <option key={status} value={status}>{status} ({count})</option>
              ))}
            </select>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="p-8 text-center text-text-muted text-sm">
              {events.length === 0 ? 'No events yet. Create your first event.' : 'No events match your filters.'}
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="border-b border-white/5 text-left">
                      {([['name', 'Name'], ['date', 'Date'], ['location', 'Location'], ['stars', 'Stars'], ['status', 'Status']] as [SortField, string][]).map(([field, label]) => (
                        <th
                          key={field}
                          onClick={() => toggleSort(field)}
                          className="px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wide cursor-pointer hover:text-text-secondary select-none transition-colors"
                        >
                          <span className="inline-flex items-center gap-1">
                            {label}
                            {sortField === field ? (
                              sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-30" />
                            )}
                          </span>
                        </th>
                      ))}
                  <th className="px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wide w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                    {filteredEvents.map(event => (
                  <tr key={event.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 text-text-primary font-medium">{event.name}</td>
                        <td className="px-5 py-3 text-text-secondary whitespace-nowrap">{formatDate(event.date)}</td>
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
                            event.status === 'live' ? 'bg-red-500/10 text-red-400 animate-pulse' :
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
                          onClick={() => handleClone(event.id)}
                          className="p-1.5 text-text-muted hover:text-blue-400 transition-colors"
                              title="Clone Event"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
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
              </div>

              <div className="md:hidden divide-y divide-white/5">
                {filteredEvents.map(event => (
                  <div key={event.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm text-text-primary font-medium">{event.name}</div>
                        <div className="text-xs text-text-secondary mt-1">{formatDate(event.date)}</div>
                        <div className="text-xs text-text-muted mt-1">{event.city}, {event.country}</div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 shrink-0 ${
                        event.status === 'upcoming' ? 'bg-gold/10 text-gold' :
                        event.status === 'live' ? 'bg-red-500/10 text-red-400 animate-pulse' :
                        event.status === 'completed' ? 'bg-blue-500/10 text-blue-400' :
                        event.status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                        'bg-white/5 text-text-muted'
                      }`}>
                        {event.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-gold text-xs">
                        <Star className="w-3 h-3 fill-current" />
                        {event.asjjf_stars || 0} stars
                      </span>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/admin/events/${event.id}/results`}
                          className="p-1.5 text-text-muted hover:text-gold transition-colors"
                          title="Manage Results"
                        >
                          <Trophy className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleClone(event.id)}
                          className="p-1.5 text-text-muted hover:text-blue-400 transition-colors"
                          title="Clone Event"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
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
                    </div>
                  </div>
                ))}
              </div>
            </>
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
  const [error, setError] = useState('')
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accommodations')
    } finally { setLoading(false) }
  }, [eventId])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
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
    } finally { setSaving(false) }
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

      {error && (
        <div className="mx-4 mb-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2">{error}</div>
      )}

      {loading ? (
        <div className="p-4 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto text-text-muted" /></div>
      ) : (
        <div className="border-t border-white/5">
          {accommodations.map(a => (
            <div key={a.id} className="px-4 py-3 flex items-center justify-between border-b border-white/5 last:border-0">
              <div className="flex items-center gap-3">
                {a.image_url && (
                  <img src={resolveMediaUrl(a.image_url) || ''} alt={a.hotel_name} className="w-12 h-12 object-cover rounded" />
                )}
                <div>
                  <div className="text-sm text-text-primary font-medium">{a.hotel_name}</div>
                  <div className="text-xs text-text-muted">{a.check_in_date && a.check_out_date ? `${formatDate(a.check_in_date)} — ${formatDate(a.check_out_date)}` : 'No dates set'}</div>
                </div>
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
              {typeof editing === 'number' && (
                <ImageUpload
                  currentUrl={resolveMediaUrl(accommodations.find(a => a.id === editing)?.image_url) || null}
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

const GALLERY_ADMIN_PER_PAGE = 100
type GalleryDeleteConfirm =
  | { type: 'single'; id: number; title: string }
  | { type: 'bulk'; ids: number[] }

function EventGallerySection({ eventId, eventName }: { eventId: number; eventName: string }) {
  const [galleryImages, setGalleryImages] = useState<EventGalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [uploadCaption, setUploadCaption] = useState('')
  const [uploadActive, setUploadActive] = useState(true)
  const [galleryDeleteConfirm, setGalleryDeleteConfirm] = useState<GalleryDeleteConfirm | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [form, setForm] = useState<EventGalleryImageFormData>({
    title: '',
    alt_text: '',
    caption: '',
    sort_order: 0,
    active: true,
  })
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { tasks, startUpload } = useGalleryUploads()
  const completedForEvent = tasks.filter(task => task.eventId === eventId && task.status === 'complete').length
  const visibleImageIds = useMemo(() => galleryImages.map(image => image.id), [galleryImages])
  const allVisibleSelected = visibleImageIds.length > 0 && visibleImageIds.every(id => selectedIds.includes(id))

  const load = useCallback(async () => {
    try {
      const res = await api.admin.getEventGalleryImages(eventId, { page, per_page: GALLERY_ADMIN_PER_PAGE })
      const lastPage = Math.max(1, Math.ceil(res.total / GALLERY_ADMIN_PER_PAGE))
      if (page > lastPage) {
        setGalleryImages([])
        setTotal(res.total)
        setPage(lastPage)
        return
      }
      setGalleryImages(res.gallery_images)
      setTotal(res.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load gallery')
    } finally {
      setLoading(false)
    }
  }, [eventId, page])

  useEffect(() => { load() }, [load])
  useEffect(() => { setSelectedIds([]) }, [eventId, page])
  useEffect(() => {
    if (completedForEvent === 0) return undefined
    const refreshTimer = window.setTimeout(() => {
      void load()
    }, 750)
    return () => window.clearTimeout(refreshTimer)
  }, [completedForEvent, load])

  const resetForm = () => {
    setForm({
      title: '',
      alt_text: '',
      caption: '',
      sort_order: galleryImages.length,
      active: true,
    })
    setPendingFile(null)
  }

  const editGalleryImage = (image: EventGalleryImage) => {
    setForm({
      title: image.title || '',
      alt_text: image.alt_text || '',
      caption: image.caption || '',
      sort_order: image.sort_order,
      active: image.active,
    })
    setPendingFile(null)
    setEditing(image.id)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editing === 'new') {
        if (!pendingFile) return
        const formData = new FormData()
        formData.append('title', form.title)
        formData.append('alt_text', form.alt_text)
        formData.append('caption', form.caption)
        formData.append('sort_order', String(form.sort_order))
        formData.append('active', String(form.active))
        formData.append('image', pendingFile)
        await api.admin.createEventGalleryImage(eventId, formData)
      } else if (typeof editing === 'number') {
        await api.admin.updateEventGalleryImage(eventId, editing, form)
        if (pendingFile) {
          await api.admin.uploadEventGalleryImage(eventId, editing, pendingFile)
        }
      }
      setEditing(null)
      setPendingFile(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save gallery image')
    } finally {
      setSaving(false)
    }
  }

  const handleFiles = async (fileList: FileList | File[]) => {
    const selectedFiles = Array.from(fileList)
    const files = selectedFiles.filter(isSupportedGalleryImage)
    if (files.length === 0) {
      setError(`Choose JPEG, PNG, WebP, GIF, HEIC, or HEIF images under ${Math.round(GALLERY_IMAGE_MAX_BYTES / 1024 / 1024)} MB`)
      return
    }
    if (files.length < selectedFiles.length) {
      setError(`Skipped ${selectedFiles.length - files.length} unsupported or oversized file${selectedFiles.length - files.length === 1 ? '' : 's'}`)
    } else {
      setError('')
    }

    setSuccess('')
    try {
      await startUpload({
        eventId,
        eventName,
        files,
        active: uploadActive,
        caption: uploadCaption,
        startSortOrder: total,
      })
      setSuccess(`Queued ${files.length} image${files.length === 1 ? '' : 's'} for upload`)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to queue gallery uploads')
    }
  }

  const toggleSelected = (id: number) => {
    setSelectedIds(current => current.includes(id) ? current.filter(x => x !== id) : [...current, id])
  }

  const toggleVisibleSelection = () => {
    setSelectedIds(current => {
      if (allVisibleSelected) {
        return current.filter(id => !visibleImageIds.includes(id))
      }
      return Array.from(new Set([...current, ...visibleImageIds]))
    })
  }

  const dragHasFiles = (event: DragEvent<HTMLDivElement>) => Array.from(event.dataTransfer.types).includes('Files')

  const handleGalleryDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!dragHasFiles(event)) return
    event.preventDefault()
    setDragActive(true)
  }

  const handleGalleryDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!dragHasFiles(event)) return
    event.preventDefault()
    setDragActive(true)
  }

  const handleGalleryDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
    setDragActive(false)
  }

  const handleGalleryDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!dragHasFiles(event)) return
    event.preventDefault()
    setDragActive(false)
    void handleFiles(event.dataTransfer.files)
  }

  const handleBulkActive = async (active: boolean) => {
    if (selectedIds.length === 0) return
    setError('')
    try {
      await api.admin.bulkUpdateEventGalleryImages(eventId, selectedIds, { active })
      setSelectedIds([])
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk update failed')
    }
  }

  const requestBulkDelete = () => {
    if (selectedIds.length === 0) return
    setGalleryDeleteConfirm({ type: 'bulk', ids: [...selectedIds] })
  }

  const requestDelete = (image: EventGalleryImage) => {
    setGalleryDeleteConfirm({ type: 'single', id: image.id, title: image.title || image.original_filename || 'Untitled image' })
  }

  const handleConfirmGalleryDelete = () => {
    const pendingDelete = galleryDeleteConfirm
    if (!pendingDelete) return

    setGalleryDeleteConfirm(null)
    if (pendingDelete.type === 'bulk') {
      void handleBulkDelete(pendingDelete.ids)
      return
    }

    void handleDelete(pendingDelete.id)
  }

  const handleBulkDelete = async (idsToDelete: number[]) => {
    if (idsToDelete.length === 0) return
    setError('')
    const previousImages = galleryImages
    const previousTotal = total

    setGalleryImages(current => current.filter(image => !idsToDelete.includes(image.id)))
    setTotal(current => Math.max(0, current - idsToDelete.length))
    setSelectedIds([])
    try {
      await api.admin.bulkDeleteEventGalleryImages(eventId, idsToDelete)
    } catch (err) {
      setGalleryImages(previousImages)
      setTotal(previousTotal)
      setSelectedIds(idsToDelete)
      setError(err instanceof Error ? err.message : 'Bulk delete failed')
      return
    }

    try {
      await load()
    } catch (err) {
      setError(err instanceof Error ? `Deleted, but failed to refresh gallery: ${err.message}` : 'Deleted, but failed to refresh gallery')
    }
  }

  const handleDelete = async (id: number) => {
    setError('')
    const previousImages = galleryImages
    const previousTotal = total
    const previousSelectedIds = selectedIds
    const previousEditing = editing
    const previousPendingFile = pendingFile

    setGalleryImages(current => current.filter(image => image.id !== id))
    setTotal(current => Math.max(0, current - 1))
    setSelectedIds(current => current.filter(selectedId => selectedId !== id))
    if (editing === id) {
      setEditing(null)
      setPendingFile(null)
    }

    try {
      await api.admin.deleteEventGalleryImage(eventId, id)
    } catch (err) {
      setGalleryImages(previousImages)
      setTotal(previousTotal)
      setSelectedIds(previousSelectedIds)
      setEditing(previousEditing)
      setPendingFile(previousPendingFile)
      setError(err instanceof Error ? err.message : 'Failed to delete gallery image')
      return
    }

    try {
      await load()
    } catch (err) {
      setError(err instanceof Error ? `Deleted, but failed to refresh gallery: ${err.message}` : 'Deleted, but failed to refresh gallery')
    }
  }

  return (
    <>
    <div
      className={`relative border transition-colors ${dragActive ? 'border-gold/60 bg-gold/5' : 'border-white/5'}`}
      onDragEnter={handleGalleryDragEnter}
      onDragOver={handleGalleryDragOver}
      onDragLeave={handleGalleryDragLeave}
      onDrop={handleGalleryDrop}
    >
      {dragActive && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center border-2 border-dashed border-gold/70 bg-navy-950/70">
          <div className="bg-navy-900 border border-gold/30 px-5 py-3 text-sm font-medium text-gold">
            Drop photos to upload
          </div>
        </div>
      )}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 text-sm font-medium text-text-primary">
            <ImageIcon className="w-4 h-4 text-text-muted" />
            Event Gallery ({total})
          </span>
          {galleryImages.length > 0 && (
            <button onClick={toggleVisibleSelection} className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-gold">
              {allVisibleSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              {allVisibleSelected ? 'Clear visible' : 'Select all visible'}
            </button>
          )}
        </div>
        {editing === null && (
          <button
            onClick={() => {
              resetForm()
              setEditing('new')
            }}
            className="flex items-center gap-1.5 text-xs text-gold hover:text-gold/80"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        )}
      </div>

      {error && (
        <div className="mx-4 mb-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2">{error}</div>
      )}
      {success && (
        <div className="mx-4 mb-2 text-sm text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-2">{success}</div>
      )}

      <div className="mx-4 mb-4 grid gap-3 lg:grid-cols-[1fr_280px]">
        <div
          className={`border border-dashed p-5 transition-colors ${dragActive ? 'border-gold bg-gold/10' : 'border-white/10 bg-white/[0.02]'}`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-11 h-11 bg-gold/10 text-gold flex items-center justify-center shrink-0">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-text-primary">Bulk upload tournament photos</div>
              <div className="text-xs text-text-muted mt-1">Drop a folder selection or choose many images. Uploads continue while you move around admin.</div>
            </div>
            <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gold text-navy-900 text-xs font-heading font-semibold uppercase tracking-wider hover:bg-gold-400">
              <Upload className="w-3.5 h-3.5" /> Choose Photos
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={GALLERY_IMAGE_ACCEPT}
            multiple
            onChange={e => { if (e.target.files) void handleFiles(e.target.files) }}
            className="hidden"
          />
        </div>
        <div className="border border-white/5 bg-white/[0.01] p-3 space-y-3">
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input type="checkbox" checked={uploadActive} onChange={e => setUploadActive(e.target.checked)} className="accent-gold" />
            Active after upload
          </label>
          <div>
            <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Default Caption</label>
            <input value={uploadCaption} onChange={e => setUploadCaption(e.target.value)} placeholder="Optional shared caption" className="w-full bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-4 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto text-text-muted" /></div>
      ) : (
        <div className="border-t border-white/5">
          {selectedIds.length > 0 && (
            <div className="p-3 border-b border-white/5 bg-white/[0.02] flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-text-secondary">{selectedIds.length} selected</div>
              <div className="flex items-center gap-2">
                <button onClick={() => void handleBulkActive(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-green-400 bg-green-500/10 hover:bg-green-500/15"><Eye className="w-3 h-3" /> Show</button>
                <button onClick={() => void handleBulkActive(false)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-muted bg-white/5 hover:text-text-primary"><EyeOff className="w-3 h-3" /> Hide</button>
                <button onClick={requestBulkDelete} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 bg-red-500/10 hover:bg-red-500/15"><Trash2 className="w-3 h-3" /> Delete</button>
              </div>
            </div>
          )}
          {galleryImages.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border-b border-white/5">
              {galleryImages.map(image => (
                <div key={image.id} className="border border-white/5 bg-white/[0.01]">
                  <div className="aspect-[16/9] bg-white/[0.02] overflow-hidden">
                    {resolveMediaUrl(image.thumbnail_url || image.image_url) ? (
                      <img
                        src={resolveMediaUrl(image.thumbnail_url || image.image_url) || undefined}
                        alt={image.alt_text || image.title || 'Gallery image'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-text-muted/40" />
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex items-start justify-between gap-3">
                    <button onClick={() => toggleSelected(image.id)} className="mt-0.5 text-text-muted hover:text-gold" aria-label={selectedIds.includes(image.id) ? 'Deselect image' : 'Select image'}>
                      {selectedIds.includes(image.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-text-primary font-medium truncate">{image.title || 'Untitled image'}</div>
                      <div className="text-xs text-text-muted truncate">
                        Sort #{image.sort_order} · {image.status}{image.caption ? ` · ${image.caption}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-1.5 py-0.5 ${image.active ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-text-muted'}`}>
                        {image.active ? 'Active' : 'Hidden'}
                      </span>
                      <button onClick={() => editGalleryImage(image)} className="p-1 text-text-muted hover:text-text-primary"><Pencil className="w-3 h-3" /></button>
                      <button onClick={() => requestDelete(image)} className="p-1 text-text-muted hover:text-red-400" aria-label="Delete gallery image"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {editing !== null && (
            <div className="p-4 space-y-3 bg-white/[0.01]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Title</label>
                  <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="w-full bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary focus:border-gold/40 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Alt Text</label>
                  <input value={form.alt_text} onChange={e => setForm(p => ({ ...p, alt_text: e.target.value }))} placeholder="Describe the image" className="w-full bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Caption</label>
                  <input value={form.caption} onChange={e => setForm(p => ({ ...p, caption: e.target.value }))} className="w-full bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary focus:border-gold/40 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Sort Order</label>
                  <input type="number" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: parseInt(e.target.value, 10) || 0 }))} className="w-full bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary focus:border-gold/40 focus:outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">
                    {editing === 'new' ? 'Image File *' : 'Replace Image'}
                  </label>
                  <input
                    type="file"
                    accept={GALLERY_IMAGE_ACCEPT}
                    onChange={e => {
                      const file = e.target.files?.[0] || null
                      if (file && !isSupportedGalleryImage(file)) {
                        setError(`Choose a supported image under ${Math.round(GALLERY_IMAGE_MAX_BYTES / 1024 / 1024)} MB`)
                        setPendingFile(null)
                        e.target.value = ''
                        return
                      }
                      setPendingFile(file)
                    }}
                    className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary file:mr-3 file:border-0 file:bg-gold/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-gold"
                  />
                  {pendingFile && (
                    <div className="mt-1 text-xs text-text-muted">{pendingFile.name}</div>
                  )}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} className="accent-gold" />
                Active (visible on public site)
              </label>
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving || (editing === 'new' && !pendingFile)} className="flex items-center gap-1.5 px-4 py-1.5 bg-gold/10 text-gold text-xs font-medium hover:bg-gold/15 disabled:opacity-50">
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => { setEditing(null); setPendingFile(null) }} className="px-4 py-1.5 text-text-muted text-xs hover:text-text-primary">Cancel</button>
              </div>
            </div>
          )}

          {galleryImages.length === 0 && editing === null && (
            <div className="p-4 text-center text-text-muted text-xs">No gallery images yet.</div>
          )}
          {total > 100 && (
            <div className="p-4 flex items-center justify-center gap-2 border-t border-white/5">
              <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-1.5 text-xs text-text-secondary bg-white/5 disabled:opacity-40">Previous</button>
              <span className="text-xs text-text-muted">Page {page} of {Math.ceil(total / GALLERY_ADMIN_PER_PAGE)}</span>
              <button disabled={page >= Math.ceil(total / GALLERY_ADMIN_PER_PAGE)} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-xs text-text-secondary bg-white/5 disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
      )}
    </div>
    <AnimatePresence>
      {galleryDeleteConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setGalleryDeleteConfirm(null)}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            className="w-full max-w-sm border border-white/10 bg-navy-900 p-5 shadow-xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center bg-red-500/10 text-red-400">
              <Trash2 className="h-5 w-5" />
            </div>
            <h3 className="text-center text-lg font-semibold text-text-primary">
              {galleryDeleteConfirm.type === 'bulk' ? `Delete ${galleryDeleteConfirm.ids.length} photos?` : 'Delete this photo?'}
            </h3>
            <p className="mt-2 text-center text-sm text-text-secondary">
              {galleryDeleteConfirm.type === 'bulk'
                ? 'These gallery photos will be removed from the event and public gallery.'
                : `"${galleryDeleteConfirm.title}" will be removed from the event and public gallery.`}
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button onClick={() => setGalleryDeleteConfirm(null)} className="px-4 py-2 text-sm text-text-muted hover:text-text-primary">
                Cancel
              </button>
              <button onClick={handleConfirmGalleryDelete} className="px-4 py-2 text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20">
                Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
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
