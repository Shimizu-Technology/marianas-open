import { CheckCircle2, Loader2, MapPin, Package, Plus, Save, Trash2, Truck } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { api, type InventoryLocation, type ShippingPackage } from '../../services/api'

const inputClass = 'w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5 text-base text-text-primary outline-none transition placeholder:text-text-muted focus:border-gold/60 focus:ring-2 focus:ring-gold/15 sm:text-sm'

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold">{label}</span>{children}{hint && <span className="mt-1.5 block text-xs leading-5 text-text-muted">{hint}</span>}</label>
}

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (value: boolean) => void; label: string; description: string }) {
  return <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${checked ? 'border-gold/35 bg-gold/[0.07]' : 'border-white/10 bg-black/10 hover:border-white/20'}`}><span className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 ${checked ? 'bg-gold' : 'bg-white/15'}`}><span className={`h-4 w-4 rounded-full bg-white transition ${checked ? 'translate-x-4' : ''}`} /></span><span><strong className="block text-sm">{label}</strong><span className="mt-1 block text-xs leading-5 text-text-muted">{description}</span></span></button>
}

const emptyLocation = (): Omit<InventoryLocation, 'id'> => ({
  name: 'Deal Depot', code: 'DEAL-DEPOT', active: true, pickup_enabled: true, shipping_enabled: true,
  pickup_instructions: 'Bring your confirmation and a photo ID. We’ll email you when your order is ready.', phone: '',
  address: { street1: '', street2: '', city: '', state: 'GU', zip: '', country: 'US' },
})

const emptyPackage = (): ShippingPackage => ({ name: '', length_mm: 305, width_mm: 229, height_mm: 76, empty_weight_grams: 150, max_weight_grams: 4_500, sort_order: 0, active: true })

export default function ShippingAdmin() {
  const [location, setLocation] = useState<InventoryLocation | Omit<InventoryLocation, 'id'>>(emptyLocation)
  const [packages, setPackages] = useState<ShippingPackage[]>([])
  const [packageDraft, setPackageDraft] = useState<ShippingPackage>(emptyPackage)
  const [loading, setLoading] = useState(true)
  const [savingLocation, setSavingLocation] = useState(false)
  const [savingPackage, setSavingPackage] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = async () => {
    setLoading(true); setError('')
    try {
      const [locationResult, packageResult] = await Promise.all([api.admin.getInventoryLocations(), api.admin.getShippingPackages()])
      const dealDepot = locationResult.inventory_locations.find(candidate => candidate.code === 'DEAL-DEPOT') || locationResult.inventory_locations[0]
      setLocation(dealDepot || emptyLocation())
      setPackages(packageResult.shipping_packages)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Fulfillment settings could not be loaded.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const updateLocation = <K extends keyof Omit<InventoryLocation, 'id'>>(field: K, value: Omit<InventoryLocation, 'id'>[K]) => setLocation(current => ({ ...current, [field]: value }))
  const updateAddress = (field: string, value: string) => setLocation(current => ({ ...current, address: { ...current.address, [field]: value } }))

  const saveLocation = async () => {
    setSavingLocation(true); setError(''); setNotice('')
    try {
      const result = 'id' in location
        ? await api.admin.updateInventoryLocation(location.id, location)
        : await api.admin.createInventoryLocation(location)
      setLocation(result.inventory_location)
      setNotice('Deal Depot fulfillment settings saved.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Deal Depot settings could not be saved.') }
    finally { setSavingLocation(false) }
  }

  const savePackage = async () => {
    setSavingPackage(true); setError(''); setNotice('')
    try {
      const result = packageDraft.id
        ? await api.admin.updateShippingPackage(packageDraft.id, packageDraft)
        : await api.admin.createShippingPackage({ ...packageDraft, sort_order: packages.length })
      setPackages(current => [...current.filter(candidate => candidate.id !== result.shipping_package.id), result.shipping_package].sort((a, b) => a.sort_order - b.sort_order))
      setPackageDraft(emptyPackage())
      setNotice('Shipping package saved.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Shipping package could not be saved.') }
    finally { setSavingPackage(false) }
  }

  const removePackage = async (shippingPackage: ShippingPackage) => {
    if (!shippingPackage.id || !window.confirm(`Delete ${shippingPackage.name}? Archive it instead if it has been used for a quote.`)) return
    setError(''); setNotice('')
    try { await api.admin.deleteShippingPackage(shippingPackage.id); setPackages(current => current.filter(candidate => candidate.id !== shippingPackage.id)); setNotice('Shipping package deleted.') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Shipping package could not be deleted.') }
  }

  if (loading) return <div className="flex min-h-[45vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-gold" /></div>

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-16">
      <div className="flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gold/10 text-gold"><Truck className="h-6 w-6" /></div><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Commerce setup</p><h1 className="mt-1 font-heading text-3xl font-bold">Pickup & shipping</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">Configure where Deal Depot fulfills orders and the real packages used for EasyPost carrier quotes.</p></div></div>
      {error && <div role="alert" className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100">{error}</div>}
      {notice && <div className="flex items-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-100"><CheckCircle2 className="h-4 w-4" />{notice}</div>}

      <section className="rounded-2xl border border-white/10 bg-surface p-5 sm:p-7">
        <div className="flex items-start gap-3"><MapPin className="mt-0.5 h-5 w-5 text-gold" /><div><h2 className="font-heading text-xl font-semibold">Deal Depot</h2><p className="mt-1 text-sm leading-6 text-text-secondary">This public address is used as the pickup location and the origin for shipping rates.</p></div></div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Location name"><input className={inputClass} value={location.name} onChange={event => updateLocation('name', event.target.value)} /></Field>
          <Field label="Phone"><input className={inputClass} type="tel" value={location.phone || ''} onChange={event => updateLocation('phone', event.target.value)} /></Field>
          <div className="sm:col-span-2"><Field label="Street address"><input className={inputClass} value={location.address.street1 || ''} onChange={event => updateAddress('street1', event.target.value)} /></Field></div>
          <div className="sm:col-span-2"><Field label="Suite / unit"><input className={inputClass} value={location.address.street2 || ''} onChange={event => updateAddress('street2', event.target.value)} /></Field></div>
          <Field label="City"><input className={inputClass} value={location.address.city || ''} onChange={event => updateAddress('city', event.target.value)} /></Field>
          <Field label="State / territory"><input className={inputClass} value={location.address.state || ''} onChange={event => updateAddress('state', event.target.value.toUpperCase())} /></Field>
          <Field label="Postal code"><input className={inputClass} value={location.address.zip || ''} onChange={event => updateAddress('zip', event.target.value)} /></Field>
          <Field label="Country code" hint="Use the two-letter ISO code, such as US."><input className={inputClass} maxLength={2} value={location.address.country || ''} onChange={event => updateAddress('country', event.target.value.toUpperCase())} /></Field>
          <div className="sm:col-span-2"><Field label="Pickup instructions"><textarea className={`${inputClass} min-h-24 resize-y`} value={location.pickup_instructions} onChange={event => updateLocation('pickup_instructions', event.target.value)} /></Field></div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2"><Toggle checked={location.pickup_enabled} onChange={value => updateLocation('pickup_enabled', value)} label="Offer free pickup" description="Customers can choose Deal Depot during checkout." /><Toggle checked={location.shipping_enabled} onChange={value => updateLocation('shipping_enabled', value)} label="Quote shipping from here" description="Use this address as the EasyPost ship-from origin." /></div>
        <button type="button" onClick={() => void saveLocation()} disabled={savingLocation} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-bold text-navy-900 transition hover:bg-gold-400 disabled:opacity-50 sm:w-auto">{savingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save fulfillment location</button>
      </section>

      <section className="rounded-2xl border border-white/10 bg-surface p-5 sm:p-7">
        <div className="flex items-start gap-3"><Package className="mt-0.5 h-5 w-5 text-gold" /><div><h2 className="font-heading text-xl font-semibold">Package presets</h2><p className="mt-1 text-sm leading-6 text-text-secondary">Enter packed dimensions—not the product dimensions. The smallest active package that supports the order weight is used.</p></div></div>
        {packages.length > 0 && <div className="mt-6 grid gap-3">{packages.map(item => <div key={item.id} className="flex flex-col gap-4 rounded-xl border border-white/10 bg-black/10 p-4 sm:flex-row sm:items-center sm:justify-between"><button type="button" onClick={() => setPackageDraft(item)} className="text-left"><strong className="block">{item.name}</strong><span className="mt-1 block text-xs text-text-muted">{item.length_mm / 10} × {item.width_mm / 10} × {item.height_mm / 10} cm · up to {item.max_weight_grams / 1000} kg {item.active ? '' : '· Archived'}</span></button><div className="flex gap-2"><button type="button" onClick={() => setPackageDraft(item)} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-text-secondary hover:text-white">Edit</button><button type="button" onClick={() => void removePackage(item)} className="rounded-lg border border-red-400/20 p-2 text-red-300 hover:bg-red-400/10" aria-label={`Delete ${item.name}`}><Trash2 className="h-4 w-4" /></button></div></div>)}</div>}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3"><h3 className="font-heading font-semibold">{packageDraft.id ? `Edit ${packageDraft.name}` : 'Add a package'}</h3>{packageDraft.id && <button type="button" onClick={() => setPackageDraft(emptyPackage())} className="inline-flex items-center gap-1 text-xs font-semibold text-gold"><Plus className="h-3.5 w-3.5" /> New package</button>}</div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3"><Field label="Package name"><input className={inputClass} value={packageDraft.name} onChange={event => setPackageDraft(current => ({ ...current, name: event.target.value }))} placeholder="Small apparel box" /></Field></div>
            {(['length_mm', 'width_mm', 'height_mm'] as const).map((field, index) => <Field key={field} label={`${['Length', 'Width', 'Height'][index]} (cm)`}><input className={inputClass} type="number" min="0.1" step="0.1" value={packageDraft[field] / 10} onChange={event => setPackageDraft(current => ({ ...current, [field]: Math.round(Number(event.target.value) * 10) }))} /></Field>)}
            <Field label="Empty package weight (g)"><input className={inputClass} type="number" min="0" value={packageDraft.empty_weight_grams} onChange={event => setPackageDraft(current => ({ ...current, empty_weight_grams: Number(event.target.value) }))} /></Field>
            <Field label="Maximum packed weight (kg)"><input className={inputClass} type="number" min="0.1" step="0.1" value={packageDraft.max_weight_grams / 1000} onChange={event => setPackageDraft(current => ({ ...current, max_weight_grams: Math.round(Number(event.target.value) * 1000) }))} /></Field>
            <div className="sm:col-span-2 lg:col-span-1"><Toggle checked={packageDraft.active} onChange={value => setPackageDraft(current => ({ ...current, active: value }))} label="Active" description="Available for new shipping quotes." /></div>
          </div>
          <button type="button" onClick={() => void savePackage()} disabled={savingPackage || !packageDraft.name.trim()} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-bold text-navy-900 transition hover:bg-gold-400 disabled:opacity-50 sm:w-auto">{savingPackage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save package</button>
        </div>
      </section>
    </div>
  )
}
