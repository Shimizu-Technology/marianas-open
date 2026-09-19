import { CheckCircle2, Clock3, Loader2, MapPin, PackageCheck, RefreshCw, TriangleAlert, Truck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useCommerce } from '../contexts/CommerceContext'
import { api, type CommerceOrder } from '../services/api'
import CommerceDemoNotice from '../components/shop/CommerceDemoNotice'

const money = (cents: number, currency: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)

function addressLines(address: Record<string, string>) {
  const locality = [address.city, [address.state, address.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  return [address.street1, address.street2, locality, address.country].filter(Boolean)
}

function nextStep(order: CommerceOrder) {
  if (order.simulated) return 'This is a demo record for trying the order workflow. Deal Depot will not pack it, ship it, or prepare it for pickup.'
  if (order.fulfillment_method === 'pickup') {
    if (order.fulfillment_status === 'picked_up') return 'This order was picked up. Thanks for supporting the Marianas Open.'
    if (order.fulfillment_status === 'ready_for_pickup') return 'Your order is ready at Deal Depot. Bring your order number when you pick it up.'
    if (order.fulfillment_status === 'preparing') return 'Deal Depot is preparing your items for pickup.'
    return 'Deal Depot will prepare your items. Contact the Marianas Open team before heading over if you need timing details.'
  }
  if (order.fulfillment_status === 'delivered') return 'The carrier marked this package delivered.'
  if (order.fulfillment_status === 'shipped') return 'Your package has been handed to the carrier. Use the tracking details below for updates.'
  if (order.shipment) return 'Your label is ready and Deal Depot is preparing the package for carrier handoff.'
  if (order.fulfillment_status === 'preparing') return 'Deal Depot is packing your items. We’ll email tracking as soon as the label is created.'
  return 'Deal Depot will pack your items. We’ll email tracking as soon as the shipping label is created.'
}

const fulfillmentLabel = (status: CommerceOrder['fulfillment_status']) => status.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())

const statusContent = {
  pending_payment: { icon: Clock3, title: 'Confirming your payment', body: 'Stripe is finishing the payment confirmation. This page will update automatically.', tone: 'text-amber-300' },
  paid: { icon: CheckCircle2, title: 'Your order is confirmed', body: 'Payment is complete and your order is now with the Marianas Open team.', tone: 'text-emerald-400' },
  payment_failed: { icon: TriangleAlert, title: 'Payment was not completed', body: 'Nothing was captured. Please return to the shop and try again.', tone: 'text-red-300' },
  expired: { icon: Clock3, title: 'This checkout expired', body: 'The inventory hold ended without a completed payment. You can start a fresh checkout from the shop.', tone: 'text-amber-300' },
  cancelled: { icon: TriangleAlert, title: 'This order was cancelled', body: 'This order is no longer active.', tone: 'text-text-secondary' },
}

export default function OrderConfirmationPage() {
  const { token = '' } = useParams()
  const [searchParams] = useSearchParams()
  const { clearCartForCheckout, fakeCheckoutEnabled } = useCommerce()
  const [order, setOrder] = useState<CommerceOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [completingTest, setCompletingTest] = useState(false)
  const [error, setError] = useState('')
  const localTestCheckout = fakeCheckoutEnabled && searchParams.get('test_checkout') === '1'

  const loadOrder = useCallback(async () => {
    try {
      const result = await api.getShopOrder(token)
      setOrder(result.order)
      setError('')
      if (result.order.status === 'paid') clearCartForCheckout(token)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not load this order.')
    } finally {
      setLoading(false)
    }
  }, [token, clearCartForCheckout])

  useEffect(() => { void loadOrder() }, [loadOrder])
  useEffect(() => {
    const awaitingPayment = order?.status === 'pending_payment' && !localTestCheckout
    const awaitingRefund = order?.refund_status === 'pending'
    if (!awaitingPayment && !awaitingRefund) return
    const interval = window.setInterval(() => void loadOrder(), 2500)
    return () => window.clearInterval(interval)
  }, [order?.status, order?.refund_status, localTestCheckout, loadOrder])

  const completeTestPayment = async () => {
    setCompletingTest(true)
    setError('')
    try {
      const result = await api.completeTestPayment(token)
      setOrder(result.order)
      clearCartForCheckout(token)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The test payment could not be completed.')
    } finally {
      setCompletingTest(false)
    }
  }

  if (loading) return <div className="min-h-screen px-4 pt-40 text-center text-text-secondary"><Loader2 className="mx-auto mb-4 h-7 w-7 animate-spin text-gold" />Loading your order…</div>
  if (!order) return <div className="min-h-screen px-4 pt-40 text-center"><TriangleAlert className="mx-auto h-10 w-10 text-red-300" /><h1 className="mt-5 font-heading text-3xl font-bold">We couldn’t find that order</h1><p className="mt-3 text-text-secondary">{error || 'Check the link in your payment confirmation and try again.'}</p><Link to="/shop" className="mt-7 inline-flex rounded-full bg-gold px-6 py-3 font-bold text-navy-900">Return to the shop</Link></div>

  const content = statusContent[order.status]
  const StatusIcon = content.icon
  const pickup = order.pickup_location

  return (
    <div className="min-h-screen px-4 pb-24 pt-32 sm:px-6 sm:pt-36">
      <div className="mx-auto max-w-4xl">
        {order.simulated && <CommerceDemoNotice className="mb-6" />}
        <section className="rounded-3xl border border-white/10 bg-surface p-6 sm:p-9">
          <StatusIcon className={`h-12 w-12 ${content.tone}`} />
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-gold">Order {order.number}</p>
          <h1 className="mt-2 font-heading text-3xl font-bold sm:text-4xl">{order.simulated && order.status === 'paid' ? 'Demo order completed' : content.title}</h1>
          <p className="mt-3 max-w-2xl leading-7 text-text-secondary">{order.simulated ? 'No payment was made. This order exists only to demonstrate the shop and fulfillment workflow.' : content.body}</p>
          {order.status === 'paid' && <div className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.055] p-5"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">{order.simulated ? 'Preview status' : 'What happens next'}</p><span className="rounded-full border border-emerald-300/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-100">{fulfillmentLabel(order.fulfillment_status)}</span></div><p className="mt-2 text-sm leading-6 text-text-secondary">{nextStep(order)}</p><p className="mt-3 text-xs text-text-muted">{order.simulated ? 'No confirmation email or physical handoff will occur.' : `Keep this status link for future updates. Confirmations are addressed to ${order.customer_email}.`}</p></div>}
          {order.refund_status !== 'none' && <div role="status" className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/[0.055] p-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200">{order.simulated ? 'Demo refund' : 'Refund update'}</p><p className="mt-2 text-sm leading-6 text-text-secondary">{order.simulated ? `${money(order.refunded_cents, order.currency)} was marked refunded in the demo. No money moved.` : order.refund_status === 'pending' ? 'A refund is being processed by Stripe. This page will reflect it when the refund completes.' : `${money(order.refunded_cents, order.currency)} has been refunded to the original payment method. Your bank may take several business days to display it.`}</p></div>}
          {searchParams.get('payment') === 'cancelled' && order.status === 'pending_payment' && <div className="mt-5 rounded-xl border border-amber-300/25 bg-amber-300/[0.07] p-4 text-sm text-amber-100">Nothing was charged. Your items are still held, so you can safely resume this same checkout without creating another order.</div>}
          {error && <div role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100">{error}</div>}

          {localTestCheckout && order.status === 'pending_payment' && (
            <div className="mt-7 rounded-2xl border border-sky-300/25 bg-sky-300/[0.06] p-5"><p className="font-semibold text-sky-100">Simulated payment</p><p className="mt-2 text-sm leading-6 text-text-secondary">Complete this demo order without a card or charge. It will appear in the admin order workflow, but no merchandise will be fulfilled.</p><button type="button" onClick={() => void completeTestPayment()} disabled={completingTest} className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-bold text-navy-900 disabled:opacity-50">{completingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Complete demo payment</button></div>
          )}

          {order.status === 'pending_payment' && !localTestCheckout && <button type="button" onClick={() => void loadOrder()} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-gold"><RefreshCw className="h-4 w-4" /> Check payment status</button>}
          {order.status === 'pending_payment' && order.checkout_url && searchParams.get('payment') === 'cancelled' && <a href={order.checkout_url} className="ml-5 mt-6 inline-flex rounded-full bg-gold px-5 py-3 text-sm font-bold text-navy-900">Resume secure payment</a>}

          <div className="mt-8 grid gap-6 border-t border-white/10 pt-8 lg:grid-cols-[1.15fr_.85fr]">
            <div><h2 className="font-heading text-xl font-semibold">Order details</h2><div className="mt-5 space-y-4">{order.items.map(item => <div key={item.sku} className="flex justify-between gap-4 text-sm"><div><p className="font-medium">{item.product_name}</p><p className="mt-1 text-xs text-text-muted">{item.variant_name} · Qty {item.quantity}</p></div><span>{money(item.line_total_cents, order.currency)}</span></div>)}</div><div className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm"><div className="flex justify-between text-text-secondary"><span>Subtotal</span><span>{money(order.subtotal_cents, order.currency)}</span></div><div className="flex justify-between text-text-secondary"><span>{order.fulfillment_method === 'pickup' ? 'Pickup' : 'Shipping'}</span><span>{order.shipping_cents ? money(order.shipping_cents, order.currency) : 'Free'}</span></div>{order.tax_cents > 0 && <div className="flex justify-between text-text-secondary"><span>Tax</span><span>{money(order.tax_cents, order.currency)}</span></div>}<div className="flex justify-between border-t border-white/10 pt-4 font-heading text-xl font-semibold"><span>Total</span><span>{money(order.total_cents, order.currency)}</span></div>{order.refunded_cents > 0 && <div className="flex justify-between font-semibold text-amber-200"><span>Refunded</span><span>−{money(order.refunded_cents, order.currency)}</span></div>}</div></div>
            <div className="rounded-2xl bg-white/[0.035] p-5"><div className="flex items-center gap-3">{order.fulfillment_method === 'pickup' ? <MapPin className="h-5 w-5 text-gold" /> : <Truck className="h-5 w-5 text-gold" />}<h2 className="font-heading text-lg font-semibold">{order.fulfillment_method === 'pickup' ? 'Deal Depot pickup' : 'Delivery'}</h2></div>{pickup ? <div className="mt-4 text-sm leading-6 text-text-secondary"><strong className="text-white">{pickup.name}</strong>{addressLines(pickup.address).map(line => <div key={line}>{line}</div>)}{order.simulated ? <p className="mt-3">Demo pickup only. No item is held at Deal Depot and no pickup should be attempted.</p> : pickup.pickup_instructions && <p className="mt-3">{pickup.pickup_instructions}</p>}</div> : <div className="mt-4 text-sm leading-6 text-text-secondary">{order.shipping_carrier && <p className="font-medium text-white">{order.shipping_carrier} {order.shipping_service}</p>}{addressLines(order.shipping_address).map(line => <div key={line}>{line}</div>)}{order.shipment && <div className="mt-4 rounded-xl border border-white/10 bg-black/15 p-3"><p className="text-xs uppercase tracking-wide text-text-muted">Tracking</p><p className="mt-1 break-all font-medium text-white">{order.shipment.tracking_code}</p>{order.shipment.tracking_url && <a href={order.shipment.tracking_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center rounded-full border border-gold/30 px-4 py-2 text-sm font-semibold text-gold">Track package</a>}</div>}</div>}<div className="mt-5 flex items-start gap-2 border-t border-white/10 pt-4 text-xs leading-5 text-text-muted"><PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />{order.simulated ? 'No emails will be sent for this demo order.' : `Updates will be sent to ${order.customer_email}.`}</div></div>
          </div>
        </section>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-center"><Link to="/shop" className="text-sm font-semibold text-gold hover:text-gold-300">Return to the shop</Link><Link to="/shop/order-status" className="text-sm font-semibold text-text-secondary hover:text-white">Find another order</Link></div>
      </div>
    </div>
  )
}
