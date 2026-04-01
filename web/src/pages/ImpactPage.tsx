import { useEffect, useState } from 'react'
import {
  Globe, Users, Trophy, Heart, DollarSign, Star, TrendingUp, MapPin,
  Plane, Building, Hotel, Calendar, Award, Target, Zap, Loader2
} from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { api } from '../services/api'
import type { ImpactData, ImpactMetric } from '../services/api'
import SEO from '../components/SEO'
import ScrollReveal from '../components/ScrollReveal'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  globe: Globe, users: Users, trophy: Trophy, heart: Heart, dollar: DollarSign,
  star: Star, trending: TrendingUp, pin: MapPin, plane: Plane, building: Building,
  hotel: Hotel, calendar: Calendar, award: Award, target: Target, zap: Zap,
}

const CATEGORY_LABELS: Record<string, string> = {
  tourism: 'Tourism Impact',
  competition: 'Competition Stats',
  economic: 'Economic Impact',
  community: 'Community Impact',
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  tourism: Plane,
  competition: Trophy,
  economic: TrendingUp,
  community: Heart,
}

function MetricCard({ metric, index }: { metric: ImpactMetric; index: number }) {
  const shouldReduceMotion = useReducedMotion()
  const Icon = ICON_MAP[metric.icon || 'globe'] || Globe

  return (
    <motion.div
      initial={shouldReduceMotion ? {} : { opacity: 0, y: 30 }}
      whileInView={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className={`relative group ${metric.highlight ? 'sm:col-span-2' : ''}`}
    >
      <div className={`relative overflow-hidden rounded-xl border transition-all duration-300 h-full
        ${metric.highlight
          ? 'bg-gradient-to-br from-gold/10 via-surface to-surface border-gold/20 hover:border-gold/40'
          : 'bg-surface border-white/5 hover:border-white/10'
        }`}
      >
        {metric.highlight && (
          <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        )}
        <div className="relative p-5 sm:p-6">
          <div className={`inline-flex p-2.5 rounded-lg mb-3 ${metric.highlight ? 'bg-gold/15 text-gold' : 'bg-white/5 text-text-secondary'}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className={`font-heading font-bold leading-tight ${metric.highlight ? 'text-3xl sm:text-4xl text-gold' : 'text-2xl sm:text-3xl text-text-primary'}`}>
            {metric.value}
          </div>
          <div className={`mt-1 font-medium ${metric.highlight ? 'text-sm text-gold/80' : 'text-sm text-text-secondary'}`}>
            {metric.label}
          </div>
          {metric.description && (
            <div className="text-xs text-text-muted mt-2 leading-relaxed">
              {metric.description}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function DonutChart({ allocations }: { allocations: ImpactData['fund_allocations'] }) {
  const shouldReduceMotion = useReducedMotion()
  const total = allocations.reduce((s, a) => s + Number(a.amount), 0)
  if (total === 0) return null

  const size = 200
  const strokeWidth = 35
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  let cumulative = 0

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {allocations.map((a, i) => {
          const pct = Number(a.amount) / total
          const dashArray = circumference * pct
          const dashOffset = circumference * cumulative
          cumulative += pct
          return (
            <motion.circle
              key={a.id}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={a.color || '#3b82f6'}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashArray} ${circumference - dashArray}`}
              strokeDashoffset={-dashOffset}
              strokeLinecap="butt"
              initial={shouldReduceMotion ? {} : { opacity: 0 }}
              whileInView={shouldReduceMotion ? {} : { opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
            />
          )
        })}
      </svg>
      <div className="mt-2 text-center">
        <div className="font-heading text-2xl font-bold text-text-primary">${total.toLocaleString()}</div>
        <div className="text-xs text-text-muted">Total Budget</div>
      </div>
    </div>
  )
}

export default function ImpactPage() {
  const [data, setData] = useState<ImpactData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getImpactData()
      .then(setData)
      .catch((err) => console.warn('[ImpactPage] Failed to load impact data:', err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    )
  }

  if (!data || (data.impact_metrics.length === 0 && data.fund_allocations.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-text-muted">
        <p>Impact data coming soon.</p>
      </div>
    )
  }

  const metricsByCategory = data.impact_metrics.reduce<Record<string, ImpactMetric[]>>((acc, m) => {
    if (!acc[m.category]) acc[m.category] = []
    acc[m.category].push(m)
    return acc
  }, {})

  const highlightMetrics = data.impact_metrics.filter(m => m.highlight)
  const categoryOrder = ['tourism', 'competition', 'economic', 'community']

  return (
    <>
      <SEO
        title="Impact & Transparency"
        description="See how the Marianas Open impacts tourism, competition, and the community. Full transparency on fund allocation."
        path="/impact"
      />

      {/* Hero */}
      <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gold/5 via-transparent to-transparent" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/10 border border-gold/20 text-gold text-sm font-medium mb-6">
              <TrendingUp className="w-4 h-4" />
              Event Impact Report
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <h1 className="font-heading text-3xl sm:text-5xl font-bold text-text-primary leading-tight">
              Impact & <span className="text-gold">Transparency</span>
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <p className="mt-4 text-base sm:text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
              The Marianas Open brings world-class jiu-jitsu to the Mariana Islands while creating lasting economic
              and cultural impact for our community.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Highlighted Metrics (hero stats) */}
      {highlightMetrics.length > 0 && (
        <section className="pb-12 sm:pb-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {highlightMetrics.map((m, i) => (
                <MetricCard key={m.id} metric={m} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Metrics by Category */}
      {categoryOrder.map(cat => {
        const catMetrics = (metricsByCategory[cat] || []).filter(m => !m.highlight)
        if (catMetrics.length === 0) return null
        const CatIcon = CATEGORY_ICONS[cat] || Globe

        return (
          <section key={cat} className="py-12 sm:py-16">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <ScrollReveal>
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 rounded-lg bg-white/5">
                    <CatIcon className="w-5 h-5 text-gold" />
                  </div>
                  <h2 className="font-heading text-xl sm:text-2xl font-bold text-text-primary">
                    {CATEGORY_LABELS[cat] || cat}
                  </h2>
                </div>
              </ScrollReveal>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {catMetrics.map((m, i) => (
                  <MetricCard key={m.id} metric={m} index={i} />
                ))}
              </div>
            </div>
          </section>
        )
      })}

      {/* Fund Allocation */}
      {data.fund_allocations.length > 0 && (
        <section className="py-12 sm:py-20 border-t border-white/5">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <ScrollReveal>
              <div className="text-center mb-10 sm:mb-14">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium mb-4">
                  <DollarSign className="w-4 h-4" />
                  Financial Transparency
                </div>
                <h2 className="font-heading text-2xl sm:text-3xl font-bold text-text-primary">
                  How Funds Are Allocated
                </h2>
                <p className="mt-3 text-text-secondary max-w-xl mx-auto text-sm sm:text-base">
                  Full transparency on how event funds are distributed to ensure the best
                  experience for athletes and our community.
                </p>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <ScrollReveal>
                <DonutChart allocations={data.fund_allocations} />
              </ScrollReveal>

              <div className="space-y-3">
                {data.fund_allocations.map((a, i) => (
                  <ScrollReveal key={a.id} delay={i * 0.05}>
                    <div className="bg-surface border border-white/5 rounded-lg p-4 hover:border-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: a.color || '#3b82f6' }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-text-primary text-sm">{a.category}</span>
                            <span className="font-heading font-bold text-text-primary text-sm">
                              ${Number(a.amount).toLocaleString()}
                            </span>
                          </div>
                          <div className="mt-1.5">
                            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: a.color || '#3b82f6' }}
                                initial={{ width: 0 }}
                                whileInView={{ width: `${a.percentage}%` }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8, delay: i * 0.1 }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            {a.description && (
                              <span className="text-xs text-text-muted truncate">{a.description}</span>
                            )}
                            <span className="text-xs text-text-muted shrink-0 ml-2">{a.percentage?.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Sponsor CTA */}
      <section className="py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <ScrollReveal>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gold/10 via-surface to-surface border border-gold/20 p-8 sm:p-10 text-center">
              <div className="absolute top-0 left-0 w-40 h-40 bg-gold/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gold/5 rounded-full translate-x-1/3 translate-y-1/3" />
              <div className="relative">
                <Award className="w-10 h-10 text-gold mx-auto mb-4" />
                <h3 className="font-heading text-xl sm:text-2xl font-bold text-text-primary mb-3">
                  Partner With Us
                </h3>
                <p className="text-text-secondary text-sm sm:text-base max-w-lg mx-auto mb-6">
                  Interested in sponsoring the Marianas Open? Join us in growing the sport
                  and making a positive impact on our island community.
                </p>
                <a
                  href="mailto:info@marianasopen.com"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-gold text-navy-900 rounded-lg font-heading font-semibold text-sm hover:bg-gold/90 transition-colors"
                >
                  Get in Touch
                </a>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  )
}
