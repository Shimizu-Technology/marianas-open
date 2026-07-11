import { useEffect, useMemo, useState } from 'react'
import { ImageUp, Loader2, PanelsTopLeft, Plus, Trash2 } from 'lucide-react'
import { api, type Event, type Season, type Sponsor, type SponsorPlacement } from '../../services/api'

const placementTypes = ['featured_bar', 'homepage_hero', 'event_hero', 'livestream', 'results', 'gallery'] as const

export default function SponsorPlacementsAdmin() {
  const [placements, setPlacements] = useState<SponsorPlacement[]>([])
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<{ sponsor_id: number; season_id: number; event_id: number; placement_type: SponsorPlacement['placement_type']; headline: string; cta_label: string; cta_url: string; starts_at: string; ends_at: string; active: boolean }>({ sponsor_id: 0, season_id: 0, event_id: 0, placement_type: 'featured_bar', headline: '', cta_label: '', cta_url: '', starts_at: '', ends_at: '', active: true })

  const load = async () => {
    try {
      const [placementResponse, sponsorResponse, seasonResponse, eventResponse] = await Promise.all([api.admin.getSponsorPlacements(), api.admin.getSponsors(), api.admin.getSeasons(), api.admin.getEvents()])
      setPlacements(placementResponse.sponsor_placements); setSponsors(sponsorResponse.sponsors); setSeasons(seasonResponse.seasons); setEvents(eventResponse.events)
      setForm((value) => ({ ...value, sponsor_id: value.sponsor_id || sponsorResponse.sponsors[0]?.id || 0, season_id: value.season_id || seasonResponse.seasons.find((season) => season.current)?.id || 0 }))
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load sponsor placements') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const eligibleEvents = useMemo(() => events.filter((event) => !form.season_id || event.season_id === form.season_id), [events, form.season_id])

  const create = async () => {
    setSaving(true); setError('')
    try {
      await api.admin.createSponsorPlacement({
        ...form,
        season_id: form.season_id || null,
        event_id: form.event_id || null,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
        media_kind: 'logo',
        sort_order: placements.length,
      })
      setForm((value) => ({ ...value, headline: '', cta_label: '', cta_url: '', starts_at: '', ends_at: '', event_id: 0 }))
      await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to create placement') }
    finally { setSaving(false) }
  }

  const toggle = async (placement: SponsorPlacement) => {
    try { await api.admin.updateSponsorPlacement(placement.id, { active: !placement.active }); await load() }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to update placement') }
  }

  const remove = async (placement: SponsorPlacement) => {
    if (!window.confirm(`Delete the ${placement.placement_type.replaceAll('_', ' ')} placement for ${placement.sponsor.name}?`)) return
    try { await api.admin.deleteSponsorPlacement(placement.id); await load() }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to delete placement') }
  }

  const uploadMedia = async (placement: SponsorPlacement, file: File) => {
    try { await api.admin.uploadSponsorPlacementMedia(placement.id, file); await load() }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to upload placement media') }
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>

  return (
    <div className="space-y-6">
      <div><div className="flex items-center gap-3"><PanelsTopLeft className="h-6 w-6 text-gold" /><h1 className="font-heading text-2xl font-bold">Sponsor placements</h1></div><p className="mt-2 max-w-3xl text-sm text-text-muted">Schedule the right sponsor for a site location, season, or individual event without changing code.</p></div>
      {error && <div className="border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>}
      <section className="space-y-4 border border-white/5 bg-surface p-5">
        <h2 className="font-heading text-sm font-bold">Add placement</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select value={form.sponsor_id} onChange={(event) => setForm({ ...form, sponsor_id: Number(event.target.value) })} className="border border-white/10 bg-navy-900 px-3 py-2 text-sm"><option value={0}>Choose sponsor</option>{sponsors.map((sponsor) => <option key={sponsor.id} value={sponsor.id}>{sponsor.name}</option>)}</select>
          <select value={form.placement_type} onChange={(event) => setForm({ ...form, placement_type: event.target.value as SponsorPlacement['placement_type'] })} className="border border-white/10 bg-navy-900 px-3 py-2 text-sm">{placementTypes.map((type) => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}</select>
          <select value={form.season_id} onChange={(event) => setForm({ ...form, season_id: Number(event.target.value), event_id: 0 })} className="border border-white/10 bg-navy-900 px-3 py-2 text-sm"><option value={0}>All seasons</option>{seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}</select>
          <select value={form.event_id} onChange={(event) => setForm({ ...form, event_id: Number(event.target.value) })} className="border border-white/10 bg-navy-900 px-3 py-2 text-sm"><option value={0}>All events in scope</option>{eligibleEvents.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}</select>
          <input value={form.headline} onChange={(event) => setForm({ ...form, headline: event.target.value })} placeholder="Optional headline" className="border border-white/10 bg-white/[0.03] px-3 py-2 text-sm" />
          <input value={form.cta_label} onChange={(event) => setForm({ ...form, cta_label: event.target.value })} placeholder="Call-to-action label" className="border border-white/10 bg-white/[0.03] px-3 py-2 text-sm" />
          <input value={form.cta_url} onChange={(event) => setForm({ ...form, cta_url: event.target.value })} placeholder="https://sponsor.example" className="border border-white/10 bg-white/[0.03] px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-2"><input type="datetime-local" value={form.starts_at} onChange={(event) => setForm({ ...form, starts_at: event.target.value })} className="min-w-0 border border-white/10 bg-white/[0.03] px-2 py-2 text-xs" aria-label="Starts at" /><input type="datetime-local" value={form.ends_at} onChange={(event) => setForm({ ...form, ends_at: event.target.value })} className="min-w-0 border border-white/10 bg-white/[0.03] px-2 py-2 text-xs" aria-label="Ends at" /></div>
        </div>
        <button onClick={create} disabled={saving || !form.sponsor_id} className="flex items-center gap-2 bg-gold/10 px-4 py-2 text-sm font-medium text-gold hover:bg-gold/15 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Create placement</button>
      </section>
      <section className="divide-y divide-white/5 border border-white/5 bg-surface">
        {placements.length === 0 ? <div className="p-8 text-center text-sm text-text-muted">No placements yet.</div> : placements.map((placement) => (
          <div key={placement.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div><div className="font-medium">{placement.sponsor.name} <span className="ml-2 text-xs text-gold">{placement.placement_type.replaceAll('_', ' ')}</span></div><div className="mt-1 text-xs text-text-muted">{placement.headline || 'Sponsor logo'} · {placement.season_id ? seasons.find((season) => season.id === placement.season_id)?.name : 'all seasons'}{placement.event_id ? ` · ${events.find((event) => event.id === placement.event_id)?.name}` : ''}</div></div>
            <div className="flex items-center gap-2"><label className="cursor-pointer p-2 text-text-muted hover:text-gold" title="Upload custom image or video"><ImageUp className="h-4 w-4" /><input type="file" accept="image/*,video/*" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadMedia(placement, file); event.target.value = '' }} /></label><button onClick={() => toggle(placement)} className={`px-3 py-1.5 text-xs ${placement.active ? 'bg-green-400/10 text-green-300' : 'bg-white/5 text-text-muted'}`}>{placement.active ? 'Active' : 'Inactive'}</button><button onClick={() => remove(placement)} className="p-2 text-text-muted hover:text-red-300" aria-label="Delete placement"><Trash2 className="h-4 w-4" /></button></div>
          </div>
        ))}
      </section>
    </div>
  )
}
