import { ImagePlus, Trash2 } from 'lucide-react'
import type { CommerceProduct } from '../../services/api'
import { resolveMediaUrl } from '../../utils/images'

type Props = {
  product: CommerceProduct
  saving: boolean
  onUpload: (file: File) => void
  onDelete: (imageId: number) => void
  onAssign: (imageId: number, variantId: number | null) => void
}

export default function ProductImagesSection({ product, saving, onUpload, onDelete, onAssign }: Props) {
  return <section className="rounded-2xl border border-white/10 bg-surface p-5 sm:p-7">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">4 · Images</p>
        <h2 className="mt-2 font-heading text-xl font-semibold">Show customers the real product</h2>
        <p className="mt-2 text-sm leading-6 text-text-muted">JPEG, PNG, or WebP up to 10 MB. Save as a draft, upload a photo, then publish. Assign a photo to a variant when its color or style differs.</p>
      </div>
      <label className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-text-secondary transition hover:border-white/25 hover:text-white ${!product.id || saving ? 'pointer-events-none opacity-40' : 'cursor-pointer'}`}>
        <ImagePlus className="h-4 w-4" />Upload image
        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={!product.id || saving} onChange={event => { const file = event.target.files?.[0]; if (file) onUpload(file); event.target.value = '' }} />
      </label>
    </div>
    {product.images.length === 0 ? <div className="mt-6 flex min-h-36 w-full items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/15 sm:aspect-[16/5]"><p className="text-sm text-text-muted">No product photos yet</p></div> :
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {product.images.map((image, index) => <div key={image.id} className="overflow-hidden rounded-xl border border-white/10 bg-black/10">
          <div className="group relative aspect-square overflow-hidden">
            <img src={resolveMediaUrl(image.url) || image.url} alt={image.alt_text || `${product.name} view ${index + 1}`} className="h-full w-full object-contain" />
            <button type="button" onClick={() => onDelete(image.id)} disabled={saving} className="absolute right-2 top-2 flex min-h-11 min-w-11 items-center justify-center rounded-full bg-black/75 text-white backdrop-blur disabled:opacity-40" aria-label={`Delete product photo ${index + 1}`}><Trash2 className="h-4 w-4" /></button>
          </div>
          <label className="block p-3 text-xs font-semibold text-text-secondary">Photo for
            <select className="mt-2 min-h-11 w-full rounded-lg border border-white/15 bg-navy-900 px-2 text-sm text-text-primary focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/15" value={image.variant_id ?? ''} disabled={saving} onChange={event => onAssign(image.id, event.target.value ? Number(event.target.value) : null)}>
              <option value="">All variants</option>
              {product.variants.filter(variant => variant.id).map(variant => <option key={variant.id} value={variant.id}>{variant.name} · {variant.sku}</option>)}
            </select>
          </label>
        </div>)}
      </div>}
  </section>
}
