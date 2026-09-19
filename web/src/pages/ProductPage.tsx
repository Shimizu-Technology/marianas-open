import { ArrowLeft, Check, MapPin, Minus, Plus, ShieldCheck, ShoppingBag, Truck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import SEO from '../components/SEO'
import ProductArtwork from '../components/shop/ProductArtwork'
import CommerceDemoNotice from '../components/shop/CommerceDemoNotice'
import { useCommerce } from '../contexts/CommerceContext'
import { resolveMediaUrl } from '../utils/images'

const money = (cents: number, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)

export default function ProductPage() {
  const { slug } = useParams()
  const { products, loading, enabled, pocMode, addToCart } = useCommerce()
  const product = products.find(candidate => candidate.slug === slug)
  const firstVariant = product?.variants.find(variant => variant.available_quantity > 0) || product?.variants[0]
  const [selected, setSelected] = useState<Record<number, number>>({})
  const [quantity, setQuantity] = useState(1)
  const [imageId, setImageId] = useState<number | null>(null)

  useEffect(() => {
    if (!product || !firstVariant) return
    const ids = new Set(firstVariant.option_value_ids || [])
    setSelected(Object.fromEntries(product.options.flatMap(option => {
      const value = option.values.find(candidate => candidate.id && ids.has(candidate.id))
      return option.id && value?.id ? [[option.id, value.id]] : []
    })))
    setQuantity(1)
  }, [product?.id, firstVariant?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedVariant = useMemo(() => product?.variants.find(variant => {
    const ids = new Set(variant.option_value_ids || [])
    return product.options.every(option => option.id && selected[option.id] && ids.has(selected[option.id]))
  }), [product, selected])

  useEffect(() => {
    const image = product?.images.find(candidate => candidate.variant_id === selectedVariant?.id) || product?.images[0]
    setImageId(image?.id || null)
  }, [product?.id, selectedVariant?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="min-h-screen pt-32"><div className="mx-auto h-[65vh] max-w-7xl rounded-2xl shimmer-loading" /></div>
  if (!enabled || !product) return <div className="min-h-screen px-4 pb-24 pt-36 text-center"><h1 className="font-heading text-3xl font-bold">Product not found</h1><Link to="/shop" className="mt-6 inline-flex text-gold hover:text-gold-300">Return to the shop</Link></div>

  const unavailable = !selectedVariant || selectedVariant.available_quantity < 1
  const price = selectedVariant?.price_cents ?? firstVariant?.price_cents ?? 0
  const shownImage = product.images.find(image => image.id === imageId) || product.images[0]

  const variantsForValue = (valueId: number) => product.variants.filter(variant => (
    variant.available_quantity > 0 && (variant.option_value_ids || []).includes(valueId)
  ))

  const selectValue = (optionId: number, valueId: number) => {
    const candidates = variantsForValue(valueId)
    const best = candidates.sort((left, right) => {
      const score = (variant: typeof left) => product.options.reduce((total, option) => (
        option.id === optionId || !option.id || !selected[option.id] || (variant.option_value_ids || []).includes(selected[option.id]) ? total : total - 1
      ), 0)
      return score(right) - score(left)
    })[0]
    if (!best) return
    const ids = new Set(best.option_value_ids || [])
    setSelected(Object.fromEntries(product.options.flatMap(option => {
      const value = option.values.find(candidate => candidate.id && ids.has(candidate.id))
      return option.id && value?.id ? [[option.id, value.id]] : []
    })))
    setQuantity(1)
  }

  return (
    <div className="min-h-screen pt-16">
      <SEO title={product.name} description={product.description || `Shop ${product.name} from the official Marianas Open collection.`} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-14">
        <Link to="/shop" className="mb-7 inline-flex items-center gap-2 text-sm text-text-secondary transition hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to shop</Link>
        {pocMode && <CommerceDemoNotice className="mb-8" />}
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.18fr)_minmax(360px,.82fr)] lg:gap-16">
          <div className="min-w-0 lg:sticky lg:top-24 lg:self-start"><div className="aspect-[4/5] overflow-hidden rounded-2xl border border-white/10 bg-surface lg:max-h-[calc(100vh-12rem)]"><ProductArtwork product={product} image={shownImage} /></div>{product.images.length > 1 && <div className="mt-3 flex gap-3 overflow-x-auto pb-1" aria-label="Product photos">{product.images.map((image, index) => <button key={image.id} type="button" onClick={() => setImageId(image.id)} aria-label={`Show product photo ${index + 1}`} aria-pressed={shownImage?.id === image.id} className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:h-20 sm:w-20 ${shownImage?.id === image.id ? 'border-gold' : 'border-white/10'}`}><img src={resolveMediaUrl(image.url) || image.url} alt={image.alt_text || `${product.name} view ${index + 1}`} className="h-full w-full object-contain" /></button>)}</div>}</div>
          <section className="lg:py-5">
            {product.featured && <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">Featured release</p>}
            <h1 className="mt-3 font-heading text-4xl font-bold leading-tight sm:text-5xl">{product.name}</h1>
            <div className="mt-4 flex items-baseline gap-3"><span className="font-heading text-2xl font-semibold">{money(price, selectedVariant?.currency)}</span>{selectedVariant?.compare_at_price_cents && <span className="text-base text-text-muted line-through">{money(selectedVariant.compare_at_price_cents, selectedVariant.currency)}</span>}</div>
            {product.description && <p className="mt-6 whitespace-pre-line text-base leading-7 text-text-secondary">{product.description}</p>}

            <div className="mt-8 space-y-7">
              {product.options.map(option => (
                <fieldset key={option.id}>
                  <legend className="mb-3 text-sm font-semibold">{option.name}</legend>
                  <div className="flex flex-wrap gap-2.5">{option.values.map(value => {
                    const chosen = option.id && value.id && selected[option.id] === value.id
                    const available = value.id ? variantsForValue(value.id).length > 0 : false
                    return <button key={value.id} type="button" disabled={!available} onClick={() => option.id && value.id && selectValue(option.id, value.id)} className={`min-w-14 rounded-xl border px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${chosen ? 'border-gold bg-gold/10 text-gold' : available ? 'border-white/15 text-text-secondary hover:border-white/35 hover:text-white' : 'border-white/5 text-white/20 line-through'}`}>{value.value}</button>
                  })}</div>
                </fieldset>
              ))}
            </div>

            <div className="mt-8 flex gap-3">
              <div className="flex shrink-0 items-center rounded-full border border-white/15"><button onClick={() => setQuantity(value => Math.max(1, value - 1))} className="p-3" aria-label="Decrease quantity"><Minus className="h-4 w-4" /></button><span className="w-8 text-center text-sm tabular-nums">{quantity}</span><button onClick={() => setQuantity(value => Math.min(selectedVariant?.available_quantity || 1, value + 1))} disabled={unavailable || quantity >= (selectedVariant?.available_quantity || 0)} className="p-3 disabled:opacity-25" aria-label="Increase quantity"><Plus className="h-4 w-4" /></button></div>
              <button disabled={unavailable || !product.id || !selectedVariant?.id} onClick={() => product.id && selectedVariant?.id && addToCart(product.id, selectedVariant.id, quantity)} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-bold text-navy-900 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"><ShoppingBag className="h-4 w-4" />{unavailable ? 'Unavailable' : 'Add to bag'}</button>
            </div>
            {selectedVariant && selectedVariant.available_quantity > 0 && selectedVariant.available_quantity <= 5 && <p className="mt-3 text-center text-xs font-semibold text-amber-300">Only {selectedVariant.available_quantity} left</p>}

            <div className="mt-9 divide-y divide-white/10 border-y border-white/10">{[
              product.shippable && { icon: Truck, title: pocMode ? 'Example shipping rates' : 'Live shipping rates', text: pocMode ? 'Enter an address to see simulated delivery options and totals.' : 'Enter your address at checkout to compare available delivery services.' },
              product.pickup_enabled && { icon: MapPin, title: pocMode ? 'Simulated Deal Depot pickup' : 'Free Deal Depot pickup', text: pocMode ? 'Try the pickup flow; no merchandise will be held.' : 'Choose local pickup at checkout and wait for the ready email.' },
              { icon: ShieldCheck, title: pocMode ? 'Simulated checkout' : 'Secure Stripe checkout', text: pocMode ? 'No card is needed and no charge will occur.' : 'Pay by card through Stripe after reviewing the complete order total.' },
            ].filter(Boolean).map(item => item && <div key={item.title} className="flex gap-4 py-4"><item.icon className="mt-0.5 h-5 w-5 shrink-0 text-gold" /><div><h3 className="text-sm font-semibold">{item.title}</h3><p className="mt-1 text-xs leading-5 text-text-muted">{item.text}</p></div><Check className="ml-auto h-4 w-4 text-white/20" /></div>)}</div>
          </section>
        </div>
      </main>
    </div>
  )
}
