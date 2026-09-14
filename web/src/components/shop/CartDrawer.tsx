import { Minus, Plus, ShoppingBag, Trash2, Truck, X } from 'lucide-react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useCommerce } from '../../contexts/CommerceContext'
import ProductArtwork from './ProductArtwork'

const money = (cents: number, currency = 'USD') => new Intl.NumberFormat('en-US', {
  style: 'currency', currency,
}).format(cents / 100)

export default function CartDrawer() {
  const { cartOpen, setCartOpen, cartLines, updateQuantity, removeFromCart } = useCommerce()
  const subtotals = cartLines.reduce((totals, line) => {
    totals.set(line.variant.currency, (totals.get(line.variant.currency) || 0) + line.variant.price_cents * line.quantity)
    return totals
  }, new Map<string, number>())

  useEffect(() => {
    if (!cartOpen) return
    const prior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setCartOpen(false) }
    document.addEventListener('keydown', close)
    return () => {
      document.body.style.overflow = prior
      document.removeEventListener('keydown', close)
    }
  }, [cartOpen, setCartOpen])

  if (!cartOpen) return null

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label="Shopping bag">
      <button className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setCartOpen(false)} aria-label="Close shopping bag" />
      <section className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-white/10 bg-[#0d0f14] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5 sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Your order</p>
            <h2 className="mt-1 font-heading text-2xl font-bold">Shopping bag</h2>
          </div>
          <button onClick={() => setCartOpen(false)} className="rounded-full border border-white/10 p-2.5 text-text-secondary transition hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold" aria-label="Close shopping bag">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          {cartLines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <ShoppingBag className="h-12 w-12 text-white/20" strokeWidth={1.25} />
              <h3 className="mt-5 font-heading text-xl font-semibold">Your bag is ready when you are</h3>
              <p className="mt-2 max-w-xs text-sm leading-6 text-text-secondary">Choose an item from the official Marianas Open collection.</p>
              <button onClick={() => setCartOpen(false)} className="mt-6 rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-navy-900 transition hover:bg-gold-400">Continue shopping</button>
            </div>
          ) : (
            <div className="space-y-5">
              {cartLines.map(line => (
                <article key={line.variantId} className="grid grid-cols-[84px_1fr] gap-4 border-b border-white/10 pb-5">
                  <div className="aspect-square overflow-hidden rounded-xl border border-white/10"><ProductArtwork product={line.product} compact /></div>
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div><h3 className="font-heading font-semibold leading-tight">{line.product.name}</h3><p className="mt-1 text-xs text-text-muted">{line.variant.name}</p></div>
                      <button onClick={() => removeFromCart(line.variantId)} className="p-1 text-text-muted transition hover:text-red-400" aria-label={`Remove ${line.product.name}`}><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center rounded-full border border-white/15">
                        <button onClick={() => updateQuantity(line.variantId, line.quantity - 1)} className="p-2 text-text-secondary hover:text-white" aria-label="Decrease quantity"><Minus className="h-3.5 w-3.5" /></button>
                        <span className="w-7 text-center text-sm tabular-nums">{line.quantity}</span>
                        <button onClick={() => updateQuantity(line.variantId, line.quantity + 1)} disabled={line.quantity >= line.variant.available_quantity} className="p-2 text-text-secondary hover:text-white disabled:opacity-25" aria-label="Increase quantity"><Plus className="h-3.5 w-3.5" /></button>
                      </div>
                      <span className="font-heading font-semibold">{money(line.variant.price_cents * line.quantity, line.variant.currency)}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {cartLines.length > 0 && (
          <div className="border-t border-white/10 bg-white/[0.025] px-5 py-5 sm:px-7">
            <div className="flex items-start justify-between gap-4"><span className="text-sm text-text-secondary">Subtotal</span><div className="text-right">{[...subtotals].map(([currency, cents]) => <strong key={currency} className="block font-heading text-xl">{money(cents, currency)}</strong>)}</div></div>
            <p className="mt-2 flex items-center gap-2 text-xs leading-5 text-text-muted"><Truck className="h-4 w-4 shrink-0" /> Shipping or Deal Depot pickup will be calculated at checkout.</p>
            <Link to="/shop/checkout" onClick={() => setCartOpen(false)} className="mt-5 flex w-full items-center justify-center rounded-full bg-gold px-5 py-3.5 text-sm font-bold text-navy-900 transition hover:bg-gold-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">Choose delivery or pickup</Link>
          </div>
        )}
      </section>
    </div>
  )
}
