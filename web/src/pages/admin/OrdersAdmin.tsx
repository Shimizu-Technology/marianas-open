import { CheckCircle2, CircleDollarSign, Clock3, ExternalLink, Loader2, MapPin, PackageCheck, RefreshCw, RotateCcw, Search, Truck, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, type AdminCommerceOrder, type CommerceOrder } from '../../services/api'
import CommerceDemoNotice from '../../components/shop/CommerceDemoNotice'

const money = (cents: number, currency: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)
const label = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())
const inputClass = 'w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-gold/60 focus:ring-2 focus:ring-gold/15'

function addressLines(address: Record<string, string>) {
  const locality = [address.city, [address.state, address.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  return [address.street1, address.street2, locality, address.country].filter(Boolean)
}

function methodSummary(order: AdminCommerceOrder) {
  if (order.fulfillment_method === 'pickup') return 'Deal Depot pickup'
  return [order.shipping_carrier, order.shipping_service].filter(Boolean).join(' ') || 'Delivery'
}

const actions = (order: AdminCommerceOrder): Array<{ status: CommerceOrder['fulfillment_status']; label: string }> => {
  switch (order.fulfillment.status) {
    case 'unfulfilled': return [{ status: 'preparing', label: 'Start preparing' }]
    case 'preparing': return order.fulfillment_method === 'pickup'
      ? [{ status: 'ready_for_pickup', label: 'Mark ready for pickup' }]
      : order.shipment?.label_url ? [{ status: 'shipped', label: 'Mark handed to carrier' }] : []
    case 'ready_for_pickup': return [{ status: 'picked_up', label: 'Mark picked up' }]
    case 'shipped': return [{ status: 'delivered', label: 'Mark delivered' }]
    default: return []
  }
}

export default function OrdersAdmin() {
  const [searchParams] = useSearchParams()
  const requestedOrder = searchParams.get('order')
  const loadSequence = useRef(0)
  const [orders, setOrders] = useState<AdminCommerceOrder[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [method, setMethod] = useState('')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [refundOpen, setRefundOpen] = useState(false)
  const [refundOrderId, setRefundOrderId] = useState<number | null>(null)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('requested_by_customer')
  const [refundNote, setRefundNote] = useState('')
  const [refundConfirmed, setRefundConfirmed] = useState(false)
  const [refundRequestKey, setRefundRequestKey] = useState('')

  const resetRefund = useCallback(() => {
    setRefundOpen(false); setRefundOrderId(null); setRefundAmount(''); setRefundReason('requested_by_customer')
    setRefundNote(''); setRefundConfirmed(false); setRefundRequestKey('')
  }, [])

  const load = useCallback(async (sequence: number) => {
    if (sequence !== loadSequence.current) return
    setLoading(true); setError('')
    try {
      const response = await api.admin.getOrders({ q: query.trim(), status, method })
      if (sequence !== loadSequence.current) return
      setOrders(response.orders)
      setSelectedId(current => {
        if (response.orders.some(order => order.id === current)) return current
        const requestedId = Number(requestedOrder)
        return response.orders.find(order => order.id === requestedId)?.id ?? response.orders[0]?.id ?? null
      })
    } catch (cause) { if (sequence === loadSequence.current) setError(cause instanceof Error ? cause.message : 'Orders could not be loaded.') }
    finally { if (sequence === loadSequence.current) setLoading(false) }
  }, [query, status, method, requestedOrder])

  useEffect(() => {
    const sequence = ++loadSequence.current
    const timer = window.setTimeout(() => void load(sequence), 250)
    return () => { window.clearTimeout(timer); loadSequence.current += 1 }
  }, [load])
  const selected = useMemo(() => orders.find(order => order.id === selectedId) || null, [orders, selectedId])

  useEffect(() => {
    if (refundOpen && refundOrderId !== selectedId) resetRefund()
  }, [refundOpen, refundOrderId, resetRefund, selectedId])

  const replace = (order: AdminCommerceOrder) => { setOrders(current => current.map(item => item.id === order.id ? order : item)); setSelectedId(order.id) }
  const selectOrder = (orderId: number) => { if (orderId !== selectedId) resetRefund(); setSelectedId(orderId) }
  const transition = async (next: CommerceOrder['fulfillment_status']) => {
    if (!selected) return
    setWorking(true); setError(''); setNotice('')
    try { const response = await api.admin.transitionOrder(selected.id, next); replace(response.order); setNotice(`${response.order.number} is now ${label(next).toLowerCase()}.`) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The order could not be updated.') }
    finally { setWorking(false) }
  }
  const purchaseLabel = async () => {
    if (!selected) return
    setWorking(true); setError(''); setNotice('')
    try { const response = await api.admin.purchaseOrderLabel(selected.id); replace(response.order); setNotice('Label purchased. Print it, attach it, then mark the package handed to the carrier.') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The label could not be purchased.') }
    finally { setWorking(false) }
  }

  const openRefund = () => {
    if (!selected) return
    setRefundOrderId(selected.id)
    setRefundAmount((selected.refundable_cents / 100).toFixed(2)); setRefundReason('requested_by_customer')
    setRefundNote(''); setRefundConfirmed(false); setRefundRequestKey(crypto.randomUUID()); setRefundOpen(true)
  }
  const submitRefund = async () => {
    if (!selected || selected.id !== refundOrderId) { setError('The selected order changed. Open a new refund form.'); resetRefund(); return }
    if (!refundConfirmed) return
    const cents = Math.round(Number(refundAmount) * 100)
    if (!Number.isFinite(cents) || cents <= 0) { setError('Enter a refund amount greater than zero.'); return }
    if (cents > selected.refundable_cents) { setError('The refund exceeds the available balance.'); return }
    setWorking(true); setError(''); setNotice('')
    try {
      const response = await api.admin.createOrderRefund(selected.id, { amount_cents: cents, reason: refundReason, staff_note: refundNote, request_key: refundRequestKey })
      replace(response.order); resetRefund(); setNotice(`${money(cents, selected.currency)} ${response.order.simulated ? 'demo refund recorded. No money moved.' : 'refund recorded with Stripe.'}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The refund could not be completed.')
      const sequence = ++loadSequence.current
      void load(sequence)
    }
    finally { setWorking(false) }
  }
  const reconcileRefund = async (refundId: number) => {
    if (!selected) return
    setWorking(true); setError(''); setNotice('')
    try { const response = await api.admin.reconcileOrderRefund(selected.id, refundId); replace(response.order); setNotice(response.order.simulated ? 'Demo refund status updated.' : 'Refund status reconciled with Stripe.') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The refund could not be reconciled.') }
    finally { setWorking(false) }
  }
  const reconcileOrder = async () => {
    if (!selected) return
    setWorking(true); setError(''); setNotice('')
    try { const response = await api.admin.reconcileOrder(selected.id); replace(response.order); setNotice('Payment matches Stripe.') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The payment could not be reconciled.') }
    finally { setWorking(false) }
  }

  return <div>
    <div className="mb-6 flex items-center gap-3"><PackageCheck className="h-6 w-6 text-gold" /><div><h1 className="font-heading text-2xl font-bold">Orders & fulfillment</h1><p className="mt-1 text-sm text-text-muted">Prepare Deal Depot pickups, buy delivery labels, and keep customers updated.</p></div></div>
    <div className="grid gap-3 sm:grid-cols-[1fr_180px_160px]">
      <label className="relative"><span className="sr-only">Search orders</span><Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-text-muted" /><input className={`${inputClass} pl-10`} value={query} onChange={event => setQuery(event.target.value)} placeholder="Order number, customer, or email" /></label>
      <select className={inputClass} value={status} onChange={event => setStatus(event.target.value)} aria-label="Fulfillment status"><option value="">All work stages</option><option value="unfulfilled">Needs action</option><option value="preparing">Preparing</option><option value="ready_for_pickup">Ready for pickup</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="picked_up">Picked up</option></select>
      <select className={inputClass} value={method} onChange={event => setMethod(event.target.value)} aria-label="Fulfillment method"><option value="">Pickup & delivery</option><option value="pickup">Pickup</option><option value="shipping">Delivery</option></select>
    </div>
    {error && <div role="alert" className="mt-4 rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-100">{error}</div>}
    {notice && <div role="status" className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.08] p-4 text-sm text-emerald-100">{notice}</div>}
    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(300px,.72fr)_minmax(0,1.28fr)]">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
        <div className="border-b border-white/10 px-4 py-3 text-xs font-bold uppercase tracking-[.14em] text-text-muted">{loading ? 'Loading…' : `${orders.length} paid order${orders.length === 1 ? '' : 's'}`}</div>
        {loading ? <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div> : orders.length === 0 ? <div className="p-8 text-center text-sm text-text-muted">No orders match these filters.</div> : <div className="max-h-[68vh] divide-y divide-white/5 overflow-y-auto">{orders.map(order => <button key={order.id} type="button" onClick={() => selectOrder(order.id)} className={`w-full p-4 text-left transition ${selectedId === order.id ? 'bg-gold/[0.08]' : 'hover:bg-white/[0.03]'}`}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{order.number} {order.simulated && <span className="ml-1 rounded bg-amber-300/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-200">Demo</span>}</p><p className="mt-1 text-sm text-text-secondary">{order.customer_name}</p></div><span className="shrink-0 rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-text-secondary">{label(order.fulfillment.status)}</span></div><div className="mt-3 flex items-center justify-between text-xs text-text-muted"><span>{methodSummary(order)}</span><span>{money(order.total_cents, order.currency)}</span></div></button>)}</div>}
      </section>
      <section className="min-w-0 rounded-2xl border border-white/10 bg-surface p-5 sm:p-7">
        {!selected ? <div className="flex min-h-64 items-center justify-center text-sm text-text-muted">Choose an order to see fulfillment details.</div> : <>
          {selected.simulated && <CommerceDemoNotice className="mb-6" />}
          <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-gold">{selected.fulfillment_method === 'pickup' ? 'Pickup order' : 'Delivery order'}</p><h2 className="mt-2 font-heading text-2xl font-bold">{selected.number}</h2><p className="mt-2 text-sm text-text-secondary">{selected.customer_name} · {selected.customer_email}{selected.customer_phone ? ` · ${selected.customer_phone}` : ''}</p></div><div className="rounded-xl border border-white/10 bg-black/15 px-4 py-3"><p className="text-[11px] uppercase tracking-wide text-text-muted">Current stage</p><p className="mt-1 font-semibold text-emerald-300">{label(selected.fulfillment.status)}</p></div></div>
          <div className="grid gap-6 py-6 lg:grid-cols-2"><div><h3 className="font-heading font-semibold">Pack these items</h3><div className="mt-4 space-y-3">{selected.items.map(item => <div key={item.sku} className="flex justify-between gap-4 rounded-xl bg-white/[0.035] p-3 text-sm"><div><p className="font-medium">{item.product_name}</p><p className="mt-1 text-xs text-text-muted">{item.variant_name} · {item.sku}</p></div><strong>×{item.quantity}</strong></div>)}</div></div><div><h3 className="font-heading font-semibold">Destination</h3><div className="mt-4 rounded-xl bg-white/[0.035] p-4 text-sm leading-6 text-text-secondary">{selected.fulfillment_method === 'pickup' ? <><p className="flex items-center gap-2 font-semibold text-white"><MapPin className="h-4 w-4 text-gold" />Deal Depot pickup</p><p className="mt-2">Customer pickup details are already on their order status page.</p></> : <><p className="flex items-center gap-2 font-semibold text-white"><Truck className="h-4 w-4 text-gold" />{methodSummary(selected)}</p>{addressLines(selected.shipping_address).map(line => <div key={line}>{line}</div>)}</>}</div></div></div>
          {selected.fulfillment_method === 'shipping' && <div className="mb-6 rounded-2xl border border-white/10 bg-black/15 p-5">
            <h3 className="font-heading font-semibold">Shipping label</h3>
            {selected.shipment?.label_url ? <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 text-sm text-text-secondary"><p className="font-medium text-white">{selected.shipment.carrier} {selected.shipment.service}</p><p className="mt-1 break-all">{selected.simulated ? 'Demo tracking reference' : 'Tracking'} {selected.shipment.tracking_code}</p><p className="mt-1 text-xs">{selected.simulated ? 'No label was purchased or created.' : `EasyPost ${selected.shipment.provider_mode} mode`}</p></div>
              {!selected.simulated && <a href={selected.shipment.label_url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gold/30 px-4 py-2.5 text-sm font-semibold text-gold"><ExternalLink className="h-4 w-4" />Open printable label</a>}
            </div> : <>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{selected.simulated ? 'Record a simulated label to test the fulfillment steps. This will not contact EasyPost, purchase postage, or create a usable label.' : 'This purchases the exact EasyPost rate the customer paid for. Check the packed order and destination first.'}</p>
              <button type="button" disabled={working || selected.fulfillment.status !== 'preparing'} onClick={() => void purchaseLabel()} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-bold text-navy-900 disabled:cursor-not-allowed disabled:opacity-45">{working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}{selected.simulated ? 'Record demo label' : 'Purchase shipping label'}</button>
              {selected.fulfillment.status !== 'preparing' && <p className="mt-2 text-xs text-text-muted">Start preparing the order before {selected.simulated ? 'recording a demo label' : 'buying its label'}.</p>}
            </>}
          </div>}
          <div className="mb-6 rounded-2xl border border-white/10 bg-black/15 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><CircleDollarSign className="h-5 w-5 text-gold" /><h3 className="font-heading font-semibold">Payment & refunds</h3></div><p className="mt-2 text-sm text-text-secondary">{selected.simulated ? 'All amounts are demo figures. Simulated refunds move no money.' : 'Refunds return money to the original Stripe payment method.'}</p></div>{!selected.simulated && <button type="button" onClick={() => void reconcileOrder()} disabled={working} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-text-secondary transition hover:border-white/20 hover:text-white disabled:opacity-50"><RefreshCw className="h-4 w-4" />Reconcile payment</button>}</div>
            <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-white/10"><div className="bg-surface/80 p-3"><p className="text-[10px] uppercase tracking-wide text-text-muted">{selected.simulated ? 'Simulated' : 'Paid'}</p><p className="mt-1 font-semibold">{money(selected.total_cents, selected.currency)}</p></div><div className="bg-surface/80 p-3"><p className="text-[10px] uppercase tracking-wide text-text-muted">Refunded</p><p className="mt-1 font-semibold text-amber-200">{money(selected.refunded_cents, selected.currency)}</p></div><div className="bg-surface/80 p-3"><p className="text-[10px] uppercase tracking-wide text-text-muted">Available</p><p className="mt-1 font-semibold text-emerald-200">{money(selected.refundable_cents, selected.currency)}</p></div></div>
            {selected.payment_error && <div role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.07] p-3 text-sm text-red-100">{selected.payment_error}</div>}
            {selected.refunds.length > 0 && <div className="mt-4 divide-y divide-white/5 border-y border-white/5">{selected.refunds.map(refund => <div key={refund.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">{money(refund.amount_cents, refund.currency)} · {label(refund.status)}</p><p className="mt-1 text-xs text-text-muted">{label(refund.reason)} · {refund.source === 'admin' ? refund.staff_note : 'Created in Stripe Dashboard'}</p>{refund.failure_reason && <p className="mt-1 text-xs text-red-200">{refund.failure_reason}</p>}</div>{['pending_provider', 'pending', 'requires_action', 'error'].includes(refund.status) && <button type="button" onClick={() => void reconcileRefund(refund.id)} disabled={working} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-300/20 px-4 text-sm font-semibold text-amber-200 disabled:opacity-50"><RotateCcw className="h-4 w-4" />{selected.simulated ? 'Check demo refund' : 'Check Stripe'}</button>}</div>)}</div>}
            {!refundOpen && selected.refundable_cents > 0 && <button type="button" onClick={openRefund} disabled={working} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-300/25 px-4 text-sm font-semibold text-amber-200 transition hover:bg-amber-300/[0.06] disabled:opacity-50"><RotateCcw className="h-4 w-4" />{selected.simulated ? 'Simulate a refund' : 'Issue a refund'}</button>}
            {refundOpen && <div className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/[0.045] p-4"><div className="flex items-start justify-between gap-3"><div><h4 className="font-semibold text-amber-100">{selected.simulated ? 'Simulate refund' : 'Issue Stripe refund'}</h4><p className="mt-1 text-xs leading-5 text-text-muted">Maximum {money(selected.refundable_cents, selected.currency)}. {selected.simulated ? 'No funds will move.' : 'This action cannot be undone.'}</p></div><button type="button" onClick={resetRefund} className="flex h-11 w-11 items-center justify-center rounded-full text-text-muted hover:bg-white/5 hover:text-white" aria-label="Close refund form"><X className="h-4 w-4" /></button></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs text-text-muted"><span className="mb-1.5 block">Amount ({selected.currency})</span><input type="number" min="0.01" step="0.01" max={(selected.refundable_cents / 100).toFixed(2)} value={refundAmount} onChange={event => setRefundAmount(event.target.value)} className={inputClass} /></label><label className="text-xs text-text-muted"><span className="mb-1.5 block">Reason</span><select value={refundReason} onChange={event => setRefundReason(event.target.value)} className={inputClass}><option value="requested_by_customer">Customer request</option><option value="duplicate">Duplicate payment</option><option value="fraudulent">Fraudulent payment</option></select></label></div><label className="mt-3 block text-xs text-text-muted"><span className="mb-1.5 block">Internal note</span><textarea value={refundNote} onChange={event => setRefundNote(event.target.value)} rows={3} placeholder="Why is this refund being issued?" className={`${inputClass} py-3`} /></label><label className="mt-4 flex cursor-pointer items-start gap-3 text-sm leading-6 text-text-secondary"><input type="checkbox" checked={refundConfirmed} onChange={event => setRefundConfirmed(event.target.checked)} className="mt-1 h-4 w-4 accent-amber-300" /><span>I verified the amount and understand that merchandise is not automatically returned to inventory.</span></label><button type="button" onClick={() => void submitRefund()} disabled={working || !refundConfirmed || refundNote.trim().length < 3} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-300 px-5 text-sm font-bold text-navy-950 disabled:cursor-not-allowed disabled:opacity-45">{working ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}Refund {refundAmount ? money(Math.max(Math.round(Number(refundAmount) * 100) || 0, 0), selected.currency) : ''}</button></div>}
            <p className="mt-4 text-xs leading-5 text-text-muted">Inventory stays unchanged. Record returned merchandise through the inventory adjustment workflow only after Deal Depot physically receives it.</p>
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.045] p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">Next step</p><p className="mt-1 text-sm text-text-secondary">{selected.simulated ? 'Advance this demo workflow without any physical handoff.' : 'Only advance the order after the physical handoff is actually complete.'}</p></div><div className="flex flex-wrap gap-2">{actions(selected).map(action => <button key={action.status} type="button" disabled={working} onClick={() => void transition(action.status)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-bold text-navy-950 disabled:opacity-50">{working ? <Loader2 className="h-4 w-4 animate-spin" /> : selected.fulfillment_method === 'pickup' ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}{action.label}</button>)}</div></div>
        </>}
      </section>
    </div>
  </div>
}
