import { AdminWriteForm, AdminWriteButton } from './AdminWriteControls'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../../services/api'
import { asjjfButtonClass } from './AsjjfIntakePanel'

type Season = { season_year: number; gi_ranking_id: number | null; nogi_ranking_id: number | null; team_ranking_id: number | null; team_nogi_ranking_id: number | null; current: boolean }
type Suggestion = { id: number; asjjf_ranking_id: number; season_year: number; discipline: string; kind: string; title: string; source_url: string }
const fields = ['gi_ranking_id', 'nogi_ranking_id', 'team_ranking_id', 'team_nogi_ranking_id'] as const

export default function RankingSeasonSettings({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useTranslation()
  const [seasons, setSeasons] = useState<Season[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [values, setValues] = useState<Record<typeof fields[number], string>>({ gi_ranking_id: '', nogi_ranking_id: '', team_ranking_id: '', team_nogi_ranking_id: '' })
  const [current, setCurrent] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  function selectSeason(value: string, records = seasons) {
    setYear(value)
    const season = records.find(item => item.season_year === Number(value))
    setValues(Object.fromEntries(fields.map(field => [field, String(season?.[field] ?? '')])) as typeof values)
    setCurrent(season?.current ?? false)
    setSaved(false)
  }

  useEffect(() => {
    let active = true
    fetchApi<{ seasons: Season[]; suggestions: Suggestion[] }>('/api/v1/admin/asjjf/ranking_seasons', {}, true)
      .then(data => {
        if (!active) return
        setSeasons(data.seasons)
        setSuggestions(data.suggestions)
        const season = data.seasons.find(item => item.current) ?? data.seasons[0]
        if (season) {
          setYear(String(season.season_year))
          setValues(Object.fromEntries(fields.map(field => [field, String(season[field] ?? '')])) as typeof values)
          setCurrent(season.current)
        }
      })
      .catch(() => { if (active) setError(t('rankingAdmin.loadError')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [t])

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const data = await fetchApi<{ season: Season }>(`/api/v1/admin/asjjf/ranking_seasons/${year}`, {
        method: 'PUT', body: JSON.stringify({ ...values, current }),
      }, true)
      setSeasons(previous => [...previous.filter(item => item.season_year !== Number(year)).map(item => current ? { ...item, current: false } : item), data.season])
      setSaved(true)
    } catch {
      setError(t('rankingAdmin.saveError'))
    } finally { setSaving(false) }
  }

  return <section aria-labelledby="ranking-settings" className="rounded-xl border border-white/10 bg-surface p-4 sm:p-5">
    <h2 id="ranking-settings" className="font-heading text-lg font-bold text-text-primary">{t('rankingAdmin.title')}</h2>
    <p className="mt-2 text-sm text-text-secondary">{t('rankingAdmin.description')}</p>
    {loading && <p role="status" className="mt-3 text-sm text-text-secondary">{t('rankingAdmin.loading')}</p>}
    {error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}
    {saved && <p role="status" className="mt-3 text-sm text-green-400">{t('rankingAdmin.saved')}</p>}
    {!loading && <AdminWriteForm onSubmit={save} className="mt-4 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-text-secondary">{t('rankingAdmin.season')}
          <input type="number" min="2000" max="2100" required disabled={!isAdmin || saving} value={year} onChange={event => selectSeason(event.target.value)} list="ranking-season-years" className="mt-1 min-h-11 w-full rounded-lg border border-white/20 bg-navy-900 px-3 text-base text-text-primary" />
          <datalist id="ranking-season-years">{seasons.map(season => <option key={season.season_year} value={season.season_year} />)}</datalist>
        </label>
        {fields.map(field => <label key={field} className="text-sm text-text-secondary">{t(`rankingAdmin.${field}`)}
          <input type="number" min="1" step="1" disabled={!isAdmin || saving} value={values[field]} onChange={event => { setValues(previous => ({ ...previous, [field]: event.target.value })); setSaved(false) }} className="mt-1 min-h-11 w-full rounded-lg border border-white/20 bg-navy-900 px-3 text-base text-text-primary" />
        </label>)}
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm text-text-primary"><input type="checkbox" checked={current} disabled={!isAdmin || saving} onChange={event => { setCurrent(event.target.checked); setSaved(false) }} />{t('rankingAdmin.current')}</label>
      {isAdmin ? <AdminWriteButton type="submit" disabled={saving || loading} className={asjjfButtonClass}>{t(saving ? 'rankingAdmin.saving' : 'rankingAdmin.save')}</AdminWriteButton> : <p className="text-sm text-text-secondary">{t('rankingAdmin.adminOnly')}</p>}
    </AdminWriteForm>}
    {suggestions.length > 0 && <div className="mt-6 border-t border-white/10 pt-4">
      <h3 className="font-semibold text-text-primary">{t('rankingAdmin.suggestions')}</h3>
      <p className="mt-1 text-sm text-text-secondary">{t('rankingAdmin.suggestionHelp')}</p>
      <ul className="mt-3 space-y-3">{suggestions.map(suggestion => <li key={suggestion.id} className="flex flex-wrap items-center gap-3 text-sm">
        <a href={suggestion.source_url} target="_blank" rel="noopener noreferrer" className="break-words text-gold underline">{suggestion.title} · {suggestion.asjjf_ranking_id}</a>
        {isAdmin && <button type="button" disabled={saving} className={asjjfButtonClass} onClick={() => {
          selectSeason(String(suggestion.season_year))
          const field = suggestion.kind === 'team' ? (suggestion.discipline === 'nogi' ? 'team_nogi_ranking_id' : 'team_ranking_id') : (suggestion.discipline === 'nogi' ? 'nogi_ranking_id' : 'gi_ranking_id')
          setValues(previous => ({ ...previous, [field]: String(suggestion.asjjf_ranking_id) }))
        }}>{t('rankingAdmin.useSuggestion')}</button>}
      </li>)}</ul>
    </div>}
  </section>
}
