import { CheckCircle2, Clock3, Loader2, MapPin, PackageCheck, RefreshCw, TriangleAlert, Truck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useCommerce } from '../contexts/CommerceContext'
import { api, type CommerceOrder } from '../services/api'

const money = (cents: number, currency: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)

function addressLines(address: Record<string, string>) {
  const locality = [address.city, [address.state, address.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  return [address.street1, address.street2, locality, address.country].filter(Boolean)
}

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
  const { clearCart } = useCommerce()
  const [order, setOrder] = useState<CommerceOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [completingTest, setCompletingTest] = useState(false)
  const [error, setError] = useState('')

  const loadOrder = useCallback(async () => {
    try {
      const result = await api.getShopOrder(token)
      setOrder(result.order)
      setError('')
      if (result.order.status === 'paid') clearCart()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not load this order.')
    } finally {
      setLoading(false)
    }
  }, [token, clearCart])

  useEffect(() => { void loadOrder() }, [loadOrder])
  useEffect(() => {
    if (order?.status !== 'pending_payment' || searchParams.get('test_checkout') === '1') return
    const interval = window.setInterval(() => void loadOrder(), 2500)
    return () => window.clearInterval(interval)
  }, [order?.status, searchParams, loadOrder])

  const completeTestPayment = async () => {
    setCompletingTest(true)
    setError('')
    try {
      const result = await api.completeTestPayment(token)
      setOrder(result.order)
      clearCart()
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
        <section className="rounded-3xl border border-white/10 bg-surface p-6 sm:p-9">
          <StatusIcon className={`h-12 w-12 ${content.tone}`} />
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-gold">Order {order.number}</p>
          <h1 className="mt-2 font-heading text-3xl font-bold sm:text-4xl">{content.title}</h1>
          <p className="mt-3 max-w-2xl leading-7 text-text-secondary">{content.body}</p>
          {searchParams.get('payment') === 'cancelled' && order.status === 'pending_payment' && <div className="mt-5 rounded-xl border border-amber-300/25 bg-amber-300/[0.07] p-4 text-sm text-amber-100">Nothing was charged. Your items are still held, so you can safely resume this same checkout without creating another order.</div>}
          {error && <div role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100">{error}</div>}

          {searchParams.get('test_checkout') === '1' && order.status === 'pending_payment' && (
            <div className="mt-7 rounded-2xl border border-sky-300/25 bg-sky-300/[0.06] p-5"><p className="font-semibold text-sky-100">Local Stripe test substitute</p><p className="mt-2 text-sm leading-6 text-text-secondary">This button simulates Stripe’s signed payment-complete webhook for local browser testing. Staging and production never expose it.</p><button type="button" onClick={() => void completeTestPayment()} disabled={completingTest} className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-bold text-navy-900 disabled:opacity-50">{completingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Complete test payment</button></div>
          )}

          {order.status === 'pending_payment' && searchParams.get('test_checkout') !== '1' && <button type="button" onClick={() => void loadOrder()} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-gold"><RefreshCw className="h-4 w-4" /> Check payment status</button>}
          {order.status === 'pending_payment' && order.checkout_url && searchParams.get('payment') === 'cancelled' && <a href={order.checkout_url} className="ml-5 mt-6 inline-flex rounded-full bg-gold px-5 py-3 text-sm font-bold text-navy-900">Resume secure payment</a>}

          <div className="mt-8 grid gap-6 border-t border-white/10 pt-8 lg:grid-cols-[1.15fr_.85fr]">
            <div><h2 className="font-heading text-xl font-semibold">Order details</h2><div className="mt-5 space-y-4">{order.items.map(item => <div key={item.sku} className="flex justify-between gap-4 text-sm"><div><p className="font-medium">{item.product_name}</p><p className="mt-1 text-xs text-text-muted">{item.variant_name} · Qty {item.quantity}</p></div><span>{money(item.line_total_cents, order.currency)}</span></div>)}</div><div className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm"><div className="flex justify-between text-text-secondary"><span>Subtotal</span><span>{money(order.subtotal_cents, order.currency)}</span></div><div className="flex justify-between text-text-secondary"><span>{order.fulfillment_method === 'pickup' ? 'Pickup' : 'Shipping'}</span><span>{order.shipping_cents ? money(order.shipping_cents, order.currency) : 'Free'}</span></div><div className="flex justify-between border-t border-white/10 pt-4 font-heading text-xl font-semibold"><span>Total</span><span>{money(order.total_cents, order.currency)}</span></div></div></div>
            <div className="rounded-2xl bg-white/[0.035] p-5"><div className="flex items-center gap-3">{order.fulfillment_method === 'pickup' ? <MapPin className="h-5 w-5 text-gold" /> : <Truck className="h-5 w-5 text-gold" />}<h2 className="font-heading text-lg font-semibold">{order.fulfillment_method === 'pickup' ? 'Deal Depot pickup' : 'Delivery'}</h2></div>{pickup ? <div className="mt-4 text-sm leading-6 text-text-secondary"><strong className="text-white">{pickup.name}</strong>{addressLines(pickup.address).map(line => <div key={line}>{line}</div>)}{pickup.pickup_instructions && <p className="mt-3">{pickup.pickup_instructions}</p>}</div> : <div className="mt-4 text-sm leading-6 text-text-secondary">{order.shipping_carrier && <p className="font-medium text-white">{order.shipping_carrier} {order.shipping_service}</p>}{addressLines(order.shipping_address).map(line => <div key={line}>{line}</div>)}</div>}<div className="mt-5 flex items-start gap-2 border-t border-white/10 pt-4 text-xs leading-5 text-text-muted"><PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />Updates will be sent to {order.customer_email}.</div></div>
          </div>
        </section>
        <div className="mt-6 text-center"><Link to="/shop" className="text-sm font-semibold text-gold hover:text-gold-300">Return to the shop</Link></div>
      </div>
    </div>
  )
}
