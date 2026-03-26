import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import type { ReactNode } from 'react'
import { api } from '../services/api'
import type { Organization } from '../services/api'

interface OrganizationContextValue {
  org: Organization | null
  loading: boolean
}

const FALLBACK: Organization = {
  id: 0,
  name: 'Marianas Open',
  slug: 'marianas-open',
  description: '',
  primary_color: '#004581',
  secondary_color: '#D4A843',
  contact_email: '',
  phone: '',
  website_url: '',
  instagram_url: '',
  facebook_url: '',
  founded_year: 0,
  logo_url: null,
  banner_url: null,
}

const OrganizationContext = createContext<OrganizationContextValue>({
  org: FALLBACK,
  loading: true,
})

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [org, setOrg] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getOrganization()
      .then(setOrg)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!org) return
    const root = document.documentElement
    if (org.secondary_color) {
      root.style.setProperty('--color-gold', org.secondary_color)
      root.style.setProperty('--color-gold-500', org.secondary_color)
    }
  }, [org])

  const value = useMemo(() => ({ org, loading }), [org, loading])

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrg(): Organization {
  const { org } = useContext(OrganizationContext)
  return org ?? FALLBACK
}

export function useOrgLoading(): boolean {
  const { loading } = useContext(OrganizationContext)
  return loading
}
