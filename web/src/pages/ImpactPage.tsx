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

function MetricCard({ metric, index }: { metric: ImpactMetric; index: number }) {
  const shouldReduceMotion = useReducedMotion()
  const Icon = ICON_MAP[metric.icon || 'globe'] || Globe

  if (metric.highlight) {
    return (
      <motion.div
        initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
        whileInView={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: index * 0.08 }}
        className="text-center"
      >
        <div className="inline-flex p-2.5 rounded-lg bg-gold/15 text-gold mb-2">
          <Icon className="w-5 h-5" />
        </div>
        <div className="font-heading text-3xl sm:text-4xl font-bold text-gold">{metric.value}</div>
        <div className="text-sm text-gold/70 font-medium mt-1">{metric.label}</div>
        {metric.description && (
          <div className="text-xs text-text-muted mt-1">{metric.description}</div>
        )}
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
      whileInView={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className="bg-surface border border-white/5 rounded-lg p-4 hover:border-white/10 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-white/5 text-text-secondary shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="font-heading text-xl font-bold text-text-primary leading-tight">{metric.value}</div>
          <div className="text-xs text-text-muted">{metric.label}</div>
        </div>
      </div>
      {metric.description && (
        <div className="text-xs text-text-muted mt-2 leading-relaxed pl-11">{metric.description}</div>
      )}
    </motion.div>
  )
}

function DonutChart({ allocations }: { allocations: ImpactData['fund_allocations'] }) {
  const shouldReduceMotion = useReducedMotion()
  const total = allocations.reduce((s, a) => s + Number(a.amount), 0)
  if (total === 0) return null

  const size = 160
  const strokeWidth = 28
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
              transition={{ duration: 0.6, delay: i * 0.1 }}
            />
          )
        })}
      </svg>
      <div className="mt-2 text-center">
        <div className="font-heading text-xl font-bold text-text-primary">${total.toLocaleString()}</div>
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

  const highlightMetrics = data.impact_metrics.filter(m => m.highlight)
  const regularMetrics = data.impact_metrics.filter(m => !m.highlight)

  const metricsByCategory = regularMetrics.reduce<Record<string, ImpactMetric[]>>((acc, m) => {
    if (!acc[m.category]) acc[m.category] = []
    acc[m.category].push(m)
    return acc
  }, {})
  const categoryOrder = ['tourism', 'competition', 'economic', 'community']
  const populatedCategories = categoryOrder.filter(c => metricsByCategory[c]?.length)

  return (
    <>
      <SEO
        title="Impact & Transparency"
        description="See how the Marianas Open impacts tourism, competition, and the community. Full transparency on fund allocation."
        path="/impact"
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Hero — compact */}
        <section className="pt-24 pb-8 sm:pt-28 sm:pb-10 text-center">
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-gold text-xs font-medium mb-4">
              <TrendingUp className="w-3.5 h-3.5" />
              Event Impact Report
            </div>
            <h1 className="font-heading text-2xl sm:text-4xl font-bold text-text-primary leading-tight">
              Impact & <span className="text-gold">Transparency</span>
            </h1>
            <p className="mt-2 text-sm sm:text-base text-text-secondary max-w-xl mx-auto">
              How the Marianas Open drives tourism, competition, and economic growth for our island community.
            </p>
          </ScrollReveal>
        </section>

        {/* Highlight stats — big numbers in a row */}
        {highlightMetrics.length > 0 && (
          <section className="pb-8 sm:pb-10">
            <div className={`grid gap-6 ${highlightMetrics.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : highlightMetrics.length === 2 ? 'grid-cols-2' : highlightMetrics.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
              {highlightMetrics.map((m, i) => (
                <MetricCard key={m.id} metric={m} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* All regular metrics in a dense grid, grouped by category */}
        {populatedCategories.length > 0 && (
          <section className="pb-8 sm:pb-12">
            {populatedCategories.map((cat) => {
              const catMetrics = metricsByCategory[cat]
              return (
                <div key={cat} className="mb-6 last:mb-0">
                  <ScrollReveal>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
                      {CATEGORY_LABELS[cat]}
                    </h3>
                  </ScrollReveal>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {catMetrics.map((m, i) => (
                      <MetricCard key={m.id} metric={m} index={i} />
                    ))}
                  </div>
                </div>
              )
            })}
          </section>
        )}

        {/* Fund Allocation — compact layout */}
        {data.fund_allocations.length > 0 && (
          <section className="py-8 sm:py-12 border-t border-white/5">
            <ScrollReveal>
              <div className="flex items-center gap-2 mb-6">
                <DollarSign className="w-4 h-4 text-green-400" />
                <h2 className="font-heading text-lg sm:text-xl font-bold text-text-primary">
                  Fund Allocation
                </h2>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 lg:gap-10 items-start">
              <ScrollReveal>
                <DonutChart allocations={data.fund_allocations} />
              </ScrollReveal>

              <div className="space-y-2">
                {data.fund_allocations.map((a, i) => (
                  <ScrollReveal key={a.id} delay={i * 0.04}>
                    <div className="flex items-center gap-3 bg-surface border border-white/5 rounded-lg px-4 py-3 hover:border-white/10 transition-colors">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: a.color || '#3b82f6' }}
                      />
                      <span className="text-sm text-text-primary font-medium flex-1 min-w-0 truncate">{a.category}</span>
                      <span className="font-heading text-sm font-bold text-text-primary shrink-0">
                        ${Number(a.amount).toLocaleString()}
                      </span>
                      <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden shrink-0 hidden sm:block">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: a.color || '#3b82f6' }}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${Number(a.percentage)}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.6, delay: i * 0.08 }}
                        />
                      </div>
                      <span className="text-xs text-text-muted w-12 text-right shrink-0">
                        {Number(a.percentage ?? 0).toFixed(1)}%
                      </span>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Sponsor CTA — compact */}
        <section className="py-8 sm:py-12">
          <ScrollReveal>
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gold/10 via-surface to-surface border border-gold/20 p-6 sm:p-8 text-center">
              <div className="absolute top-0 left-0 w-32 h-32 bg-gold/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 right-0 w-24 h-24 bg-gold/5 rounded-full translate-x-1/3 translate-y-1/3" />
              <div className="relative">
                <Award className="w-8 h-8 text-gold mx-auto mb-3" />
                <h3 className="font-heading text-lg sm:text-xl font-bold text-text-primary mb-2">
                  Partner With Us
                </h3>
                <p className="text-text-secondary text-sm max-w-md mx-auto mb-4">
                  Interested in sponsoring the Marianas Open? Join us in growing the sport
                  and making a positive impact on our community.
                </p>
                <a
                  href="mailto:info@marianasopen.com"
                  className="inline-flex items-center gap-2 px-5 py-2 bg-gold text-navy-900 rounded-lg font-heading font-semibold text-sm hover:bg-gold/90 transition-colors"
                >
                  Get in Touch
                </a>
              </div>
            </div>
          </ScrollReveal>
        </section>
      </div>
    </>
  )
}
