import { ArrowLeft, Check, Clock3, Loader2, MapPin, PackageCheck, ShieldCheck, Store, Truck } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useCommerce } from '../contexts/CommerceContext'
import { api, ApiError, type FulfillmentConfiguration, type ShippingAddress, type ShippingQuoteResponse, type ShippingRateQuote } from '../services/api'

const inputClass = 'w-full rounded-xl border border-white/12 bg-black/20 px-3.5 py-3 text-base text-white outline-none transition placeholder:text-text-muted focus:border-gold/60 focus:ring-2 focus:ring-gold/15 sm:text-sm'
const money = (cents: number, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)

function Field({ label, children, optional }: { label: string; children: ReactNode; optional?: boolean }) {
  return <label className="block"><span className="mb-2 flex items-center justify-between text-sm font-semibold"><span>{label}</span>{optional && <span className="font-normal text-text-muted">Optional</span>}</span>{children}</label>
}

function formatAddress(address: { street1?: string; street2?: string; city?: string; state?: string; zip?: string; country?: string }) {
  const locality = [address.city, [address.state, address.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  return [address.street1, address.street2, locality, address.country].filter(Boolean)
}

function serviceName(value: string) {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ')
}

export default function CheckoutPage() {
  const { enabled, loading: commerceLoading, cartLines, rememberCheckout } = useCommerce()
  const [configuration, setConfiguration] = useState<FulfillmentConfiguration | null>(null)
  const [method, setMethod] = useState<'shipping' | 'pickup'>('shipping')
  const [address, setAddress] = useState<ShippingAddress>({ name: '', street1: '', street2: '', city: '', state: '', zip: '', country: 'US', phone: '', email: '' })
  const [contact, setContact] = useState({ name: '', email: '', phone: '' })
  const [quote, setQuote] = useState<ShippingQuoteResponse | null>(null)
  const [selectedRate, setSelectedRate] = useState<ShippingRateQuote | null>(null)
  const [quoting, setQuoting] = useState(false)
  const [startingPayment, setStartingPayment] = useState(false)
  const [checkoutKey, setCheckoutKey] = useState(() => crypto.randomUUID())
  const [error, setError] = useState('')

  const canShip = cartLines.length > 0 && cartLines.every(line => line.product.shippable && line.variant.allow_shipping) && Boolean(configuration?.shipping_available)
  const canPickup = cartLines.length > 0 && cartLines.every(line => line.product.pickup_enabled && line.variant.allow_pickup) && Boolean(configuration?.pickup_locations.length)
  const currencies = [...new Set(cartLines.map(line => line.variant.currency))]
  const currency = currencies[0] || 'USD'
  const subtotal = cartLines.reduce((sum, line) => sum + line.variant.price_cents * line.quantity, 0)

  useEffect(() => {
    if (!enabled) return
    api.getShopFulfillment()
      .then(setConfiguration)
      .catch(cause => setError(cause instanceof Error ? cause.message : 'Delivery options could not be loaded.'))
  }, [enabled])

  useEffect(() => {
    if (!configuration) return
    if (!canShip && canPickup) setMethod('pickup')
  }, [configuration, canPickup, canShip])

  const updateAddress = (field: keyof ShippingAddress, value: string) => {
    setAddress(current => ({ ...current, [field]: value }))
    setQuote(null)
    setSelectedRate(null)
    setCheckoutKey(crypto.randomUUID())
  }

  const updateContact = (field: 'name' | 'email' | 'phone', value: string) => {
    setContact(current => ({ ...current, [field]: value }))
    setCheckoutKey(crypto.randomUUID())
  }

  const chooseMethod = (nextMethod: 'shipping' | 'pickup') => {
    setMethod(nextMethod)
    setError('')
    setCheckoutKey(crypto.randomUUID())
  }

  const requestRates = async () => {
    setQuoting(true); setError(''); setQuote(null); setSelectedRate(null)
    try {
      const result = await api.createShippingQuote({
        cart: cartLines.map(line => ({ variant_id: line.variantId, quantity: line.quantity })),
        address,
      })
      setAddress(current => ({ ...current, ...result.address }))
      setQuote(result)
      setSelectedRate(result.rates[0] || null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not calculate delivery for that address.')
    } finally { setQuoting(false) }
  }

  const pickup = configuration?.pickup_locations[0]
  const total = subtotal + (method === 'shipping' ? selectedRate?.amount_cents || 0 : 0)
  const contactReady = method === 'shipping'
    ? Boolean(address.name.trim() && address.email?.trim())
    : Boolean(contact.name.trim() && contact.email.trim())
  const fulfillmentReady = method === 'shipping' ? Boolean(selectedRate) : Boolean(pickup)
  const canStartPayment = currencies.length === 1 && contactReady && fulfillmentReady && !startingPayment
  const summaryRows = useMemo(() => cartLines.map(line => ({
    key: line.variantId,
    title: line.product.name,
    detail: `${line.variant.name} · Qty ${line.quantity}`,
    amount: line.variant.price_cents * line.quantity,
  })), [cartLines])

  const startPayment = async () => {
    if (!canStartPayment) return
    setStartingPayment(true)
    setError('')
    try {
      const result = await api.createCheckoutSession({
        checkout_key: checkoutKey,
        fulfillment_method: method,
        cart: cartLines.map(line => ({ variant_id: line.variantId, quantity: line.quantity })),
        ...(method === 'shipping'
          ? { shipping_quote_token: selectedRate?.token, shipping_address: address }
          : { pickup_location_id: pickup?.id, contact }),
      })
      rememberCheckout(result.order_token)
      window.location.assign(result.checkout_url)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Secure checkout could not be started.')
      if (cause instanceof ApiError && cause.status < 500) setCheckoutKey(crypto.randomUUID())
      setStartingPayment(false)
    }
  }

  if (commerceLoading) return <div className="min-h-screen px-4 pt-40 text-center text-text-secondary">Loading your bag…</div>
  if (!enabled) return <div className="min-h-screen px-4 pt-40 text-center"><h1 className="font-heading text-3xl font-bold">Checkout is not available</h1><Link to="/" className="mt-6 inline-flex text-gold">Return home</Link></div>
  if (cartLines.length === 0) return (
    <div className="min-h-screen px-4 pb-24 pt-40 text-center"><PackageCheck className="mx-auto h-12 w-12 text-gold" /><h1 className="mt-5 font-heading text-3xl font-bold">Your bag is empty</h1><p className="mt-3 text-text-secondary">Add something from the official collection before checking out.</p><Link to="/shop" className="mt-7 inline-flex rounded-full bg-gold px-6 py-3 font-bold text-navy-900">Browse the shop</Link></div>
  )

  return (
    <div className="min-h-screen px-4 pb-24 pt-32 sm:px-6 sm:pt-36">
      <div className="mx-auto max-w-6xl">
        <Link to="/shop" className="inline-flex items-center gap-2 text-sm text-text-secondary transition hover:text-white"><ArrowLeft className="h-4 w-4" /> Continue shopping</Link>
        <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)] lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Checkout</p>
            <h1 className="mt-2 font-heading text-3xl font-bold sm:text-4xl">How should we get it to you?</h1>
            <p className="mt-3 max-w-2xl leading-7 text-text-secondary">Choose delivery or free pickup at Deal Depot. We’ll show the complete total before payment.</p>

            {currencies.length > 1 && <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100">Items using different currencies must be purchased separately.</div>}
            {error && <div role="alert" className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm leading-6 text-red-100">{error}</div>}

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <button type="button" disabled={!canShip} onClick={() => chooseMethod('shipping')} className={`rounded-2xl border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${method === 'shipping' && canShip ? 'border-gold/50 bg-gold/[0.08]' : 'border-white/10 bg-white/[0.025] hover:border-white/25'} disabled:cursor-not-allowed disabled:opacity-40`}>
                <span className="flex items-start justify-between gap-3"><Truck className="h-6 w-6 text-gold" /><span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${method === 'shipping' && canShip ? 'border-gold bg-gold text-navy-900' : 'border-white/25'}`}>{method === 'shipping' && canShip && <Check className="h-3.5 w-3.5" />}</span></span>
                <strong className="mt-4 block font-heading text-lg">Ship my order</strong><span className="mt-1 block text-sm leading-6 text-text-muted">Live carrier pricing for Guam, the U.S., and supported international destinations.</span>
              </button>
              <button type="button" disabled={!canPickup} onClick={() => chooseMethod('pickup')} className={`rounded-2xl border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${method === 'pickup' && canPickup ? 'border-gold/50 bg-gold/[0.08]' : 'border-white/10 bg-white/[0.025] hover:border-white/25'} disabled:cursor-not-allowed disabled:opacity-40`}>
                <span className="flex items-start justify-between gap-3"><Store className="h-6 w-6 text-gold" /><span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${method === 'pickup' && canPickup ? 'border-gold bg-gold text-navy-900' : 'border-white/25'}`}>{method === 'pickup' && canPickup && <Check className="h-3.5 w-3.5" />}</span></span>
                <strong className="mt-4 block font-heading text-lg">Pick up at Deal Depot</strong><span className="mt-1 block text-sm leading-6 text-text-muted">Free local pickup. We’ll let you know when the order is ready.</span>
              </button>
            </div>

            {method === 'pickup' && pickup && (
              <section className="mt-6 rounded-2xl border border-white/10 bg-surface p-5 sm:p-7">
                <div className="flex gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold"><MapPin className="h-5 w-5" /></div><div><h2 className="font-heading text-xl font-semibold">{pickup.name}</h2><div className="mt-2 text-sm leading-6 text-text-secondary">{formatAddress(pickup.address).map(line => <div key={line}>{line}</div>)}</div>{pickup.phone && <a className="mt-2 inline-flex text-sm text-gold hover:text-gold-300" href={`tel:${pickup.phone}`}>{pickup.phone}</a>}</div></div>
                {pickup.pickup_instructions && <div className="mt-5 rounded-xl bg-white/[0.04] p-4 text-sm leading-6 text-text-secondary">{pickup.pickup_instructions}</div>}
                <div className="mt-6 border-t border-white/10 pt-6"><p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Pickup contact</p><h3 className="mt-2 font-heading text-lg font-semibold">Who should we notify?</h3><div className="mt-5 grid gap-5 sm:grid-cols-2"><Field label="Full name"><input className={inputClass} autoComplete="name" value={contact.name} onChange={event => updateContact('name', event.target.value)} /></Field><Field label="Email"><input className={inputClass} type="email" autoComplete="email" value={contact.email} onChange={event => updateContact('email', event.target.value)} /></Field><div className="sm:col-span-2"><Field label="Phone" optional><input className={inputClass} type="tel" autoComplete="tel" value={contact.phone} onChange={event => updateContact('phone', event.target.value)} /></Field></div></div></div>
              </section>
            )}

            {method === 'shipping' && canShip && (
              <section className="mt-6 rounded-2xl border border-white/10 bg-surface p-5 sm:p-7">
                <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Delivery address</p><h2 className="mt-2 font-heading text-xl font-semibold">Where are we shipping?</h2></div>
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2"><Field label="Full name"><input className={inputClass} autoComplete="name" value={address.name} onChange={event => updateAddress('name', event.target.value)} /></Field></div>
                  <div className="sm:col-span-2"><Field label="Street address"><input className={inputClass} autoComplete="address-line1" value={address.street1} onChange={event => updateAddress('street1', event.target.value)} /></Field></div>
                  <div className="sm:col-span-2"><Field label="Apartment, suite, or unit" optional><input className={inputClass} autoComplete="address-line2" value={address.street2} onChange={event => updateAddress('street2', event.target.value)} /></Field></div>
                  <Field label="City"><input className={inputClass} autoComplete="address-level2" value={address.city} onChange={event => updateAddress('city', event.target.value)} /></Field>
                  <Field label="State / province"><input className={inputClass} autoComplete="address-level1" value={address.state} onChange={event => updateAddress('state', event.target.value.toUpperCase())} /></Field>
                  <Field label="Postal code"><input className={inputClass} autoComplete="postal-code" value={address.zip} onChange={event => updateAddress('zip', event.target.value)} /></Field>
                  <Field label="Country"><select className={inputClass} autoComplete="country" value={address.country} onChange={event => updateAddress('country', event.target.value)}><option value="US">United States / Guam</option><option value="JP">Japan</option><option value="PH">Philippines</option><option value="KR">South Korea</option><option value="TW">Taiwan</option><option value="SG">Singapore</option></select></Field>
                  <Field label="Email"><input className={inputClass} type="email" autoComplete="email" value={address.email} onChange={event => updateAddress('email', event.target.value)} /></Field>
                  <Field label="Phone" optional><input className={inputClass} type="tel" autoComplete="tel" value={address.phone} onChange={event => updateAddress('phone', event.target.value)} /></Field>
                </div>
                <button type="button" onClick={() => void requestRates()} disabled={quoting || currencies.length > 1} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3.5 text-sm font-bold text-navy-900 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">{quoting ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking delivery…</> : <><Truck className="h-4 w-4" /> Show delivery options</>}</button>
              </section>
            )}

            {method === 'shipping' && quote && (
              <section className="mt-6 rounded-2xl border border-white/10 bg-surface p-5 sm:p-7">
                <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" /><div><h2 className="font-heading text-xl font-semibold">Verified delivery options</h2><p className="mt-1 text-sm leading-6 text-text-secondary">{formatAddress(quote.address).join(' · ')}</p></div></div>
                {quote.messages.map(message => <p key={message} className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3 text-xs leading-5 text-amber-100">{message}</p>)}
                <div className="mt-5 space-y-3">{quote.rates.map(rate => (
                  <button type="button" key={rate.token} onClick={() => setSelectedRate(rate)} className={`flex w-full items-center justify-between gap-4 rounded-xl border p-4 text-left transition ${selectedRate?.token === rate.token ? 'border-gold/50 bg-gold/[0.08]' : 'border-white/10 bg-black/10 hover:border-white/25'}`}>
                    <span><strong className="block text-sm">{rate.carrier} {serviceName(rate.service)}</strong><span className="mt-1 flex items-center gap-1.5 text-xs text-text-muted"><Clock3 className="h-3.5 w-3.5" />{rate.delivery_days ? `Estimated ${rate.delivery_days} days` : 'Delivery estimate at purchase'}</span></span><strong className="font-heading text-lg">{money(rate.amount_cents, rate.currency)}</strong>
                  </button>
                ))}</div>
                <p className="mt-4 text-xs text-text-muted">Rates are held for 15 minutes and rechecked before payment.</p>
              </section>
            )}
          </div>

          <aside className="rounded-2xl border border-white/10 bg-surface p-5 lg:sticky lg:top-28 sm:p-6">
            <h2 className="font-heading text-xl font-semibold">Order summary</h2>
            <div className="mt-5 space-y-4">{summaryRows.map(row => <div key={row.key} className="flex justify-between gap-4 text-sm"><div><p className="font-medium">{row.title}</p><p className="mt-1 text-xs text-text-muted">{row.detail}</p></div><span className="shrink-0">{money(row.amount, currency)}</span></div>)}</div>
            <div className="mt-5 space-y-3 border-t border-white/10 pt-5 text-sm"><div className="flex justify-between text-text-secondary"><span>Subtotal</span><span>{money(subtotal, currency)}</span></div><div className="flex justify-between text-text-secondary"><span>{method === 'pickup' ? 'Pickup' : 'Shipping'}</span><span>{method === 'pickup' ? 'Free' : selectedRate ? money(selectedRate.amount_cents, selectedRate.currency) : 'Calculated next'}</span></div><div className="flex justify-between border-t border-white/10 pt-4 font-heading text-xl font-semibold"><span>Total</span><span>{money(total, currency)}</span></div></div>
            <button type="button" disabled={!canStartPayment} onClick={() => void startPayment()} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-gold px-5 py-3.5 text-sm font-bold text-navy-900 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40">{startingPayment ? <><Loader2 className="h-4 w-4 animate-spin" /> Opening secure checkout…</> : <>Continue to secure payment</>}</button>
            <p className="mt-3 text-center text-xs leading-5 text-text-muted">Payment is securely handled by Stripe. Your items are held for 45 minutes once checkout begins.</p>
          </aside>
        </div>
      </div>
    </div>
  )
}
