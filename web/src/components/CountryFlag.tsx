import { useState } from 'react'
import { countryFlagUrl } from '../utils/countryFlag'

export default function CountryFlag({ code, className = 'w-5 h-3.5', label }: {
  code: string; className?: string; label?: string
}) {
  const url = countryFlagUrl(code)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const text = code.trim().toUpperCase()
  if (!text) return null
  if (!url || failedUrl === url) {
    return <span title={label || text} className="inline-flex max-w-full break-all border border-white/20 px-1 py-0.5 text-xs font-medium text-text-secondary">{text}</span>
  }
  return <img src={url} alt={label || text} width={20} height={14}
    className={`${className} object-cover rounded-sm inline-block shrink-0`}
    loading="lazy" onError={() => setFailedUrl(url)} />
}
