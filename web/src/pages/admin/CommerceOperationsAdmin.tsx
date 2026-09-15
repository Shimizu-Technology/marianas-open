import { AlertTriangle, ArrowRight, CircleDollarSign, Download, Loader2, RefreshCw, RotateCcw, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type CommerceOperationsSnapshot } from '../../services/api'

const money = (cents: number, currency: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)
const label = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())
const inputClass = 'min-h-11 rounded-xl border border-white/10 bg-black/20 px-3.5 text-sm text-text-primary outline-none transition focus:border-gold/60 focus:ring-2 focus:ring-gold/15'

function dateInputValue(date: Date) {
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

export default function CommerceOperationsAdmin() {
  const loadSequence = useRef(0)
  const [from, setFrom] = useState(() => { const date = new Date(); date.setDate(date.getDate() - 29); return dateInputValue(date) })
  const [to, setTo] = useState(() => dateInputValue(new Date()))
  const [snapshot, setSnapshot] = useState<CommerceOperationsSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const sequence = ++loadSequence.current
    setLoading(true); setError('')
    try {
      const nextSnapshot = await api.admin.getCommerceOperations({ from, to })
      if (sequence === loadSequence.current) setSnapshot(nextSnapshot)
    } catch (cause) {
      if (sequence === loadSequence.current) setError(cause instanceof Error ? cause.message : 'Commerce operations could not be loaded.')
    } finally {
      if (sequence === loadSequence.current) setLoading(false)
    }
  }, [from, to])

  useEffect(() => { void load() }, [load])

  const download = async () => {
    setDownloading(true); setError('')
    try {
      const blob = await api.admin.downloadCommerceReport({ from, to })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url; anchor.download = `marianas-open-commerce-${from}-to-${to}.csv`; anchor.click()
      URL.revokeObjectURL(url)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The report could not be downloaded.') }
    finally { setDownloading(false) }
  }

  const currency = snapshot?.summary.currency || 'USD'
  const cards = snapshot ? [
    { label: 'Gross collected', value: money(snapshot.summary.gross_cents, currency), detail: `${snapshot.summary.paid_orders} paid orders`, tone: 'text-white' },
    { label: 'Refunds issued', value: money(snapshot.summary.refunded_cents, currency), detail: 'Processed in this period', tone: 'text-amber-200' },
    { label: 'Net activity', value: money(snapshot.summary.net_cents, currency), detail: 'Gross less issued refunds', tone: 'text-emerald-300' },
    { label: 'Shipping collected', value: money(snapshot.summary.shipping_cents, currency), detail: `Tax ${money(snapshot.summary.tax_cents, currency)}`, tone: 'text-sky-200' },
  ] : []

  return <div>
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-2xl"><div className="flex items-center gap-3"><CircleDollarSign className="h-6 w-6 text-gold" /><h1 className="font-heading text-2xl font-bold">Commerce operations</h1></div><p className="mt-2 text-sm leading-6 text-text-muted">Reconcile Stripe payments, review refunds, and catch exceptions before they become customer problems.</p></div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-end"><label className="text-xs text-text-muted"><span className="mb-1.5 block">From</span><input type="date" value={from} onChange={event => setFrom(event.target.value)} className={inputClass} /></label><label className="text-xs text-text-muted"><span className="mb-1.5 block">To</span><input type="date" value={to} onChange={event => setTo(event.target.value)} className={inputClass} /></label><button type="button" onClick={() => void download()} disabled={downloading || loading} className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gold/30 px-4 text-sm font-semibold text-gold transition hover:bg-gold/10 disabled:opacity-50"><Download className="h-4 w-4" />{downloading ? 'Preparing…' : 'Download CSV'}</button></div>
    </div>

    {error && <div role="alert" className="mt-5 rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-100">{error}</div>}
    {loading ? <div className="flex h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-gold" /></div> : snapshot && <>
      <div className="mt-7 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 xl:grid-cols-4">{cards.map(card => <div key={card.label} className="bg-surface p-5"><p className="text-[11px] font-bold uppercase tracking-[.15em] text-text-muted">{card.label}</p><p className={`mt-3 font-heading text-2xl font-bold ${card.tone}`}>{card.value}</p><p className="mt-1 text-xs text-text-muted">{card.detail}</p></div>)}</div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface"><div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><h2 className="font-heading font-semibold">Needs attention</h2><p className="mt-1 text-xs text-text-muted">Live exceptions across payments, messages, shipping, and refunds.</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${snapshot.alerts.length ? 'bg-amber-300/10 text-amber-200' : 'bg-emerald-300/10 text-emerald-200'}`}>{snapshot.alerts.length}</span></div>{snapshot.alerts.length === 0 ? <div className="p-8 text-center"><ShieldCheck className="mx-auto h-9 w-9 text-emerald-300" /><p className="mt-3 font-medium">No operational exceptions</p><p className="mt-1 text-sm text-text-muted">Payments, customer messages, shipments, and refunds look clear.</p></div> : <div className="divide-y divide-white/5">{snapshot.alerts.map(alert => <div key={alert.key} className="p-5"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{alert.title}</p><span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-wide text-text-muted">{alert.category}</span></div><p className="mt-1 break-words text-sm leading-6 text-text-secondary">{alert.detail}</p>{alert.order_id && <Link to={`/admin/commerce/orders?order=${alert.order_id}`} className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-gold">Open {alert.order_number}<ArrowRight className="h-4 w-4" /></Link>}</div></div></div>)}</div>}</section>

        <div className="space-y-6"><section className="rounded-2xl border border-white/10 bg-surface p-5"><div className="flex items-center gap-3"><RefreshCw className="h-5 w-5 text-sky-200" /><h2 className="font-heading font-semibold">Stripe reconciliation</h2></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-emerald-300/[0.06] p-4"><p className="text-2xl font-bold text-emerald-200">{snapshot.reconciliation.current}</p><p className="mt-1 text-xs text-text-muted">Current</p></div><div className="rounded-xl bg-amber-300/[0.06] p-4"><p className="text-2xl font-bold text-amber-200">{snapshot.reconciliation.due}</p><p className="mt-1 text-xs text-text-muted">Due for check</p></div></div><p className="mt-4 text-xs leading-5 text-text-muted">The background worker checks paid orders every six hours. You can also reconcile a single order from its detail view.</p></section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface"><div className="border-b border-white/10 px-5 py-4"><div className="flex items-center gap-3"><RotateCcw className="h-5 w-5 text-amber-200" /><h2 className="font-heading font-semibold">Recent refunds</h2></div></div>{snapshot.recent_refunds.length === 0 ? <p className="p-5 text-sm text-text-muted">No refunds recorded yet.</p> : <div className="divide-y divide-white/5">{snapshot.recent_refunds.slice(0, 8).map(refund => <Link key={refund.id} to={`/admin/commerce/orders?order=${refund.order_id}`} className="flex min-h-16 items-center justify-between gap-3 px-5 py-3 transition hover:bg-white/[0.025]"><div className="min-w-0"><p className="truncate text-sm font-medium">{refund.order_number}</p><p className="mt-1 text-xs text-text-muted">{label(refund.reason)} · {label(refund.status)}</p></div><span className="shrink-0 font-semibold text-amber-200">{money(refund.amount_cents, refund.currency)}</span></Link>)}</div>}</section></div>
      </div>
    </>}
  </div>
}
