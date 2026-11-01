import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import {
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Star,
  Clock,
  Trophy,
  Save,
  ChevronDown,
  ChevronUp,
  Radio,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Upload,
  Languages,
  RefreshCw,
  Copy,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { api } from '../../services/api'
import type { Event, EventFormData, EventScheduleItem, PrizeCategory } from '../../services/api'
import AccommodationsSection from '../../components/admin/event-editor/AccommodationsSection'
import EventGallerySection from '../../components/admin/event-editor/EventGallerySection'
import { Field } from '../../components/admin/event-editor/EditorFields'
import { ResultsSyncBadge } from '../../components/admin/ResultsSyncCard'
import { resolveMediaUrl } from '../../utils/images'
import { formatDate } from '../../utils/dates'
import { useEditingParam } from '../../hooks/useEditingParam'
import EventContentFields from '../../components/admin/event-editor/EventContentFields'
import TicketsSection from '../../components/admin/event-editor/TicketsSection'
import EditorNavigation from '../../components/admin/event-editor/EditorNavigation'
import PublishingSection from '../../components/admin/event-editor/PublishingSection'
import RolloverDialog from '../../components/admin/event-editor/RolloverDialog'
import {
  editorSections,
  formSnapshot,
  validateEventForm,
  type EditorSection,
  type SectionErrors,
} from '../../components/admin/event-editor/editorState'
import { discardMessage, useDirtyNavigation } from '../../components/admin/event-editor/useDirtyNavigation'
import '../../components/admin/event-editor/editor.css'

type SortField = 'name' | 'date' | 'location' | 'stars' | 'status'
type SortDir = 'asc' | 'desc'

const DEFAULT_LIVE_STREAM_URL = 'https://www.youtube.com/@themarianasopen/live'

const emptyForm: EventFormData = {
  season_year: null,
  registration_not_open: false,
  content_review_required: false,
  name: '',
  slug: '',
  description: '',
  date: '',
  end_date: '',
  venue_name: '',
  venue_address: '',
  city: '',
  country: '',
  country_code: '',
  asjjf_stars: null,
  is_main_event: false,
  prize_pool: '',
  prize_title: '',
  prize_description: '',
  registration_url: '',
  registration_url_gi: '',
  registration_url_nogi: '',
  ticket_sales_status: 'unavailable',
  ticket_sales_url: '',
  ticket_early_bird_ends_on: '',
  ticket_options: [],
  ticket_in_person_name: '',
  ticket_in_person_phone: '',
  ticket_in_person_address: '',
  status: 'draft',
  latitude: '',
  longitude: '',
  live_stream_url: '',
  live_stream_active: false,
  tagline: '',
  schedule_note: '',
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
    season_year: e.season_year ?? null,
    registration_not_open: e.registration_not_open ?? false,
    content_review_required: e.content_review_required ?? false,
    name: e.name,
    slug: e.slug,
    description: e.description || '',
    date: e.date || '',
    end_date: e.end_date || '',
    venue_name: e.venue_name || '',
    venue_address: e.venue_address || '',
    city: e.city || '',
    country: e.country || '',
    country_code: e.country_code || '',
    asjjf_stars: e.asjjf_stars ?? null,
    is_main_event: e.is_main_event || false,
    prize_pool: e.prize_pool || '',
    prize_title: e.prize_title || '',
    prize_description: e.prize_description || '',
    registration_url: e.registration_url || '',
    registration_url_gi: e.registration_url_gi || '',
    registration_url_nogi: e.registration_url_nogi || '',
    ticket_sales_status: e.ticket_sales_status || 'unavailable',
    ticket_sales_url: e.ticket_sales_url || '',
    ticket_early_bird_ends_on: e.ticket_early_bird_ends_on || '',
    ticket_options: e.ticket_options || [],
    ticket_in_person_name: e.ticket_in_person_name || '',
    ticket_in_person_phone: e.ticket_in_person_phone || '',
    ticket_in_person_address: e.ticket_in_person_address || '',
    status: e.status || 'draft',
    latitude: e.latitude?.toString() || '',
    longitude: e.longitude?.toString() || '',
    live_stream_url: e.live_stream_url || '',
    live_stream_active: e.live_stream_active || false,
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
    event_schedule_items_attributes: e.event_schedule_items.map((s) => ({
      id: s.id,
      confirmed: s.confirmed ?? true,
      time: s.time,
      description: s.description,
      sort_order: s.sort_order,
    })),
    prize_categories_attributes: e.prize_categories.map((p) => ({
      id: p.id,
      confirmed: p.confirmed ?? true,
      name: p.name,
      amount: p.amount ?? '',
      sort_order: p.sort_order,
    })),
    translation_status: e.translation_status,
  }
}

export default function EventsAdmin() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditingParam] = useEditingParam()
  const [activeSection, setActiveSection] = useState<EditorSection>('basics')
  const [sectionErrors, setSectionErrors] = useState<SectionErrors>({})
  const [resultIds, setResultIds] = useState('')
  const [resultIdsBaseline, setResultIdsBaseline] = useState('')
  const [baseline, setBaseline] = useState(formSnapshot(emptyForm))
  const initializedEditor = useRef<number | 'new' | null>(null)
  const [rollover, setRollover] = useState<{ eventId?: number } | null>(null)
  const [childDirty, setChildDirty] = useState<Record<string, boolean>>({})

  const [form, setForm] = useState<EventFormData>(emptyForm)
  const [actionBusy, setActionBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    livestream: true,
    schedule: true,
    prizes: true,
  })
  const [pendingHeroImage, setPendingHeroImage] = useState<File | null>(null)
  const dirty =
    editing !== null &&
    (formSnapshot(form) !== baseline || pendingHeroImage !== null || resultIds !== resultIdsBaseline)
  const anyDirty = dirty || Object.values(childDirty).some(Boolean)
  useDirtyNavigation(anyDirty)
  const setEditing = (value: number | 'new' | null) => {
    if (saving || actionBusy) return
    if (value !== editing && anyDirty && !window.confirm(discardMessage)) return
    setEditingParam(value)
    setError('')
  }
  const onHotelDirty = useCallback(
    (value: boolean) => setChildDirty((previous) => ({ ...previous, hotels: value })),
    []
  )
  const onGalleryDirty = useCallback(
    (value: boolean) => setChildDirty((previous) => ({ ...previous, gallery: value })),
    []
  )
  const selectSection = (section: EditorSection) => {
    setExpandedSections((previous) => ({ ...previous, [section]: true }))
    setActiveSection(section)
    setTimeout(() => document.getElementById(`event-section-${section}`)?.focus(), 0)
  }
  const acceptSavedEvent = (event: Event, message: string) => {
    setEvents((previous) => [...previous.filter((item) => item.id !== event.id), event])
    const saved = eventToForm(event)
    setForm(saved)
    setBaseline(formSnapshot(saved))
    setResultIds(saved.asjjf_event_ids.join(', '))
    setResultIdsBaseline(saved.asjjf_event_ids.join(', '))
    setSuccess(message)
  }
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

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  useEffect(() => {
    const ref = pollingGenRef
    return () => {
      ref.current++
    }
  }, [editing])

  useEffect(() => {
    // List refreshes (uploads, translations) must never rehydrate an active draft.
    if (initializedEditor.current === editing) return
    const selected = typeof editing === 'number' ? events.find((event) => event.id === editing) : null
    if (typeof editing === 'number' && !selected) return
    const next = selected ? eventToForm(selected) : emptyForm
    initializedEditor.current = editing
    setForm(next)
    setBaseline(formSnapshot(next))
    setResultIds(next.asjjf_event_ids.join(', '))
    setResultIdsBaseline(next.asjjf_event_ids.join(', '))
    setPendingHeroImage(null)
    setChildDirty({})
    setSectionErrors({})
    setActiveSection('basics')
  }, [editing, events])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir(field === 'date' ? 'desc' : 'asc')
    }
  }

  const filteredEvents = useMemo(() => {
    let result = events

    if (statusFilter !== 'all') {
      result = result.filter((e) => e.status === statusFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.city?.toLowerCase().includes(q) ||
          e.country?.toLowerCase().includes(q) ||
          e.slug.toLowerCase().includes(q)
      )
    }

    const sorted = [...result].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name)
          break
        case 'date':
          cmp = (a.date || '').localeCompare(b.date || '')
          break
        case 'location':
          cmp = `${a.city} ${a.country}`.localeCompare(`${b.city} ${b.country}`)
          break
        case 'stars':
          cmp = (a.asjjf_stars || 0) - (b.asjjf_stars || 0)
          break
        case 'status':
          cmp = (a.status || '').localeCompare(b.status || '')
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return sorted
  }, [events, searchQuery, statusFilter, sortField, sortDir])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    events.forEach((e) => {
      counts[e.status] = (counts[e.status] || 0) + 1
    })
    return counts
  }, [events])

  const handleSave = async () => {
    const payload = {
      ...form,
      asjjf_event_ids: resultIds.trim() ? resultIds.split(',').map((value) => Number(value.trim())) : [],
    }
    const errors = validateEventForm(payload)
    if (resultIds.trim() && !/^\s*\d+(?:\s*,\s*\d+)*\s*$/.test(resultIds))
      errors.results = ['Enter positive ASJJF IDs separated by commas.']
    if (!errors.results && payload.asjjf_event_ids.some((id) => !Number.isSafeInteger(id) || id < 1))
      errors.results = ['Enter positive whole ASJJF IDs.']
    setSectionErrors(errors)
    const first = editorSections.find(([id]) => errors[id]?.length)?.[0]
    if (first) {
      selectSection(first)
      setError('Review the highlighted sections before saving.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const created = editing === 'new'
      if (!created && typeof editing !== 'number') return
      const { event } = created
        ? await api.admin.createEvent(payload)
        : await api.admin.updateEvent(editing as number, payload)
      initializedEditor.current = event.id
      if (created) setEditingParam(event.id)
      acceptSavedEvent(event, created ? 'Event created' : 'Event updated')
      if (pendingHeroImage) {
        try {
          await api.admin.uploadEventImage(event.id, pendingHeroImage)
          setPendingHeroImage(null)
        } catch (imageError) {
          setError(
            imageError instanceof Error
              ? `Event saved; hero upload failed: ${imageError.message}. Save to retry.`
              : 'Event saved; hero upload failed. Save to retry.'
          )
        }
      }
      if (event.translation_status === 'pending') {
        setSuccess('Event saved — translating changes...')
        pollTranslationStatus(event.id)
      }
      await loadEvents()
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
      await new Promise((r) => setTimeout(r, 3000))
      if (generation !== pollingGenRef.current) return
      try {
        const { event: updated } = await api.admin.getEvent(eventId)
        if (updated.translation_status === 'translated' || updated.translation_status === 'failed') {
          if (generation !== pollingGenRef.current) return
          setTranslating(false)
          setForm((prev) => ({ ...prev, translation_status: updated.translation_status }))
          setEvents((prev) =>
            prev.map((e) => (e.id === eventId ? { ...e, translation_status: updated.translation_status } : e))
          )
          if (updated.translation_status === 'translated') {
            setSuccess('Translation complete!')
          } else {
            setError('Translation failed — check server logs')
          }
          setTimeout(() => {
            setSuccess('')
            setError('')
          }, 5000)
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

  const updateForm = <K extends keyof EventFormData>(field: K, value: EventFormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const addScheduleItem = () => {
    setForm((prev) => ({
      ...prev,
      event_schedule_items_attributes: [
        ...prev.event_schedule_items_attributes,
        { time: '', description: '', confirmed: false, sort_order: prev.event_schedule_items_attributes.length },
      ],
    }))
  }

  const updateScheduleItem = (idx: number, field: keyof EventScheduleItem, value: string | number | boolean) => {
    setForm((prev) => ({
      ...prev,
      event_schedule_items_attributes: prev.event_schedule_items_attributes.map((item, i) =>
        i === idx ? { ...item, [field]: value } : item
      ),
    }))
  }

  const removeScheduleItem = (idx: number) => {
    setForm((prev) => {
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
    setForm((prev) => ({
      ...prev,
      prize_categories_attributes: [
        ...prev.prize_categories_attributes,
        { name: '', amount: '', confirmed: false, sort_order: prev.prize_categories_attributes.length },
      ],
    }))
  }

  const updatePrizeCategory = (idx: number, field: keyof PrizeCategory, value: string | number | boolean) => {
    setForm((prev) => ({
      ...prev,
      prize_categories_attributes: prev.prize_categories_attributes.map((item, i) =>
        i === idx ? { ...item, [field]: value } : item
      ),
    }))
  }

  const removePrizeCategory = (idx: number) => {
    setForm((prev) => {
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

  const currentEvent = typeof editing === 'number' ? events.find((e) => e.id === editing) : null

  if (!loading && typeof editing === 'number' && !currentEvent) {
    return (
      <div className="event-admin space-y-4">
        <p role="alert" className="text-sm text-red-300">
          {error || 'This event could not be loaded. No edits have been saved.'}
        </p>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={loadEvents} className="px-4 border border-white/10 text-gold">
            Retry loading events
          </button>
          <button type="button" onClick={() => setEditing(null)} className="px-4 text-text-secondary">
            Back to events
          </button>
        </div>
      </div>
    )
  }

  if (loading || (editing !== null && initializedEditor.current !== editing)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-gold animate-spin" />
      </div>
    )
  }

  return (
    <div className="event-admin">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <button
          type="button"
          className={`flex items-center gap-3 ${editing ? 'cursor-pointer group' : ''}`}
          onClick={
            editing
              ? () => {
                  setEditing(null)
                  setError('')
                }
              : undefined
          }
        >
          <CalendarDays className={`w-6 h-6 text-gold ${editing ? 'group-hover:text-gold/70' : ''}`} />
          <h1
            className={`font-heading text-2xl font-bold text-text-primary ${editing ? 'group-hover:text-gold transition-colors' : ''}`}
          >
            Events
          </h1>
          {editing && (
            <span className="text-xs text-text-muted group-hover:text-text-secondary transition-colors">
              (back to list)
            </span>
          )}
        </button>
        {!editing && (
          <button
            type="button"
            onClick={() => setRollover({})}
            disabled={!events.length}
            className="px-4 py-2 border border-white/10 text-sm text-text-secondary"
          >
            Prepare next season
          </button>
        )}
        {!editing && (
          <button
            onClick={() => setEditing('new')}
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
            role="status"
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
            role="alert"
            className="mb-4 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {editing !== null ? (
        <div className="bg-surface border border-white/5">
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
                    {translating ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Languages className="w-3.5 h-3.5" />
                    )}
                    {translating ? 'Translating...' : 'Translate'}
                  </button>
                  {form.translation_status && form.translation_status !== 'untranslated' && (
                    <span
                      className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        form.translation_status === 'translated'
                          ? 'bg-green-500/10 text-green-400'
                          : form.translation_status === 'pending'
                            ? 'bg-yellow-500/10 text-yellow-400'
                            : form.translation_status === 'failed'
                              ? 'bg-red-500/10 text-red-400'
                              : 'bg-white/5 text-text-muted'
                      }`}
                    >
                      {form.translation_status === 'pending' && <RefreshCw className="w-3 h-3 animate-spin" />}
                      {form.translation_status}
                    </span>
                  )}
                </>
              )}
              <button
                aria-label="Close event editor"
                onClick={() => {
                  setEditing(null)
                  setError('')
                }}
                className="text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {currentEvent?.source_event_id && (
            <p className="px-4 py-2 text-sm text-text-secondary">
              Copied from{' '}
              <Link
                className="inline-flex items-center text-gold"
                to={`/admin/events?edit=${currentEvent.source_event_id}`}
              >
                source event #{currentEvent.source_event_id}
              </Link>
              . Review copied content for the new season.
            </p>
          )}
          <EditorNavigation active={activeSection} onSelect={selectSection} errors={sectionErrors} />
          <fieldset disabled={saving || actionBusy} className="p-4 sm:p-5 space-y-5 min-w-0">
            <section
              hidden={activeSection !== 'basics'}
              id="event-section-basics"
              tabIndex={-1}
              aria-label="Basics"
              className="space-y-5 min-w-0"
            >
              <h2 className="font-heading text-lg font-semibold">Basics</h2>
              {sectionErrors.basics?.length ? (
                <ul role="alert" className="space-y-1 text-sm text-red-300">
                  {sectionErrors.basics?.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              ) : null}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {' '}
                <Field label="Name" value={form.name} onChange={(v) => updateForm('name', v)} />
                <Field
                  disabled={!!currentEvent && currentEvent.status !== 'draft'}
                  label="Slug"
                  value={form.slug}
                  onChange={(v) => updateForm('slug', v)}
                  placeholder="auto-generated-if-blank"
                />
                {currentEvent && currentEvent.status !== 'draft' && (
                  <p className="text-sm text-text-muted">Unpublish to draft to change the public slug.</p>
                )}
                <Field
                  label="ASJJF Stars"
                  type="number"
                  value={form.asjjf_stars?.toString() ?? ''}
                  onChange={(v) => updateForm('asjjf_stars', v.trim() ? Number(v) : null)}
                />
                <Field
                  label="Season year"
                  type="number"
                  value={form.season_year?.toString() ?? ''}
                  onChange={(v) => updateForm('season_year', v.trim() ? Number(v) : null)}
                />{' '}
                <Field
                  label="Tagline"
                  value={form.tagline}
                  onChange={(v) => updateForm('tagline', v)}
                  placeholder="The Grand Championship"
                />
              </div>
              <label className="block text-sm text-text-secondary">
                Description
                <textarea
                  value={form.description}
                  onChange={(e) => updateForm('description', e.target.value)}
                  rows={4}
                  className="mt-2 w-full border border-white/10 bg-white/[0.03] p-3"
                />
              </label>{' '}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_main_event}
                    onChange={(e) => updateForm('is_main_event', e.target.checked)}
                    className="accent-gold"
                  />
                  Main Event
                </label>
                <p className="text-[10px] text-text-muted">
                  Controls the public championship page and homepage registration links. Selecting this automatically
                  clears the previous main event.
                </p>
              </div>
              {/* Hero Image */}
              {(() => {
                const heroUrl =
                  typeof editing === 'number'
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
                      <label
                        className="text-xs font-medium text-text-secondary uppercase tracking-wide"
                        htmlFor="eventsadmin-field-1"
                      >
                        Hero Image
                      </label>
                      <input
                        id="eventsadmin-field-1"
                        ref={heroInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleHeroFileChange}
                        className="hidden"
                      />
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
                          <span className="text-[10px] text-text-muted uppercase tracking-wide">
                            Site Preview — how it appears on the event page hero
                          </span>
                        </div>
                        <div className="relative overflow-hidden border border-white/10 rounded aspect-[16/6]">
                          <img src={heroUrl} alt="Hero preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-navy-900/75" />
                          <div className="absolute inset-0 bg-linear-to-t from-navy-900 via-navy-900/50 to-transparent" />
                          <div className="absolute bottom-3 left-4 right-4 z-10">
                            <div className="text-gold-500 text-[10px] font-heading uppercase tracking-wider mb-1">
                              {(form.asjjf_stars ?? 0) > 0
                                ? `${'★'.repeat(Math.min(form.asjjf_stars ?? 0, 10))} ASJJF ${form.asjjf_stars}-STAR RANKED EVENT`
                                : ''}
                            </div>
                            <div className="text-white font-heading font-black text-sm sm:text-base uppercase leading-tight">
                              {form.name || 'Event Name'}
                            </div>
                            {form.tagline && (
                              <div className="text-text-secondary text-[10px] font-heading uppercase tracking-wider mt-1">
                                {form.tagline}
                              </div>
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
                    <label
                      className="text-xs font-medium text-text-secondary uppercase tracking-wide"
                      htmlFor="eventsadmin-field-2"
                    >
                      Poster Image
                    </label>
                    <input
                      id="eventsadmin-field-2"
                      ref={posterInputRef}
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file || typeof editing !== 'number') return
                        try {
                          await api.admin.uploadEventPoster(editing, file)
                          await loadEvents()
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Poster upload failed')
                        }
                      }}
                      className="hidden"
                    />
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
                  <p className="text-[10px] text-text-muted">
                    Promotional poster shown in the "Qualifying Series" section on the Calendar page.
                  </p>
                  {currentEvent?.poster_image_url && (
                    <div className="w-32 aspect-[3/4] border border-white/10 overflow-hidden">
                      <img
                        src={resolveMediaUrl(currentEvent.poster_image_url) || ''}
                        alt="Poster"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              )}
            </section>
            <section
              hidden={activeSection !== 'registration'}
              id="event-section-registration"
              tabIndex={-1}
              aria-label="Dates & Registration"
              className="space-y-5 min-w-0"
            >
              <h2 className="font-heading text-lg font-semibold">Dates & Registration</h2>
              {sectionErrors.registration?.length ? (
                <ul role="alert" className="space-y-1 text-sm text-red-300">
                  {sectionErrors.registration?.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              ) : null}
              <EventContentFields kind="registration" form={form} onChange={setForm} />
            </section>
            <section
              hidden={activeSection !== 'venue'}
              id="event-section-venue"
              tabIndex={-1}
              aria-label="Venue & Travel"
              className="space-y-5 min-w-0"
            >
              <h2 className="font-heading text-lg font-semibold">Venue & Travel</h2>
              {sectionErrors.venue?.length ? (
                <ul role="alert" className="space-y-1 text-sm text-red-300">
                  {sectionErrors.venue?.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              ) : null}
              <EventContentFields kind="venue" form={form} onChange={setForm} />
            </section>
            <section
              hidden={activeSection !== 'tickets'}
              id="event-section-tickets"
              tabIndex={-1}
              aria-label="Tickets"
              className="space-y-5 min-w-0"
            >
              <h2 className="font-heading text-lg font-semibold">Tickets</h2>
              {sectionErrors.tickets?.length ? (
                <ul role="alert" className="space-y-1 text-sm text-red-300">
                  {sectionErrors.tickets?.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              ) : null}
              <TicketsSection
                form={form}
                onChange={setForm}
                event={currentEvent}
                onReload={loadEvents}
                onError={setError}
                onSuccess={setSuccess}
              />
            </section>
            <section
              hidden={activeSection !== 'schedule'}
              id="event-section-schedule"
              tabIndex={-1}
              aria-label="Schedule"
              className="space-y-5 min-w-0"
            >
              <h2 className="font-heading text-lg font-semibold">Schedule</h2>
              {sectionErrors.schedule?.length ? (
                <ul role="alert" className="space-y-1 text-sm text-red-300">
                  {sectionErrors.schedule?.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              ) : null}
              <div>
                <label
                  className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5"
                  htmlFor="eventsadmin-field-3"
                >
                  Schedule Note
                </label>
                <textarea
                  id="eventsadmin-field-3"
                  value={form.schedule_note}
                  onChange={(e) => updateForm('schedule_note', e.target.value)}
                  rows={3}
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none resize-none"
                  placeholder="Official match schedule provided by the organizer..."
                />
              </div>{' '}
              {/* Schedule Items */}
              <div className="border border-white/5">
                <button
                  type="button"
                  onClick={() => toggleSection('schedule')}
                  className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-text-primary hover:bg-white/[0.02] transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-text-muted" />
                    Schedule Items ({form.event_schedule_items_attributes.filter((s) => !s._destroy).length})
                  </span>
                  {expandedSections.schedule ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.schedule && (
                  <div className="p-4 border-t border-white/5 space-y-3">
                    {form.event_schedule_items_attributes.map((item, idx) =>
                      item._destroy ? null : (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-start"
                        >
                          <label className="flex items-center gap-2 text-sm text-text-secondary">
                            <input
                              type="checkbox"
                              checked={item.confirmed ?? true}
                              onChange={(e) => updateScheduleItem(idx, 'confirmed', e.target.checked)}
                            />
                            Confirmed
                          </label>
                          <input
                            aria-label="9:00 AM"
                            value={item.time}
                            onChange={(e) => updateScheduleItem(idx, 'time', e.target.value)}
                            placeholder="9:00 AM"
                            className="w-full sm:w-44 sm:shrink-0 bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                          />
                          <div className="flex gap-2 sm:gap-3 flex-1 items-start">
                            <input
                              aria-label="Description"
                              value={item.description}
                              onChange={(e) => updateScheduleItem(idx, 'description', e.target.value)}
                              placeholder="Description"
                              className="flex-1 bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                            />
                            <button
                              aria-label={`Remove schedule row ${idx + 1}`}
                              onClick={() => removeScheduleItem(idx)}
                              className="p-1.5 text-text-muted hover:text-red-400"
                            >
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
            </section>
            <section
              hidden={activeSection !== 'prizes'}
              id="event-section-prizes"
              tabIndex={-1}
              aria-label="Prizes"
              className="space-y-5 min-w-0"
            >
              <h2 className="font-heading text-lg font-semibold">Prizes</h2>
              {sectionErrors.prizes?.length ? (
                <ul role="alert" className="space-y-1 text-sm text-red-300">
                  {sectionErrors.prizes?.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              ) : null}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {' '}
                <Field
                  label="Prize Pool"
                  value={form.prize_pool}
                  onChange={(v) => updateForm('prize_pool', v)}
                  placeholder="$10,000"
                />
                <Field
                  label="Prize Card Title"
                  value={form.prize_title}
                  onChange={(v) => updateForm('prize_title', v)}
                  placeholder="e.g. Win Your Way to Guam!"
                />
                <Field
                  label="Prize Card Description"
                  value={form.prize_description}
                  onChange={(v) => updateForm('prize_description', v)}
                  placeholder="e.g. Compete for a trip package to..."
                />
              </div>{' '}
              {/* Prize Categories */}
              <div className="border border-white/5">
                <button
                  type="button"
                  onClick={() => toggleSection('prizes')}
                  className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-text-primary hover:bg-white/[0.02] transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-text-muted" />
                    Prize Categories ({form.prize_categories_attributes.filter((p) => !p._destroy).length})
                  </span>
                  {expandedSections.prizes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.prizes && (
                  <div className="p-4 border-t border-white/5 space-y-3">
                    {form.prize_categories_attributes.map((item, idx) =>
                      item._destroy ? null : (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-start"
                        >
                          <label className="flex items-center gap-2 text-sm text-text-secondary">
                            <input
                              type="checkbox"
                              checked={item.confirmed ?? true}
                              onChange={(e) => updatePrizeCategory(idx, 'confirmed', e.target.checked)}
                            />
                            Confirmed
                          </label>
                          <input
                            aria-label="Category name"
                            value={item.name}
                            onChange={(e) => updatePrizeCategory(idx, 'name', e.target.value)}
                            placeholder="Category name"
                            className="flex-1 bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                          />
                          <div className="flex gap-2 sm:gap-3 items-start">
                            <input
                              aria-label="Amount (0 if non-cash)"
                              value={item.amount ?? ''}
                              onChange={(e) => updatePrizeCategory(idx, 'amount', e.target.value)}
                              placeholder="Amount (0 if non-cash)"
                              className="w-full sm:w-28 bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                            />
                            <button
                              aria-label={`Remove prize category ${idx + 1}`}
                              onClick={() => removePrizeCategory(idx)}
                              className="p-1.5 text-text-muted hover:text-red-400"
                            >
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
            </section>
            <section
              hidden={activeSection !== 'hotels'}
              id="event-section-hotels"
              tabIndex={-1}
              aria-label="Hotels & Offers"
              className="space-y-5 min-w-0"
            >
              <h2 className="font-heading text-lg font-semibold">Hotels & Offers</h2>
              {sectionErrors.hotels?.length ? (
                <ul role="alert" className="space-y-1 text-sm text-red-300">
                  {sectionErrors.hotels?.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              ) : null}
              {typeof editing === 'number' ? (
                <AccommodationsSection key={editing} eventId={editing} onDirtyChange={onHotelDirty} />
              ) : (
                <p className="text-sm text-text-secondary">Save this draft to add hotels and offers.</p>
              )}
            </section>
            <section
              hidden={activeSection !== 'gallery'}
              id="event-section-gallery"
              tabIndex={-1}
              aria-label="Gallery"
              className="space-y-5 min-w-0"
            >
              <h2 className="font-heading text-lg font-semibold">Gallery</h2>
              {sectionErrors.gallery?.length ? (
                <ul role="alert" className="space-y-1 text-sm text-red-300">
                  {sectionErrors.gallery?.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              ) : null}
              {typeof editing === 'number' ? (
                <EventGallerySection
                  key={editing}
                  eventId={editing}
                  eventName={form.name || 'Event'}
                  onDirtyChange={onGalleryDirty}
                />
              ) : (
                <p className="text-sm text-text-secondary">Save this draft to upload gallery images.</p>
              )}
            </section>
            <section
              hidden={activeSection !== 'results'}
              id="event-section-results"
              tabIndex={-1}
              aria-label="Results"
              className="space-y-5 min-w-0"
            >
              <h2 className="font-heading text-lg font-semibold">Results</h2>
              {sectionErrors.results?.length ? (
                <ul role="alert" className="space-y-1 text-sm text-red-300">
                  {sectionErrors.results?.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              ) : null}
              <div>
                <label
                  className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5"
                  htmlFor="eventsadmin-field-4"
                >
                  ASJJF Event IDs (for results import)
                </label>
                <input
                  id="eventsadmin-field-4"
                  aria-label="ASJJF Event IDs (for results import)"
                  value={resultIds}
                  onChange={(event) => setResultIds(event.target.value)}
                  placeholder="1863, 1864 (comma-separated)"
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                />
                <p className="text-[10px] text-text-muted mt-1">
                  Numeric IDs from asjjf.org event URLs. Gi and No-Gi are separate IDs.
                </p>
              </div>
              {typeof editing === 'number' ? (
                <Link
                  to={`/admin/events/${editing}/results`}
                  className="inline-flex items-center gap-3 px-4 text-gold border border-white/10"
                >
                  Manage event results{' '}
                  <ResultsSyncBadge
                    status={currentEvent?.results_sync_status}
                    lastCheckedAt={currentEvent?.results_last_checked_at}
                  />
                </Link>
              ) : (
                <p>Save this draft to manage results.</p>
              )}
            </section>
            <section
              hidden={activeSection !== 'publishing'}
              id="event-section-publishing"
              tabIndex={-1}
              aria-label="Publishing"
              className="space-y-5 min-w-0"
            >
              <h2 className="font-heading text-lg font-semibold">Publishing</h2>
              {sectionErrors.publishing?.length ? (
                <ul role="alert" className="space-y-1 text-sm text-red-300">
                  {sectionErrors.publishing?.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              ) : null}
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={
                    currentEvent?.source_event_id
                      ? !form.content_review_required
                      : (form.content_review_required ?? false)
                  }
                  onChange={(e) =>
                    updateForm(
                      'content_review_required',
                      currentEvent?.source_event_id ? !e.target.checked : e.target.checked
                    )
                  }
                />
                {currentEvent?.source_event_id
                  ? 'I reviewed copied content for this season'
                  : 'Content still needs review'}
              </label>{' '}
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
                    {form.live_stream_active && (
                      <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 animate-pulse">LIVE</span>
                    )}
                  </span>
                  {expandedSections.livestream ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {expandedSections.livestream && (
                  <div className="p-4 border-t border-white/5 space-y-3">
                    <Field
                      label="Live Stream URL"
                      value={form.live_stream_url}
                      onChange={(v) => updateForm('live_stream_url', v)}
                      placeholder="https://www.youtube.com/@themarianasopen/live"
                    />
                    <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.live_stream_active}
                        onChange={(e) => {
                          const checked = e.target.checked
                          updateForm('live_stream_active', checked)
                          if (checked && !form.live_stream_url) {
                            updateForm('live_stream_url', DEFAULT_LIVE_STREAM_URL)
                          }
                        }}
                        className="accent-gold"
                      />
                      <span>Stream is LIVE now</span>
                      {form.live_stream_active && (
                        <span className="text-xs text-red-400">(Visitors will see a live banner)</span>
                      )}
                    </label>
                  </div>
                )}
              </div>
              {currentEvent ? (
                <PublishingSection
                  key={currentEvent.id}
                  event={currentEvent}
                  dirty={anyDirty}
                  onSelect={selectSection}
                  onUpdate={acceptSavedEvent}
                  onBusyChange={setActionBusy}
                />
              ) : (
                <p className="text-sm text-text-secondary">Save the draft to see its publishing checklist.</p>
              )}
            </section>{' '}
          </fieldset>
          <div className="editor-save-bar flex flex-wrap items-center gap-3 border-t border-white/10 bg-surface px-4 py-3">
            <span role="status" className={`mr-auto text-sm ${anyDirty ? 'text-amber-300' : 'text-text-secondary'}`}>
              {dirty
                ? 'Unsaved event changes'
                : Object.values(childDirty).some(Boolean)
                  ? 'Unsaved hotel or gallery changes'
                  : 'Event changes saved'}
            </span>
            <button
              onClick={handleSave}
              disabled={saving || actionBusy}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gold/10 text-gold text-sm font-medium hover:bg-gold/15 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => {
                setEditing(null)
                setError('')
              }}
              className="px-5 py-2.5 text-text-muted text-sm hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* Events Table */
        <div className="bg-surface border border-white/5 overflow-hidden">
          {/* Search + Filter Bar */}
          <div className="px-4 py-3 border-b border-white/5 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                aria-label="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events..."
                className="w-full bg-white/[0.03] border border-white/10 pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none"
            >
              <option value="all">All statuses ({events.length})</option>
              {Object.entries(statusCounts)
                .sort()
                .map(([status, count]) => (
                  <option key={status} value={status}>
                    {status} ({count})
                  </option>
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
                      {(
                        [
                          ['name', 'Name'],
                          ['date', 'Date'],
                          ['location', 'Location'],
                          ['stars', 'Stars'],
                          ['status', 'Status'],
                        ] as [SortField, string][]
                      ).map(([field, label]) => (
                        <th
                          key={field}
                          onClick={() => toggleSort(field)}
                          className="px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wide cursor-pointer hover:text-text-secondary select-none transition-colors"
                        >
                          <span className="inline-flex items-center gap-1">
                            {label}
                            {sortField === field ? (
                              sortDir === 'asc' ? (
                                <ArrowUp className="w-3 h-3" />
                              ) : (
                                <ArrowDown className="w-3 h-3" />
                              )
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
                    {filteredEvents.map((event) => (
                      <tr key={event.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3 text-text-primary font-medium">
                          {event.name}
                          <div className="mt-1">
                            <Link
                              to={`/admin/events/${event.id}/results`}
                              aria-label={`Review results sync for ${event.name}`}
                              className="inline-flex min-h-11 items-center focus-visible:outline-2 focus-visible:outline-gold"
                            >
                              <ResultsSyncBadge
                                status={event.results_sync_status}
                                lastCheckedAt={event.results_last_checked_at}
                              />
                            </Link>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-text-secondary whitespace-nowrap">{formatDate(event.date)}</td>
                        <td className="px-5 py-3 text-text-secondary">
                          {event.city}, {event.country}
                        </td>
                        <td className="px-5 py-3">
                          <span className="flex items-center gap-1 text-gold">
                            <Star className="w-3 h-3 fill-current" />
                            {event.asjjf_stars ?? 'Not set'}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`text-xs px-2 py-0.5 ${
                              event.status === 'upcoming'
                                ? 'bg-gold/10 text-gold'
                                : event.status === 'live'
                                  ? 'bg-red-500/10 text-red-400 animate-pulse'
                                  : event.status === 'completed'
                                    ? 'bg-blue-500/10 text-blue-400'
                                    : event.status === 'cancelled'
                                      ? 'bg-red-500/10 text-red-400'
                                      : 'bg-white/5 text-text-muted'
                            }`}
                          >
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
                              onClick={() => setRollover({ eventId: event.id })}
                              className="p-1.5 text-text-muted hover:text-blue-400 transition-colors"
                              title="Copy for next season"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditing(event.id)}
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
                {filteredEvents.map((event) => (
                  <div key={event.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm text-text-primary font-medium">{event.name}</div>
                        <div className="text-xs text-text-secondary mt-1">{formatDate(event.date)}</div>
                        <div className="text-xs text-text-muted mt-1">
                          {event.city}, {event.country}
                        </div>
                        <Link
                          to={`/admin/events/${event.id}/results`}
                          aria-label={`Review results sync for ${event.name}`}
                          className="mt-1 inline-flex min-h-11 items-center focus-visible:outline-2 focus-visible:outline-gold"
                        >
                          <ResultsSyncBadge
                            status={event.results_sync_status}
                            lastCheckedAt={event.results_last_checked_at}
                          />
                        </Link>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 shrink-0 ${
                          event.status === 'upcoming'
                            ? 'bg-gold/10 text-gold'
                            : event.status === 'live'
                              ? 'bg-red-500/10 text-red-400 animate-pulse'
                              : event.status === 'completed'
                                ? 'bg-blue-500/10 text-blue-400'
                                : event.status === 'cancelled'
                                  ? 'bg-red-500/10 text-red-400'
                                  : 'bg-white/5 text-text-muted'
                        }`}
                      >
                        {event.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-gold text-xs">
                        <Star className="w-3 h-3 fill-current" />
                        {event.asjjf_stars == null ? 'Stars not set' : `${event.asjjf_stars} stars`}
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
                          onClick={() => setRollover({ eventId: event.id })}
                          className="p-1.5 text-text-muted hover:text-blue-400 transition-colors"
                          title="Copy for next season"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditing(event.id)}
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

      {rollover && (
        <RolloverDialog
          events={events}
          initialEventId={rollover.eventId}
          onClose={() => setRollover(null)}
          onComplete={(copies, message) => {
            setRollover(null)
            setEvents((previous) => [...previous, ...copies])
            setSuccess(message || `${copies.length} draft copies created. Review before publishing.`)
            if (copies.length === 1) setEditingParam(copies[0].id)
          }}
        />
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
              onClick={(e) => e.stopPropagation()}
              className="bg-surface border border-white/10 p-6 max-w-sm w-full mx-4"
            >
              <h3 className="font-heading text-lg font-semibold text-text-primary mb-2">Delete Event</h3>
              <p className="text-sm text-text-secondary mb-5">Are you sure? This action cannot be undone.</p>
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
