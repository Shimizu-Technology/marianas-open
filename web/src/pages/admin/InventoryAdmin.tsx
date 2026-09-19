import { Boxes, Loader2, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { api, type InventorySnapshot } from '../../services/api'

const inputClass = 'min-h-11 w-full rounded-xl border border-white/15 bg-navy-900 px-3 py-2.5 text-sm text-text-primary outline-none focus:border-gold focus:ring-2 focus:ring-gold/15'

export default function InventoryAdmin() {
  const [snapshot, setSnapshot] = useState<InventorySnapshot | null>(null)
  const [productId, setProductId] = useState('')
  const [variantId, setVariantId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [delta, setDelta] = useState('')
  const [reason, setReason] = useState('received')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await api.admin.getInventorySnapshot()
      setSnapshot(response)
      setProductId(current => response.products.some(product => String(product.id) === current) ? current : String(response.products[0]?.id || ''))
      setLocationId(current => response.locations.some(location => String(location.id) === current) ? current : String(response.locations[0]?.id || ''))
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Inventory could not be loaded.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])
  const product = snapshot?.products.find(item => String(item.id) === productId)
  const variants = useMemo(() => product?.variants || [], [product])
  const variant = variants.find(item => String(item.id) === variantId) || variants[0]
  const level = variant?.inventory_levels.find(item => String(item.inventory_location_id) === locationId)

  const record = async (event: FormEvent) => {
    event.preventDefault()
    if (!product || !variant || !locationId) return
    const quantity = Number(delta)
    if (!Number.isInteger(quantity) || quantity === 0) { setError('Enter a non-zero whole-number change.'); return }
    if (quantity < 0 && !window.confirm(`Remove ${Math.abs(quantity)} item${quantity === -1 ? '' : 's'} from stock?`)) return
    setSaving(true); setError(''); setNotice('')
    try {
      await api.admin.adjustInventory(product.id, { variant_id: variant.id, location_id: Number(locationId), quantity_delta: quantity, reason, note: note.trim() })
      setDelta(''); setNote('')
      await load()
      setNotice(`Stock updated for ${product.name} · ${variant.name}.`)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Stock could not be updated.') }
    finally { setSaving(false) }
  }

  return <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
    <div className="flex items-start gap-3"><Boxes className="mt-1 h-6 w-6 shrink-0 text-gold" /><div><h1 className="font-heading text-2xl font-bold">Deal Depot inventory</h1><p className="mt-2 text-sm leading-6 text-text-secondary">Record stock received, returned, damaged, or corrected. Every adjustment is saved in the audit history.</p></div></div>
    {error && <p role="alert" className="mt-6 rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-200">{error}</p>}
    {notice && <p role="status" className="mt-6 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-200">{notice}</p>}
    {loading ? <div className="mt-8 flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div> : !snapshot?.products.length || !snapshot.locations.length ? <div className="mt-8 rounded-2xl border border-white/10 bg-surface p-6 text-sm text-text-secondary">No published products or active stock locations are available yet. Ask a merchandise admin to set them up.</div> : <form onSubmit={event => void record(event)} className="mt-8 space-y-5 rounded-2xl border border-white/10 bg-surface p-5 sm:p-7">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-semibold">Product<select className={`${inputClass} mt-2`} value={productId} onChange={event => { setProductId(event.target.value); setVariantId('') }}>{snapshot.products.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="text-sm font-semibold">Variant<select className={`${inputClass} mt-2`} value={variant?.id || ''} onChange={event => setVariantId(event.target.value)}>{variants.map(item => <option key={item.id} value={item.id}>{item.name} · {item.sku}</option>)}</select></label>
        <label className="text-sm font-semibold">Location<select className={`${inputClass} mt-2`} value={locationId} onChange={event => setLocationId(event.target.value)}>{snapshot.locations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <div className="rounded-xl border border-white/10 bg-black/15 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Current stock</p><p className="mt-2 font-heading text-2xl font-bold">{level?.on_hand ?? 0} <span className="text-sm font-normal text-text-secondary">on hand</span></p><p className="mt-1 text-xs text-text-muted">{level?.available ?? 0} available · {level?.reserved ?? 0} reserved</p></div>
        <label className="text-sm font-semibold">Quantity change<input className={`${inputClass} mt-2`} type="number" step="1" required value={delta} onChange={event => setDelta(event.target.value)} placeholder="+12 received or -2 damaged" /><span className="mt-1 block text-xs font-normal text-text-muted">Use a negative number to remove stock.</span></label>
        <label className="text-sm font-semibold">Reason<select className={`${inputClass} mt-2`} value={reason} onChange={event => setReason(event.target.value)}>{['received', 'returned', 'damaged', 'correction', 'adjustment'].map(item => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></label>
      </div>
      <label className="block text-sm font-semibold">Note<input className={`${inputClass} mt-2`} value={note} onChange={event => setNote(event.target.value)} placeholder="Receiving slip, return, or count details" /></label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-semibold text-text-secondary"><RefreshCw className="h-4 w-4" />Refresh counts</button><button type="submit" disabled={saving || !variant || !delta || Number(delta) === 0} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gold px-6 text-sm font-bold text-navy-900 disabled:opacity-40">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Record adjustment</button></div>
    </form>}
  </div>
}
