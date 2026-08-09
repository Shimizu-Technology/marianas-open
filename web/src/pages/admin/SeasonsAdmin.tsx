import { useEffect, useState } from 'react'
import { CalendarRange, CheckCircle2, Loader2, Plus, RefreshCw, Rocket } from 'lucide-react'
import { api, type Season } from '../../services/api'

export default function SeasonsAdmin() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<number | 'new' | null>(null)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [year, setYear] = useState(new Date().getFullYear() + 1)
  const [rolloverYear, setRolloverYear] = useState<Record<number, number>>({})

  const load = async () => {
    try {
      setSeasons((await api.admin.getSeasons()).seasons)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load seasons')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const createSeason = async () => {
    setBusy('new'); setError('')
    try {
      await api.admin.createSeason({
        year,
        name: name || `${year} Marianas Open Circuit`,
        status: 'draft',
        current: false,
        starts_on: `${year}-01-01`,
        ends_on: `${year}-12-31`,
      })
      setName(''); await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create season')
    } finally { setBusy(null) }
  }

  const activate = async (season: Season) => {
    if (!window.confirm(`Make ${season.name} the current public operating season?`)) return
    setBusy(season.id); setError('')
    try { await api.admin.activateSeason(season.id); await load() }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to activate season') }
    finally { setBusy(null) }
  }

  const rollover = async (season: Season) => {
    const target = rolloverYear[season.id] || season.year + 1
    if (!window.confirm(`Create ${target} as drafts from ${season.name}? Stale registration, results, live, and hotel booking details will be reset.`)) return
    setBusy(season.id); setError('')
    try { await api.admin.rolloverSeason(season.id, target, true); await load() }
    catch (err) { setError(err instanceof Error ? err.message : 'Rollover failed') }
    finally { setBusy(null) }
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3"><CalendarRange className="h-6 w-6 text-gold" /><h1 className="font-heading text-2xl font-bold">Seasons & yearly rollover</h1></div>
        <p className="mt-2 max-w-3xl text-sm text-text-muted">Prepare next year safely, review every draft, then activate the season when it is ready. Rollover copies useful structure without carrying forward live links or tournament results.</p>
      </div>

      {error && <div className="border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      <section className="grid gap-3 border border-white/5 bg-surface p-4 sm:grid-cols-[140px_1fr_auto]">
        <input type="number" value={year} onChange={(event) => setYear(Number(event.target.value))} className="border border-white/10 bg-white/[0.03] px-3 py-2 text-sm" aria-label="Season year" />
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder={`${year} Marianas Open Circuit`} className="border border-white/10 bg-white/[0.03] px-3 py-2 text-sm" aria-label="Season name" />
        <button onClick={createSeason} disabled={busy === 'new'} className="flex items-center justify-center gap-2 bg-gold/10 px-4 py-2 text-sm font-medium text-gold hover:bg-gold/15 disabled:opacity-50">
          {busy === 'new' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} New blank season
        </button>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        {seasons.map((season) => (
          <section key={season.id} className={`border bg-surface p-5 ${season.current ? 'border-gold/35' : 'border-white/5'}`}>
            <div className="flex items-start justify-between gap-4">
              <div><div className="flex items-center gap-2"><h2 className="font-heading text-lg font-bold">{season.name}</h2>{season.current && <span className="bg-gold/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold">Current</span>}</div><p className="mt-1 text-xs uppercase tracking-wider text-text-muted">{season.status} · {season.year}</p></div>
              <div className="text-right"><div className="text-xl font-bold">{season.events_count}</div><div className="text-xs text-text-muted">events</div></div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-text-secondary"><CheckCircle2 className="h-4 w-4 text-green-400" />{season.ready_events_count} events pass publishing readiness</div>
            <div className="mt-5 grid gap-2 sm:grid-cols-[110px_1fr_auto]">
              <input type="number" value={rolloverYear[season.id] || season.year + 1} onChange={(event) => setRolloverYear((value) => ({ ...value, [season.id]: Number(event.target.value) }))} className="border border-white/10 bg-white/[0.03] px-3 py-2 text-sm" aria-label={`Target year for ${season.name}`} />
              <button onClick={() => rollover(season)} disabled={busy === season.id} className="flex items-center justify-center gap-2 border border-blue-400/20 bg-blue-400/10 px-3 py-2 text-sm text-blue-300 hover:bg-blue-400/15 disabled:opacity-50"><RefreshCw className="h-4 w-4" />Rollover as drafts</button>
              {!season.current && <button onClick={() => activate(season)} disabled={busy === season.id} className="flex items-center justify-center gap-2 bg-gold/10 px-3 py-2 text-sm text-gold hover:bg-gold/15 disabled:opacity-50"><Rocket className="h-4 w-4" />Activate</button>}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
