import { CheckCircle2, Clock3, ExternalLink, Loader2, MapPin, PackageCheck, Search, Truck } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, type AdminCommerceOrder, type CommerceOrder } from '../../services/api'

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
  const [orders, setOrders] = useState<AdminCommerceOrder[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [method, setMethod] = useState('')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const response = await api.admin.getOrders({ q: query.trim(), status, method })
      setOrders(response.orders)
      setSelectedId(current => response.orders.some(order => order.id === current) ? current : response.orders[0]?.id ?? null)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Orders could not be loaded.') }
    finally { setLoading(false) }
  }, [query, status, method])

  useEffect(() => { const timer = window.setTimeout(() => void load(), 250); return () => window.clearTimeout(timer) }, [load])
  const selected = useMemo(() => orders.find(order => order.id === selectedId) || null, [orders, selectedId])

  const replace = (order: AdminCommerceOrder) => { setOrders(current => current.map(item => item.id === order.id ? order : item)); setSelectedId(order.id) }
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
        {loading ? <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div> : orders.length === 0 ? <div className="p-8 text-center text-sm text-text-muted">No orders match these filters.</div> : <div className="max-h-[68vh] divide-y divide-white/5 overflow-y-auto">{orders.map(order => <button key={order.id} type="button" onClick={() => setSelectedId(order.id)} className={`w-full p-4 text-left transition ${selectedId === order.id ? 'bg-gold/[0.08]' : 'hover:bg-white/[0.03]'}`}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{order.number}</p><p className="mt-1 text-sm text-text-secondary">{order.customer_name}</p></div><span className="shrink-0 rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-text-secondary">{label(order.fulfillment.status)}</span></div><div className="mt-3 flex items-center justify-between text-xs text-text-muted"><span>{methodSummary(order)}</span><span>{money(order.total_cents, order.currency)}</span></div></button>)}</div>}
      </section>
      <section className="min-w-0 rounded-2xl border border-white/10 bg-surface p-5 sm:p-7">
        {!selected ? <div className="flex min-h-64 items-center justify-center text-sm text-text-muted">Choose an order to see fulfillment details.</div> : <>
          <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-gold">{selected.fulfillment_method === 'pickup' ? 'Pickup order' : 'Delivery order'}</p><h2 className="mt-2 font-heading text-2xl font-bold">{selected.number}</h2><p className="mt-2 text-sm text-text-secondary">{selected.customer_name} · {selected.customer_email}{selected.customer_phone ? ` · ${selected.customer_phone}` : ''}</p></div><div className="rounded-xl border border-white/10 bg-black/15 px-4 py-3"><p className="text-[11px] uppercase tracking-wide text-text-muted">Current stage</p><p className="mt-1 font-semibold text-emerald-300">{label(selected.fulfillment.status)}</p></div></div>
          <div className="grid gap-6 py-6 lg:grid-cols-2"><div><h3 className="font-heading font-semibold">Pack these items</h3><div className="mt-4 space-y-3">{selected.items.map(item => <div key={item.sku} className="flex justify-between gap-4 rounded-xl bg-white/[0.035] p-3 text-sm"><div><p className="font-medium">{item.product_name}</p><p className="mt-1 text-xs text-text-muted">{item.variant_name} · {item.sku}</p></div><strong>×{item.quantity}</strong></div>)}</div></div><div><h3 className="font-heading font-semibold">Destination</h3><div className="mt-4 rounded-xl bg-white/[0.035] p-4 text-sm leading-6 text-text-secondary">{selected.fulfillment_method === 'pickup' ? <><p className="flex items-center gap-2 font-semibold text-white"><MapPin className="h-4 w-4 text-gold" />Deal Depot pickup</p><p className="mt-2">Customer pickup details are already on their order status page.</p></> : <><p className="flex items-center gap-2 font-semibold text-white"><Truck className="h-4 w-4 text-gold" />{methodSummary(selected)}</p>{addressLines(selected.shipping_address).map(line => <div key={line}>{line}</div>)}</>}</div></div></div>
          {selected.fulfillment_method === 'shipping' && <div className="mb-6 rounded-2xl border border-white/10 bg-black/15 p-5"><h3 className="font-heading font-semibold">Shipping label</h3>{selected.shipment?.label_url ? <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0 text-sm text-text-secondary"><p className="font-medium text-white">{selected.shipment.carrier} {selected.shipment.service}</p><p className="mt-1 break-all">Tracking {selected.shipment.tracking_code}</p><p className="mt-1 text-xs">EasyPost {selected.shipment.provider_mode} mode</p></div><a href={selected.shipment.label_url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gold/30 px-4 py-2.5 text-sm font-semibold text-gold"><ExternalLink className="h-4 w-4" />Open printable label</a></div> : <><p className="mt-2 text-sm leading-6 text-text-secondary">This purchases the exact EasyPost rate the customer paid for. Check the packed order and destination first.</p><button type="button" disabled={working || selected.fulfillment.status !== 'preparing'} onClick={() => void purchaseLabel()} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-bold text-navy-900 disabled:cursor-not-allowed disabled:opacity-45">{working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}Purchase shipping label</button>{selected.fulfillment.status !== 'preparing' && <p className="mt-2 text-xs text-text-muted">Start preparing the order before buying its label.</p>}</>}</div>}
          <div className="flex flex-col gap-3 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.045] p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">Next step</p><p className="mt-1 text-sm text-text-secondary">Only advance the order after the physical handoff is actually complete.</p></div><div className="flex flex-wrap gap-2">{actions(selected).map(action => <button key={action.status} type="button" disabled={working} onClick={() => void transition(action.status)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-bold text-navy-950 disabled:opacity-50">{working ? <Loader2 className="h-4 w-4 animate-spin" /> : selected.fulfillment_method === 'pickup' ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}{action.label}</button>)}</div></div>
        </>}
      </section>
    </div>
  </div>
}
