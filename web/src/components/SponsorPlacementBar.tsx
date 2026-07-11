import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { api, type SponsorPlacement } from '../services/api'
import { normalizeExternalUrl, resolveMediaUrl } from '../utils/images'

export default function SponsorPlacementBar() {
  const [placement, setPlacement] = useState<SponsorPlacement | null>(null)

  useEffect(() => {
    api.getSponsorPlacements({ placement_type: 'featured_bar' })
      .then((response) => setPlacement(response.sponsor_placements[0] || null))
      .catch(() => setPlacement(null))
  }, [])

  if (!placement) return null
  const logo = placement.media_url || placement.sponsor.logo_url
  const href = normalizeExternalUrl(placement.cta_url || placement.sponsor.website_url)

  const content = (
    <div className="flex min-h-10 items-center justify-center gap-3 border-b border-gold/15 bg-gold/[0.07] px-4 py-2 text-center text-xs text-text-secondary">
      {logo && <img src={resolveMediaUrl(logo) || undefined} alt={`${placement.sponsor.name} logo`} className="h-5 max-w-24 object-contain" />}
      <span><span className="font-semibold text-text-primary">{placement.headline || placement.sponsor.name}</span>{placement.body ? ` — ${placement.body}` : ''}</span>
      {href && <span className="inline-flex items-center gap-1 font-semibold text-gold">{placement.cta_label || 'Learn more'}<ExternalLink className="h-3 w-3" /></span>}
    </div>
  )

  return href ? <a href={href} target="_blank" rel="noopener noreferrer sponsored">{content}</a> : content
}
