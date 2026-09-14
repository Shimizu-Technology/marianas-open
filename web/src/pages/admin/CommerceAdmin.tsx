import {
  Archive,
  ArrowLeft,
  Boxes,
  Check,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Loader2,
  MapPin,
  PackagePlus,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { api, type CommerceProduct, type InventoryLocation, type ProductOption, type ProductOptionValue, type ProductVariant } from '../../services/api'
import { resolveMediaUrl } from '../../utils/images'

const key = (prefix: string) => `${prefix}-${crypto.randomUUID()}`
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const skuify = (value: string) => value.toUpperCase().trim().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)
const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)

const emptyProduct = (): CommerceProduct => ({
  name: '', slug: '', description: '', active: false, featured: false,
  shippable: true, pickup_enabled: true, sort_order: 0, images: [], options: [], variants: [],
})

function normalized(product: CommerceProduct): CommerceProduct {
  return {
    ...product,
    options: product.options.map(option => ({
      ...option,
      client_key: option.client_key || `option-${option.id}`,
      values: option.values.map(value => ({ ...value, client_key: value.client_key || `value-${value.id}` })),
    })),
    variants: product.variants.map(variant => ({
      ...variant,
      active: variant.active ?? false,
      selected_value_keys: (variant.selected_value_ids || []).map(id => `value-${id}`),
    })),
  }
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold text-text-primary">{label}</span>{children}{hint && <span className="mt-1.5 block text-xs leading-5 text-text-muted">{hint}</span>}</label>
}

const inputClass = 'w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-gold/60 focus:ring-2 focus:ring-gold/15'
const buttonSecondary = 'inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-text-secondary transition hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold'

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (checked: boolean) => void; label: string; description: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${checked ? 'border-gold/35 bg-gold/[0.07]' : 'border-white/10 bg-black/10 hover:border-white/20'}`}>
      <span className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition ${checked ? 'bg-gold' : 'bg-white/15'}`}><span className={`h-4 w-4 rounded-full bg-white shadow transition ${checked ? 'translate-x-4' : ''}`} /></span>
      <span><span className="block text-sm font-semibold">{label}</span><span className="mt-0.5 block text-xs leading-5 text-text-muted">{description}</span></span>
    </button>
  )
}

function combinations(options: ProductOption[]): ProductOptionValue[][] {
  if (options.length === 0) return [[]]
  return options.reduce<ProductOptionValue[][]>((sets, option) => sets.flatMap(set => option.values.map(value => [...set, value])), [[]])
}

export default function CommerceAdmin() {
  const [products, setProducts] = useState<CommerceProduct[]>([])
  const [locations, setLocations] = useState<InventoryLocation[]>([])
  const [draft, setDraft] = useState<CommerceProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [expandedVariant, setExpandedVariant] = useState<number | string | null>(null)
  const [inventoryVariant, setInventoryVariant] = useState<ProductVariant | null>(null)
  const [adjustment, setAdjustment] = useState({ location_id: '', quantity_delta: '', reason: 'received', note: '' })
  const [showLocationForm, setShowLocationForm] = useState(false)
  const [locationForm, setLocationForm] = useState({ name: 'Deal Depot', code: 'DEAL-DEPOT', pickup_enabled: true })

  const load = async () => {
    setLoading(true); setError('')
    try {
      const [productResponse, locationResponse] = await Promise.all([api.admin.getProducts(), api.admin.getInventoryLocations()])
      setProducts(productResponse.products.map(normalized))
      setLocations(locationResponse.inventory_locations)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Commerce data could not be loaded.')
    } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const selectedProduct = draft?.id ? products.find(product => product.id === draft.id) : undefined
  const dirty = Boolean(draft && JSON.stringify(draft) !== JSON.stringify(selectedProduct || emptyProduct()))

  const updateDraft = <K extends keyof CommerceProduct>(field: K, value: CommerceProduct[K]) => setDraft(current => current ? { ...current, [field]: value } : current)

  const optionSchemaLocked = Boolean(draft?.id && draft.variants.some(variant => variant.id))

  const addOption = () => setDraft(current => current ? {
    ...current,
    options: [...current.options, { client_key: key('option'), name: '', position: current.options.length, values: [] }],
  } : current)

  const updateOption = (optionIndex: number, updates: Partial<ProductOption>) => setDraft(current => current ? {
    ...current,
    options: current.options.map((option, index) => index === optionIndex ? { ...option, ...updates } : option),
  } : current)

  const removeOption = (optionIndex: number) => setDraft(current => current ? { ...current, options: current.options.filter((_, index) => index !== optionIndex) } : current)

  const addValue = (optionIndex: number) => setDraft(current => current ? {
    ...current,
    options: current.options.map((option, index) => index === optionIndex ? {
      ...option,
      values: [...option.values, { client_key: key('value'), value: '', position: option.values.length }],
    } : option),
  } : current)

  const updateValue = (optionIndex: number, valueIndex: number, value: string) => setDraft(current => current ? {
    ...current,
    options: current.options.map((option, index) => index === optionIndex ? {
      ...option,
      values: option.values.map((candidate, candidateIndex) => candidateIndex === valueIndex ? { ...candidate, value } : candidate),
    } : option),
  } : current)

  const removeValue = (optionIndex: number, valueIndex: number) => setDraft(current => current ? {
    ...current,
    options: current.options.map((option, index) => index === optionIndex ? { ...option, values: option.values.filter((_, candidateIndex) => candidateIndex !== valueIndex) } : option),
  } : current)

  const generateVariants = () => setDraft(current => {
    if (!current) return current
    if (current.options.some(option => !option.name.trim() || option.values.length === 0 || option.values.some(value => !value.value.trim()))) {
      setError('Give every option a name and at least one value before generating variants.')
      return current
    }
    const existing = new Map(current.variants.map(variant => [(variant.selected_value_keys || []).slice().sort().join('|'), variant]))
    const next = combinations(current.options).map((values, index) => {
      const keys = values.map(value => value.client_key!).sort()
      const prior = existing.get(keys.join('|'))
      const name = values.map(value => value.value).join(' / ') || 'Standard'
      return prior || {
        name,
        sku: skuify(`${current.slug || current.name}-${name}`),
        active: false,
        price_cents: 0,
        compare_at_price_cents: null,
        currency: 'USD',
        allow_shipping: current.shippable,
        allow_pickup: current.pickup_enabled,
        weight_grams: null,
        length_mm: null,
        width_mm: null,
        height_mm: null,
        customs_description: '',
        country_of_origin: '',
        hts_code: '',
        position: index,
        selected_value_keys: keys,
        available_quantity: 0,
        inventory_levels: [],
      }
    })
    setError('')
    return { ...current, variants: next }
  })

  const updateVariant = (index: number, updates: Partial<ProductVariant>) => setDraft(current => current ? {
    ...current,
    variants: current.variants.map((variant, candidateIndex) => candidateIndex === index ? { ...variant, ...updates } : variant),
  } : current)

  const removeVariant = (index: number) => setDraft(current => current ? { ...current, variants: current.variants.filter((_, candidateIndex) => candidateIndex !== index) } : current)

  const save = async () => {
    if (!draft) return
    if (!draft.name.trim() || !draft.slug.trim()) { setError('Product name and URL slug are required.'); return }
    if (draft.variants.length === 0) { setError('Generate at least one variant before saving.'); return }
    setSaving(true); setError(''); setNotice('')
    try {
      const response = draft.id ? await api.admin.updateProduct(draft.id, draft) : await api.admin.createProduct(draft)
      const saved = normalized(response.product)
      setProducts(current => [...current.filter(product => product.id !== saved.id), saved].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.name.localeCompare(b.name)))
      setDraft(saved)
      setNotice(`${saved.name} saved${saved.active ? ' and published' : ' as a draft'}.`)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Product could not be saved.') }
    finally { setSaving(false) }
  }

  const uploadImage = async (file: File) => {
    if (!draft?.id) return
    setSaving(true); setError('')
    try {
      const response = await api.admin.uploadProductImage(draft.id, file, draft.name)
      const saved = normalized(response.product)
      setDraft(saved); setProducts(current => current.map(product => product.id === saved.id ? saved : product))
      setNotice('Product image uploaded.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Image upload failed.') }
    finally { setSaving(false) }
  }

  const archive = async () => {
    if (!draft?.id) return
    const next = { ...draft, active: false, variants: draft.variants.map(variant => ({ ...variant, active: false })) }
    setDraft(next); setSaving(true); setError('')
    try {
      const response = await api.admin.updateProduct(draft.id, next)
      const saved = normalized(response.product)
      setDraft(saved); setProducts(current => current.map(product => product.id === saved.id ? saved : product)); setNotice(`${saved.name} archived.`)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Product could not be archived.') }
    finally { setSaving(false) }
  }

  const createLocation = async () => {
    setSaving(true); setError('')
    try {
      const response = await api.admin.createInventoryLocation({ ...locationForm, active: true, address: {} })
      setLocations(current => [...current, response.inventory_location]); setShowLocationForm(false); setAdjustment(current => ({ ...current, location_id: String(response.inventory_location.id) })); setNotice('Inventory location added.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Location could not be added.') }
    finally { setSaving(false) }
  }

  const adjustInventory = async () => {
    if (!draft?.id || !inventoryVariant?.id || !adjustment.location_id || !adjustment.quantity_delta) return
    setSaving(true); setError('')
    try {
      await api.admin.adjustInventory(draft.id, {
        variant_id: inventoryVariant.id,
        location_id: Number(adjustment.location_id),
        quantity_delta: Number(adjustment.quantity_delta),
        reason: adjustment.reason,
        note: adjustment.note,
      })
      const response = await api.admin.getProduct(draft.id)
      const saved = normalized(response.product)
      setDraft(saved); setProducts(current => current.map(product => product.id === saved.id ? saved : product)); setInventoryVariant(null); setAdjustment({ location_id: locations[0] ? String(locations[0].id) : '', quantity_delta: '', reason: 'received', note: '' }); setNotice('Inventory updated and recorded in the audit trail.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Inventory could not be updated.') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gold" /></div>

  if (!draft) return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Commerce</p><h1 className="mt-2 font-heading text-3xl font-bold">Products & inventory</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">Build the merchandise catalog, control what customers can buy, and keep stock accurate across Deal Depot and future locations.</p></div><button onClick={() => { setDraft(emptyProduct()); setNotice('') }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-bold text-navy-900 transition hover:bg-gold-400"><PackagePlus className="h-4 w-4" /> Add product</button></div>
      {error && <div className="mt-6 rounded-xl border border-red-400/25 bg-red-400/5 px-4 py-3 text-sm text-red-200" role="alert">{error}</div>}
      {notice && <div className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-200"><Check className="h-4 w-4" />{notice}</div>}
      {products.length === 0 ? <div className="mt-10 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-20 text-center"><Boxes className="mx-auto h-12 w-12 text-white/20" /><h2 className="mt-5 font-heading text-xl font-semibold">Start with your first product</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-muted">Add a towel, shirt, gi, bag, hat, or any other item. Each product can have its own sizes, colors, materials, and prices.</p></div> : <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{products.map(product => <button key={product.id} onClick={() => { setDraft(normalized(product)); setNotice(''); setError('') }} className="group overflow-hidden rounded-2xl border border-white/10 bg-surface text-left transition hover:-translate-y-0.5 hover:border-gold/30"><div className="aspect-[16/9] bg-black/20">{product.images[0] ? <img src={resolveMediaUrl(product.images[0].url) || product.images[0].url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Boxes className="h-9 w-9 text-white/15" /></div>}</div><div className="p-5"><div className="flex items-start justify-between gap-3"><h2 className="font-heading text-lg font-semibold group-hover:text-gold">{product.name}</h2><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${product.active ? 'bg-emerald-400/10 text-emerald-300' : 'bg-white/5 text-text-muted'}`}>{product.active ? 'Live' : 'Draft'}</span></div><p className="mt-2 text-sm text-text-muted">{product.variants.length} {product.variants.length === 1 ? 'variant' : 'variants'} · {product.variants.reduce((sum, variant) => sum + variant.available_quantity, 0)} available</p><p className="mt-4 font-heading font-semibold">{product.variants.length ? `From ${money(Math.min(...product.variants.map(variant => variant.price_cents)))}` : 'No price yet'}</p></div></button>)}</div>}
    </div>
  )

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <div className="sticky top-0 z-20 -mx-4 mb-7 flex items-center justify-between gap-4 border-b border-white/10 bg-navy-900/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"><button onClick={() => { if (!dirty || window.confirm('Discard unsaved changes?')) setDraft(null) }} className={buttonSecondary}><ArrowLeft className="h-4 w-4" /> Products</button><div className="flex items-center gap-2">{draft.id && <button onClick={() => void archive()} disabled={saving || !draft.active} className={`${buttonSecondary} hidden sm:inline-flex disabled:opacity-40`}><Archive className="h-4 w-4" /> Archive</button>}<button onClick={() => void save()} disabled={saving || !dirty} className="inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-bold text-navy-900 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save product</button></div></div>
      {error && <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-red-400/25 bg-red-400/5 px-4 py-3 text-sm text-red-200" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss"><X className="h-4 w-4" /></button></div>}
      {notice && <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-200"><Check className="h-4 w-4" />{notice}</div>}

      <div className="space-y-6">
        <section className="rounded-2xl border border-white/10 bg-surface p-5 sm:p-7"><div className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">1 · Product</p><h2 className="mt-2 font-heading text-xl font-semibold">What are you selling?</h2></div><div className="grid gap-5 sm:grid-cols-2"><Field label="Product name"><input className={inputClass} value={draft.name} onChange={event => { const name = event.target.value; updateDraft('name', name); if (!draft.id) updateDraft('slug', slugify(name)) }} placeholder="Marianas Open Competition Gi" /></Field><Field label="Store URL" hint={`marianasopen.com/shop/${draft.slug || 'product-name'}`}><input className={inputClass} value={draft.slug} onChange={event => updateDraft('slug', slugify(event.target.value))} placeholder="marianas-open-competition-gi" /></Field><div className="sm:col-span-2"><Field label="Description"><textarea className={`${inputClass} min-h-28 resize-y`} value={draft.description} onChange={event => updateDraft('description', event.target.value)} placeholder="Tell customers what makes this item special, what it includes, and how it fits." /></Field></div></div><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Toggle checked={Boolean(draft.shippable)} onChange={value => updateDraft('shippable', value)} label="Shipping" description="Can be delivered" /><Toggle checked={Boolean(draft.pickup_enabled)} onChange={value => updateDraft('pickup_enabled', value)} label="Store pickup" description="Deal Depot pickup" /><Toggle checked={Boolean(draft.featured)} onChange={value => updateDraft('featured', value)} label="Featured" description="Prioritize in shop" /><Toggle checked={Boolean(draft.active)} onChange={value => updateDraft('active', value)} label="Published" description="Visible to customers" /></div></section>

        <section className="rounded-2xl border border-white/10 bg-surface p-5 sm:p-7"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">2 · Options</p><h2 className="mt-2 font-heading text-xl font-semibold">How can customers choose?</h2><p className="mt-2 max-w-xl text-sm leading-6 text-text-muted">Add only what applies to this product—size, color, material, style, or any other choice.</p>{optionSchemaLocked && <p className="mt-2 text-xs leading-5 text-amber-200/80">The option types are locked after variants are saved so historical SKUs stay stable. You can still rename them and add new values.</p>}</div><button onClick={addOption} disabled={optionSchemaLocked} className={`${buttonSecondary} disabled:cursor-not-allowed disabled:opacity-40`}><Plus className="h-4 w-4" /> Add option</button></div>{draft.options.length === 0 ? <div className="mt-6 rounded-xl border border-dashed border-white/10 px-5 py-7 text-center text-sm text-text-muted">No options means this product will have one “Standard” variant.</div> : <div className="mt-6 space-y-4">{draft.options.map((option, optionIndex) => <div key={option.client_key} className="rounded-xl border border-white/10 bg-black/15 p-4"><div className="flex items-center gap-3"><input className={inputClass} aria-label={`Option ${optionIndex + 1} name`} value={option.name} onChange={event => updateOption(optionIndex, { name: event.target.value })} placeholder="Size" />{!option.id && <button onClick={() => removeOption(optionIndex)} className="rounded-lg p-2.5 text-text-muted hover:bg-red-400/10 hover:text-red-300" aria-label={`Remove ${option.name || 'option'}`}><Trash2 className="h-4 w-4" /></button>}</div><div className="mt-3 flex flex-wrap gap-2">{option.values.map((value, valueIndex) => <div key={value.client_key} className="flex items-center rounded-lg border border-white/10 bg-white/[0.03]"><input className="w-24 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-text-muted sm:w-32" value={value.value} onChange={event => updateValue(optionIndex, valueIndex, event.target.value)} placeholder="Medium" aria-label={`${option.name || 'Option'} value`} />{!value.id && <button onClick={() => removeValue(optionIndex, valueIndex)} className="border-l border-white/10 p-2 text-text-muted hover:text-red-300" aria-label={`Remove ${value.value || 'value'}`}><X className="h-3.5 w-3.5" /></button>}</div>)}<button onClick={() => addValue(optionIndex)} className="inline-flex items-center gap-1 rounded-lg border border-dashed border-white/15 px-3 py-2 text-xs font-semibold text-text-muted hover:border-white/30 hover:text-white"><Plus className="h-3.5 w-3.5" /> Value</button></div></div>)}</div>}<button onClick={generateVariants} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gold/30 bg-gold/[0.07] px-5 py-3 text-sm font-bold text-gold transition hover:bg-gold/[0.12]"><Sparkles className="h-4 w-4" /> Generate {combinations(draft.options).length} {combinations(draft.options).length === 1 ? 'variant' : 'variants'}</button></section>

        <section className="rounded-2xl border border-white/10 bg-surface p-5 sm:p-7"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">3 · Variants & pricing</p><h2 className="mt-2 font-heading text-xl font-semibold">Set price, SKU, availability, and shipping details</h2><p className="mt-2 text-sm leading-6 text-text-muted">Keep a variant in draft until its price, fulfillment, and physical details are ready. Saved variants can be archived but not deleted so inventory and future order history remain trustworthy.</p></div>{draft.variants.length === 0 ? <div className="mt-6 rounded-xl border border-dashed border-white/10 px-5 py-8 text-center text-sm text-text-muted">Generate variants from the options above to continue.</div> : <div className="mt-6 space-y-3">{draft.variants.map((variant, index) => { const rowKey = variant.id || variant.selected_value_keys?.join('|') || index; const open = expandedVariant === rowKey; return <div key={String(rowKey)} className="overflow-hidden rounded-xl border border-white/10 bg-black/15"><div className="grid gap-3 p-4 lg:grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_130px_auto] lg:items-end"><Field label="Variant"><input className={inputClass} value={variant.name} onChange={event => updateVariant(index, { name: event.target.value })} /></Field><Field label="SKU"><input className={inputClass} value={variant.sku} onChange={event => updateVariant(index, { sku: skuify(event.target.value) })} /></Field><Field label="Price (USD)"><input className={inputClass} type="number" min="0" step="0.01" value={(variant.price_cents / 100).toFixed(2)} onChange={event => updateVariant(index, { price_cents: Math.round(Number(event.target.value || 0) * 100) })} /></Field><div className="flex items-center gap-1"><button type="button" role="switch" aria-checked={Boolean(variant.active)} onClick={() => updateVariant(index, { active: !variant.active })} className={`rounded-lg px-3 py-2.5 text-xs font-bold ${variant.active ? 'bg-emerald-400/10 text-emerald-300' : 'bg-white/5 text-text-muted'}`}>{variant.active ? 'Active' : 'Draft'}</button><button onClick={() => setExpandedVariant(open ? null : rowKey)} className="rounded-lg p-2.5 text-text-muted hover:bg-white/5 hover:text-white" aria-label={`${open ? 'Hide' : 'Show'} variant details`}>{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>{!variant.id && <button onClick={() => removeVariant(index)} className="rounded-lg p-2.5 text-text-muted hover:bg-red-400/10 hover:text-red-300" aria-label="Remove variant"><Trash2 className="h-4 w-4" /></button>}</div></div>{open && <div className="border-t border-white/10 p-4"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="Weight (grams)" hint={variant.allow_shipping ? 'Required before publishing.' : undefined}><input className={inputClass} type="number" min="1" value={variant.weight_grams || ''} onChange={event => updateVariant(index, { weight_grams: event.target.value ? Number(event.target.value) : null })} /></Field><Field label="Length (mm)"><input className={inputClass} type="number" min="1" value={variant.length_mm || ''} onChange={event => updateVariant(index, { length_mm: event.target.value ? Number(event.target.value) : null })} /></Field><Field label="Width (mm)"><input className={inputClass} type="number" min="1" value={variant.width_mm || ''} onChange={event => updateVariant(index, { width_mm: event.target.value ? Number(event.target.value) : null })} /></Field><Field label="Height (mm)"><input className={inputClass} type="number" min="1" value={variant.height_mm || ''} onChange={event => updateVariant(index, { height_mm: event.target.value ? Number(event.target.value) : null })} /></Field><div className="sm:col-span-2"><Field label="Customs description"><input className={inputClass} value={variant.customs_description || ''} onChange={event => updateVariant(index, { customs_description: event.target.value })} placeholder="Cotton tournament T-shirt" /></Field></div><Field label="Country of origin"><input className={inputClass} maxLength={2} value={variant.country_of_origin || ''} onChange={event => updateVariant(index, { country_of_origin: event.target.value.toUpperCase() })} placeholder="US" /></Field><Field label="HTS code"><input className={inputClass} value={variant.hts_code || ''} onChange={event => updateVariant(index, { hts_code: event.target.value })} /></Field></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><Toggle checked={variant.allow_shipping} onChange={value => updateVariant(index, { allow_shipping: value })} label="Ship this variant" description="Include in shipping checkout" /><Toggle checked={variant.allow_pickup} onChange={value => updateVariant(index, { allow_pickup: value })} label="Allow pickup" description="Offer Deal Depot pickup" /></div>{variant.id && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4"><div><p className="text-sm font-semibold">{variant.available_quantity} available</p><p className="text-xs text-text-muted">Across {variant.inventory_levels?.length || 0} stocked locations</p></div><button onClick={() => { setInventoryVariant(variant); setAdjustment(current => ({ ...current, location_id: current.location_id || (locations[0] ? String(locations[0].id) : '') })) }} className={buttonSecondary}><RefreshCw className="h-4 w-4" /> Adjust stock</button></div>}</div>}</div>})}</div>}</section>

        <section className="rounded-2xl border border-white/10 bg-surface p-5 sm:p-7"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">4 · Images</p><h2 className="mt-2 font-heading text-xl font-semibold">Show customers the real product</h2><p className="mt-2 text-sm leading-6 text-text-muted">JPEG, PNG, or WebP up to 10 MB. Save the product once before uploading.</p></div><label className={`${buttonSecondary} ${!draft.id || saving ? 'pointer-events-none opacity-40' : 'cursor-pointer'}`}><ImagePlus className="h-4 w-4" /> Upload image<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={!draft.id || saving} onChange={event => { const file = event.target.files?.[0]; if (file) void uploadImage(file); event.target.value = '' }} /></label></div>{draft.images.length === 0 ? <div className="mt-6 flex aspect-[16/5] min-h-36 items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/15"><p className="text-sm text-text-muted">No product photos yet</p></div> : <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{draft.images.map(image => <div key={image.id} className="group relative aspect-square overflow-hidden rounded-xl border border-white/10"><img src={resolveMediaUrl(image.url) || image.url} alt={image.alt_text} className="h-full w-full object-cover" /><button onClick={async () => { if (!draft.id) return; const response = await api.admin.deleteProductImage(draft.id, image.id); const saved = normalized(response.product); setDraft(saved); setProducts(current => current.map(product => product.id === saved.id ? saved : product)) }} className="absolute right-2 top-2 rounded-full bg-black/75 p-2 text-white opacity-100 backdrop-blur sm:opacity-0 sm:group-hover:opacity-100" aria-label="Delete image"><Trash2 className="h-4 w-4" /></button></div>)}</div>}</section>
      </div>

      {inventoryVariant && <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"><button className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setInventoryVariant(null)} aria-label="Close inventory dialog" /><div role="dialog" aria-modal="true" aria-labelledby="inventory-title" className="relative w-full max-w-lg rounded-t-2xl border border-white/10 bg-surface p-6 shadow-2xl sm:rounded-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Inventory adjustment</p><h2 id="inventory-title" className="mt-2 font-heading text-xl font-semibold">{inventoryVariant.name}</h2><p className="mt-1 text-sm text-text-muted">{inventoryVariant.sku} · {inventoryVariant.available_quantity} available</p></div><button onClick={() => setInventoryVariant(null)} className="p-2 text-text-muted hover:text-white" aria-label="Close"><X className="h-5 w-5" /></button></div>{locations.length === 0 ? <div className="mt-6 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4"><p className="text-sm text-amber-100">Add an inventory location before recording stock.</p><button onClick={() => setShowLocationForm(true)} className="mt-3 text-sm font-bold text-gold">Add Deal Depot</button></div> : <div className="mt-6 space-y-4"><Field label="Location"><select className={inputClass} value={adjustment.location_id} onChange={event => setAdjustment(current => ({ ...current, location_id: event.target.value }))}><option value="">Choose location</option>{locations.filter(location => location.active).map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></Field><div className="grid grid-cols-2 gap-4"><Field label="Quantity change" hint="Use a negative number to remove stock."><input className={inputClass} type="number" step="1" value={adjustment.quantity_delta} onChange={event => setAdjustment(current => ({ ...current, quantity_delta: event.target.value }))} placeholder="12" /></Field><Field label="Reason"><select className={inputClass} value={adjustment.reason} onChange={event => setAdjustment(current => ({ ...current, reason: event.target.value }))}>{['received', 'adjustment', 'correction', 'returned', 'damaged'].map(reason => <option key={reason} value={reason}>{reason[0].toUpperCase() + reason.slice(1)}</option>)}</select></Field></div><Field label="Note" hint="Creates a permanent audit record."><input className={inputClass} value={adjustment.note} onChange={event => setAdjustment(current => ({ ...current, note: event.target.value }))} placeholder="Opening inventory count" /></Field><button onClick={() => void adjustInventory()} disabled={saving || !adjustment.location_id || !adjustment.quantity_delta || Number(adjustment.quantity_delta) === 0} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-bold text-navy-900 disabled:opacity-40">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Record adjustment</button></div>}</div></div>}

      {showLocationForm && <div className="fixed inset-0 z-[60] flex items-center justify-center px-4"><button className="absolute inset-0 bg-black/75" onClick={() => setShowLocationForm(false)} aria-label="Close location dialog" /><div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-surface p-6"><MapPin className="h-6 w-6 text-gold" /><h2 className="mt-4 font-heading text-xl font-semibold">Add inventory location</h2><div className="mt-5 space-y-4"><Field label="Location name"><input className={inputClass} value={locationForm.name} onChange={event => setLocationForm(current => ({ ...current, name: event.target.value }))} /></Field><Field label="Location code"><input className={inputClass} value={locationForm.code} onChange={event => setLocationForm(current => ({ ...current, code: skuify(event.target.value) }))} /></Field><Toggle checked={locationForm.pickup_enabled} onChange={value => setLocationForm(current => ({ ...current, pickup_enabled: value }))} label="Customer pickup" description="Customers can collect ready orders here" /><button onClick={() => void createLocation()} disabled={saving || !locationForm.name || !locationForm.code} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-bold text-navy-900 disabled:opacity-40"><Plus className="h-4 w-4" /> Add location</button></div></div></div>}
    </div>
  )
}
