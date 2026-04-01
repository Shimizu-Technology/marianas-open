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
  tourism: 'Tourism',
  competition: 'Competition',
  economic: 'Economic',
  community: 'Community',
}

const CATEGORY_COLORS: Record<string, string> = {
  tourism: 'text-blue-400 bg-blue-500/10',
  competition: 'text-gold bg-gold/10',
  economic: 'text-green-400 bg-green-500/10',
  community: 'text-purple-400 bg-purple-500/10',
}

function MetricCard({ metric, index }: { metric: ImpactMetric; index: number }) {
  const shouldReduceMotion = useReducedMotion()
  const Icon = ICON_MAP[metric.icon || 'globe'] || Globe
  const catColor = CATEGORY_COLORS[metric.category] || 'text-text-muted bg-white/5'

  return (
    <motion.div
      initial={shouldReduceMotion ? {} : { opacity: 0, y: 16 }}
      whileInView={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className={`rounded-xl border transition-all duration-300 h-full ${
        metric.highlight
          ? 'bg-gradient-to-br from-gold/8 via-surface to-surface border-gold/20 hover:border-gold/40'
          : 'bg-surface border-white/5 hover:border-white/10'
      }`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className={`p-2 rounded-lg ${metric.highlight ? 'bg-gold/15 text-gold' : 'bg-white/5 text-text-secondary'}`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${catColor}`}>
            {CATEGORY_LABELS[metric.category] || metric.category}
          </span>
        </div>
        <div className={`font-heading font-bold leading-tight ${
          metric.highlight ? 'text-3xl text-gold' : 'text-2xl text-text-primary'
        }`}>
          {metric.value}
        </div>
        <div className={`text-sm mt-1 ${metric.highlight ? 'text-gold/70 font-medium' : 'text-text-muted'}`}>
          {metric.label}
        </div>
        {metric.description && (
          <div className="text-xs text-text-muted mt-2 leading-relaxed">{metric.description}</div>
        )}
      </div>
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
      <>
        <SEO
          title="Impact & Transparency"
          description="See how the Marianas Open impacts tourism, competition, and the community."
          path="/impact"
        />
        <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
          <div className="p-4 rounded-2xl bg-gold/5 mb-5">
            <TrendingUp className="w-10 h-10 text-gold/40" />
          </div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-text-primary mb-2">
            Impact Report Coming Soon
          </h1>
          <p className="text-sm text-text-muted max-w-md">
            We're compiling data on how the Marianas Open impacts tourism, competition,
            and economic growth for our island community. Check back soon.
          </p>
        </div>
      </>
    )
  }

  const allMetrics = data.impact_metrics
  const count = allMetrics.length

  // Choose grid columns based on how many metrics exist so it always looks full
  let gridCols = 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4'
  if (count === 1) gridCols = 'grid-cols-1 max-w-sm mx-auto'
  else if (count === 2) gridCols = 'grid-cols-2 max-w-2xl mx-auto'
  else if (count === 3) gridCols = 'grid-cols-1 sm:grid-cols-3 max-w-4xl mx-auto'
  else if (count === 4) gridCols = 'grid-cols-2 lg:grid-cols-4'
  else if (count >= 5 && count <= 6) gridCols = 'grid-cols-2 sm:grid-cols-3'

  return (
    <>
      <SEO
        title="Impact & Transparency"
        description="See how the Marianas Open impacts tourism, competition, and the community. Full transparency on fund allocation."
        path="/impact"
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Hero */}
        <section className="pt-24 pb-6 sm:pt-28 sm:pb-8 text-center">
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

        {/* All metrics — single unified grid */}
        {allMetrics.length > 0 && (
          <section className="py-6 sm:py-8">
            <div className={`grid gap-3 sm:gap-4 ${gridCols}`}>
              {allMetrics.map((m, i) => (
                <MetricCard key={m.id} metric={m} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* Fund Allocation */}
        {data.fund_allocations.length > 0 && (
          <section className="py-6 sm:py-10 border-t border-white/5">
            <ScrollReveal>
              <div className="flex items-center gap-2 mb-5">
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

        {/* Sponsor CTA */}
        <section className="py-6 sm:py-10">
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
