import { ArrowRight, MapPin, PackageCheck, PackageSearch, RotateCcw, ShoppingBag, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import SEO from '../components/SEO'
import ProductArtwork from '../components/shop/ProductArtwork'
import CommerceDemoNotice from '../components/shop/CommerceDemoNotice'
import { useCommerce } from '../contexts/CommerceContext'

const money = (cents: number, currency = 'USD') => new Intl.NumberFormat('en-US', {
  style: 'currency', currency,
}).format(cents / 100)

export default function ShopPage() {
  const { enabled, pocMode, loading, error, products, reload } = useCommerce()

  return (
    <div className="min-h-screen pt-16">
      <SEO title="Official Shop" description={pocMode ? 'Preview the Marianas Open merchandise experience. No real purchases are available yet.' : 'Shop official Marianas Open apparel and merchandise, available for shipping or pickup on Guam.'} />
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(212,168,67,.18),transparent_38%),linear-gradient(180deg,#111827_0%,#0a0a0b_100%)]" />
        <div className="absolute inset-y-0 right-0 w-1/2 opacity-20 [background-image:linear-gradient(135deg,transparent_47%,rgba(212,168,67,.3)_47%,rgba(212,168,67,.3)_49%,transparent_49%)] [background-size:42px_42px]" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold">Official Marianas Open gear</p>
          <h1 className="mt-4 max-w-3xl font-heading text-4xl font-bold leading-[0.98] sm:text-6xl lg:text-7xl">Built for the mat.<br /><span className="text-white/45">Made for the islands.</span></h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-text-secondary sm:text-lg">Tournament apparel and essentials from Guam’s international jiu-jitsu championship.</p>
          <Link to="/shop/order-status" className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-semibold transition hover:border-gold/35 hover:text-gold-300"><PackageSearch className="h-4 w-4" /> Check an existing order</Link>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        {pocMode && <CommerceDemoNotice className="mb-10" />}
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading products">{[1, 2, 3].map(item => <div key={item} className="aspect-[4/5] rounded-2xl shimmer-loading" />)}</div>
        ) : error ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/5 px-6 py-12 text-center" role="alert"><p className="text-red-200">{error}</p><button onClick={() => void reload()} className="mt-5 rounded-full border border-white/15 px-5 py-2 text-sm font-semibold hover:border-white/30">Try again</button></div>
        ) : !enabled ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] px-6 py-16 text-center"><ShoppingBag className="mx-auto h-10 w-10 text-gold" /><h2 className="mt-5 font-heading text-2xl font-semibold">The official shop is almost ready</h2><p className="mx-auto mt-3 max-w-md text-text-secondary">We’re preparing the first collection. Check back soon.</p></div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center"><PackageCheck className="mx-auto h-10 w-10 text-gold" /><h2 className="mt-5 font-heading text-2xl font-semibold">The first drop is being prepared</h2><p className="mt-3 text-text-secondary">New merchandise will appear here as soon as it’s ready.</p></div>
        ) : (
          <section aria-labelledby="collection-heading">
            <div className="mb-8 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">{pocMode ? 'Demo collection' : 'Current collection'}</p><h2 id="collection-heading" className="mt-2 font-heading text-3xl font-bold sm:text-4xl">{pocMode ? 'Preview merchandise' : 'Official merchandise'}</h2></div><p className="hidden text-sm text-text-muted sm:block">{products.length} {products.length === 1 ? 'item' : 'items'}</p></div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {products.map(product => {
                const available = product.variants.filter(variant => variant.available_quantity > 0)
                const priceVariants = available.length ? available : product.variants
                const minimumByCurrency = priceVariants.reduce((prices, variant) => {
                  prices.set(variant.currency, Math.min(prices.get(variant.currency) ?? Number.POSITIVE_INFINITY, variant.price_cents))
                  return prices
                }, new Map<string, number>())
                const priceLabel = [...minimumByCurrency].map(([currency, cents]) => money(cents, currency)).join(' · ')
                return (
                  <Link key={product.id} to={`/shop/${product.slug}`} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-4 focus-visible:ring-offset-navy-900">
                    <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/10 bg-surface transition duration-300 group-hover:-translate-y-1 group-hover:border-gold/30"><ProductArtwork product={product} className="transition duration-500 group-hover:scale-[1.025]" />{product.featured && <span className="absolute left-4 top-4 rounded-full bg-gold px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-navy-900">Featured</span>}{available.length === 0 && <span className="absolute inset-x-4 bottom-4 rounded-xl bg-black/75 px-3 py-2 text-center text-xs font-semibold backdrop-blur">Currently sold out</span>}</div>
                    <div className="mt-4 flex items-start justify-between gap-4"><div><h3 className="font-heading text-lg font-semibold group-hover:text-gold-300">{product.name}</h3><p className="mt-1 text-sm text-text-muted">{product.options.map(option => option.values.map(value => value.value).join(', ')).filter(Boolean).join(' · ') || 'One size'}</p></div>{priceLabel && <span className="shrink-0 text-right font-heading font-semibold">{priceVariants.length > 1 ? 'From ' : ''}{priceLabel}</span>}</div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </main>

      <section className="border-t border-white/10 bg-surface/60">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6">
          {(pocMode ? [{ icon: Truck, title: 'Try simulated delivery', text: 'Enter an address to see example rates included in the demo total.' }, { icon: MapPin, title: 'Try pickup', text: 'Walk through a simulated Deal Depot pickup order.' }, { icon: RotateCcw, title: 'Test the full workflow', text: 'Explore order updates and a mock refund without moving real money.' }] : [{ icon: Truck, title: 'Worldwide delivery', text: 'Enter your address at checkout to see live available delivery rates.' }, { icon: MapPin, title: 'Pickup on Guam', text: 'Choose convenient, free pickup at Deal Depot when available.' }, { icon: RotateCcw, title: 'Straightforward support', text: 'Order updates and help from the Marianas Open team.' }]).map(({ icon: Icon, title, text }) => <div key={title} className="flex gap-4"><Icon className="mt-1 h-5 w-5 shrink-0 text-gold" /><div><h3 className="font-heading font-semibold">{title}</h3><p className="mt-1 text-sm leading-6 text-text-muted">{text}</p></div></div>)}
        </div>
      </section>
      <Link to="/" className="sr-only">Return home <ArrowRight /></Link>
    </div>
  )
}
