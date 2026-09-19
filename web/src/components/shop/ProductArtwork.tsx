import { Package } from 'lucide-react'
import { resolveMediaUrl } from '../../utils/images'
import type { CommerceProduct } from '../../services/api'

export default function ProductArtwork({ product, className = '', compact = false }: { product: CommerceProduct; className?: string; compact?: boolean }) {
  const image = product.images[0]
  if (image) {
    return (
      <img
        src={resolveMediaUrl(image.url) || image.url}
        alt={image.alt_text || product.name}
        className={`h-full w-full object-cover ${className}`}
      />
    )
  }

  return (
    <div className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-[linear-gradient(145deg,#18233a_0%,#0d111a_52%,#17120a_100%)] ${className}`}>
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(135deg,transparent_45%,rgba(212,168,67,.22)_45%,rgba(212,168,67,.22)_47%,transparent_47%)] [background-size:28px_28px]" />
      <Package className={`relative text-gold/70 ${compact ? 'h-7 w-7' : 'h-11 w-11'}`} strokeWidth={1.25} aria-hidden="true" />
    </div>
  )
}
