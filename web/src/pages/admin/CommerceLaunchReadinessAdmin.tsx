import { AlertTriangle, ArrowRight, Check, CheckCircle2, CircleDashed, ExternalLink, Loader2, RefreshCw, Rocket, Save, ShieldAlert } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type CommerceLaunchReadiness } from '../../services/api'

type ManualCheck = CommerceLaunchReadiness['manual_checks'][number]
type Draft = Pick<ManualCheck, 'status' | 'note'>

const statusStyles = {
  passed: 'border-emerald-300/25 bg-emerald-300/[0.07] text-emerald-200',
  blocked: 'border-red-300/25 bg-red-300/[0.07] text-red-200',
  pending: 'border-white/10 bg-white/[0.035] text-text-secondary',
  warning: 'border-amber-300/25 bg-amber-300/[0.07] text-amber-200',
}

const statusIcons = {
  passed: CheckCircle2,
  blocked: ShieldAlert,
  pending: CircleDashed,
  warning: AlertTriangle,
}

function prettyEnvironment(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())
}

export default function CommerceLaunchReadinessAdmin() {
  const [readiness, setReadiness] = useState<CommerceLaunchReadiness | null>(null)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const applySnapshot = useCallback((snapshot: CommerceLaunchReadiness) => {
    setReadiness(snapshot)
    setDrafts(Object.fromEntries(snapshot.manual_checks.map(check => [check.key, { status: check.status, note: check.note }])))
  }, [])

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { applySnapshot(await api.admin.getCommerceLaunchReadiness()) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Launch readiness could not be loaded.') }
    finally { setLoading(false) }
  }, [applySnapshot])

  useEffect(() => { void load() }, [load])

  const updateDraft = (key: string, patch: Partial<Draft>) => {
    setDrafts(current => ({ ...current, [key]: { ...current[key], ...patch } }))
  }

  const save = async (check: ManualCheck) => {
    const draft = drafts[check.key]
    if (!draft) return
    setSavingKey(check.key); setError(''); setNotice('')
    try {
      applySnapshot(await api.admin.updateCommerceLaunchCheck(check.key, draft))
      setNotice(`${check.title} updated.`)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The launch check could not be updated.') }
    finally { setSavingKey('') }
  }

  if (loading && !readiness) return <div className="flex min-h-[45vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-gold" /></div>

  return <div className="mx-auto max-w-6xl pb-16">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl"><div className="flex items-center gap-3"><Rocket className="h-7 w-7 text-gold" /><h1 className="font-heading text-3xl font-bold">Launch readiness</h1></div><p className="mt-2 text-sm leading-6 text-text-secondary">One place to verify the software, Deal Depot handoff, physical shipping pilots, and owner approvals before the shop is exposed to customers.</p></div>
      <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-white/10 px-4 text-sm font-semibold text-text-secondary hover:border-white/20 hover:text-white disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Run checks again</button>
    </div>

    {error && <div role="alert" className="mt-5 rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-100">{error}</div>}
    {notice && <div role="status" className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.08] p-4 text-sm text-emerald-100">{notice}</div>}

    {readiness && <>
      <section className={`mt-7 overflow-hidden rounded-3xl border ${readiness.ready_to_enable ? 'border-emerald-300/25 bg-emerald-300/[0.06]' : 'border-amber-300/20 bg-amber-300/[0.045]'}`}>
        <div className="grid gap-px bg-white/10 sm:grid-cols-[1.3fr_.7fr_.7fr]">
          <div className="bg-navy-900/90 p-6 sm:p-7"><p className="text-xs font-bold uppercase tracking-[.18em] text-gold">{prettyEnvironment(readiness.environment)} environment</p><h2 className="mt-3 font-heading text-2xl font-bold">{readiness.ready_to_enable ? 'Ready for an approved release' : `${readiness.summary.blockers} launch gate${readiness.summary.blockers === 1 ? '' : 's'} remaining`}</h2><p className="mt-2 text-sm leading-6 text-text-secondary">The storefront is currently <strong className={readiness.commerce_enabled ? 'text-emerald-200' : 'text-amber-200'}>{readiness.commerce_enabled ? 'enabled' : 'hidden'}</strong>. Readiness does not change the feature flag.</p></div>
          <div className="bg-navy-900/90 p-6"><p className="text-xs uppercase tracking-wide text-text-muted">Automatic</p><p className="mt-2 font-heading text-3xl font-bold">{readiness.summary.automatic_passed}<span className="text-lg text-text-muted">/{readiness.summary.automatic_total}</span></p><p className="mt-1 text-xs text-text-muted">checks passing</p></div>
          <div className="bg-navy-900/90 p-6"><p className="text-xs uppercase tracking-wide text-text-muted">Sign-offs</p><p className="mt-2 font-heading text-3xl font-bold">{readiness.summary.manual_passed}<span className="text-lg text-text-muted">/{readiness.summary.manual_total}</span></p><p className="mt-1 text-xs text-text-muted">completed</p></div>
        </div>
      </section>

      <section className="mt-7 rounded-2xl border border-white/10 bg-surface p-5 sm:p-7">
        <div><p className="text-xs font-bold uppercase tracking-[.16em] text-gold">Live system check</p><h2 className="mt-2 font-heading text-xl font-semibold">Configuration and operating health</h2><p className="mt-1 text-sm leading-6 text-text-muted">Credentials are checked only for presence and test/live separation. Secret values are never returned to this page.</p></div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">{readiness.automatic_checks.map(check => {
          const Icon = statusIcons[check.status]
          return <div key={check.key} className={`rounded-2xl border p-4 ${statusStyles[check.status]}`}><div className="flex items-start gap-3"><Icon className="mt-0.5 h-5 w-5 shrink-0" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-text-primary">{check.title}</h3><span className="rounded-full bg-black/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">{check.category}</span></div><p className="mt-1.5 text-sm leading-6 opacity-90">{check.detail}</p>{check.fix_path && check.status !== 'passed' && <Link to={check.fix_path} className="mt-2 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-gold">Open setup <ArrowRight className="h-4 w-4" /></Link>}</div></div></div>
        })}</div>
      </section>

      <section className="mt-7">
        <div><p className="text-xs font-bold uppercase tracking-[.16em] text-gold">Human verification</p><h2 className="mt-2 font-heading text-xl font-semibold">Pilot and launch sign-offs</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-text-muted">Mark a gate passed only after the real-world work is complete. Leave enough evidence in the note that another person can understand what was tested and when.</p></div>
        <div className="mt-5 space-y-4">{readiness.manual_checks.map(check => {
          const draft = drafts[check.key] || { status: check.status, note: check.note }
          const changed = draft.status !== check.status || draft.note !== check.note
          const noteRequired = draft.status !== 'pending' && !draft.note.trim()
          return <article key={check.key} className="rounded-2xl border border-white/10 bg-surface p-5 sm:p-6"><div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div className="max-w-3xl"><div className="flex flex-wrap items-center gap-2"><h3 className="font-heading text-lg font-semibold">{check.title}</h3><span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-text-muted">{check.category}</span></div><p className="mt-2 text-sm leading-6 text-text-secondary">{check.detail}</p>{check.reviewed_at && <p className="mt-2 text-xs text-text-muted">Last signed by {check.reviewed_by || 'staff'} on {new Date(check.reviewed_at).toLocaleString()}</p>}</div><div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-black/15 p-1 lg:w-[310px]">{(['pending', 'passed', 'blocked'] as const).map(status => <button key={status} type="button" onClick={() => updateDraft(check.key, { status })} aria-pressed={draft.status === status} className={`min-h-10 rounded-lg px-2 text-xs font-bold transition ${draft.status === status ? statusStyles[status] : 'text-text-muted hover:bg-white/5 hover:text-white'}`}>{status === 'passed' ? 'Passed' : status === 'blocked' ? 'Blocked' : 'Pending'}</button>)}</div></div><label className="mt-5 block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-muted">Evidence or blocker note</span><textarea value={draft.note} maxLength={2000} onChange={event => updateDraft(check.key, { note: event.target.value })} rows={3} placeholder="Example: Tested USPS Priority to California on Sep 15; quoted $18.42, label scanned, tracking received." className="w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-3 text-base text-text-primary outline-none transition placeholder:text-text-muted focus:border-gold/60 focus:ring-2 focus:ring-gold/15 sm:text-sm" /></label><div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className={`text-xs ${noteRequired ? 'text-red-200' : 'text-text-muted'}`}>{noteRequired ? 'Add a short evidence note before saving.' : `${draft.note.length}/2000 characters`}</p><button type="button" onClick={() => void save(check)} disabled={!changed || savingKey.length > 0 || noteRequired} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gold px-5 text-sm font-bold text-navy-950 disabled:cursor-not-allowed disabled:opacity-45">{savingKey === check.key ? <Loader2 className="h-4 w-4 animate-spin" /> : changed ? <Save className="h-4 w-4" /> : <Check className="h-4 w-4" />}{changed ? 'Save sign-off' : 'Saved'}</button></div></article>
        })}</div>
      </section>

      <div className="mt-7 flex flex-col gap-3 rounded-2xl border border-sky-300/15 bg-sky-300/[0.045] p-5 text-sm leading-6 text-text-secondary sm:flex-row sm:items-center sm:justify-between"><p>When every gate passes, open the reviewed <code className="rounded bg-black/20 px-1.5 py-0.5 text-sky-100">staging</code> → <code className="rounded bg-black/20 px-1.5 py-0.5 text-sky-100">main</code> promotion PR. Enabling commerce remains a separate, deliberate production configuration change.</p><a href="https://github.com/Shimizu-Technology/marianas-open/compare/main...staging" target="_blank" rel="noreferrer" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-sky-300/20 px-4 font-semibold text-sky-200">Prepare promotion <ExternalLink className="h-4 w-4" /></a></div>
    </>}
  </div>
}
