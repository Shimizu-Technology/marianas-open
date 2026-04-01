import { useEffect, useState, useCallback } from 'react'
import {
  BarChart3, Plus, Pencil, Trash2, X, Loader2, Save, ToggleLeft, ToggleRight,
  Globe, Users, Trophy, Heart, DollarSign, Star, TrendingUp, MapPin, Plane,
  Building, Hotel, Calendar, Award, Target, Zap
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../services/api'
import type { ImpactMetric, ImpactMetricFormData, FundAllocation, FundAllocationFormData } from '../../services/api'

const CATEGORIES = [
  { value: 'tourism', label: 'Tourism', color: 'text-blue-400 bg-blue-500/10' },
  { value: 'competition', label: 'Competition', color: 'text-gold bg-gold/10' },
  { value: 'economic', label: 'Economic', color: 'text-green-400 bg-green-500/10' },
  { value: 'community', label: 'Community', color: 'text-purple-400 bg-purple-500/10' },
]

const CATEGORY_MAP: Record<string, { label: string; color: string }> = Object.fromEntries(
  CATEGORIES.map(c => [c.value, { label: c.label, color: c.color }])
)

const ICON_OPTIONS = [
  { value: 'globe', label: 'Globe', Icon: Globe },
  { value: 'users', label: 'People', Icon: Users },
  { value: 'trophy', label: 'Trophy', Icon: Trophy },
  { value: 'heart', label: 'Heart', Icon: Heart },
  { value: 'dollar', label: 'Dollar', Icon: DollarSign },
  { value: 'star', label: 'Star', Icon: Star },
  { value: 'trending', label: 'Trending', Icon: TrendingUp },
  { value: 'pin', label: 'Location', Icon: MapPin },
  { value: 'plane', label: 'Travel', Icon: Plane },
  { value: 'building', label: 'Building', Icon: Building },
  { value: 'hotel', label: 'Hotel', Icon: Hotel },
  { value: 'calendar', label: 'Calendar', Icon: Calendar },
  { value: 'award', label: 'Award', Icon: Award },
  { value: 'target', label: 'Target', Icon: Target },
  { value: 'zap', label: 'Energy', Icon: Zap },
]

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = Object.fromEntries(
  ICON_OPTIONS.map(i => [i.value, i.Icon])
)

const FUND_COLORS = [
  '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444',
  '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#6366f1',
]

const emptyMetricForm: ImpactMetricFormData = {
  label: '', value: '', description: '', category: 'tourism',
  icon: 'globe', sort_order: 0, active: true, highlight: false,
}

const emptyFundForm: FundAllocationFormData = {
  category: '', amount: 0, description: '', color: FUND_COLORS[0],
  sort_order: 0, active: true,
}

type Tab = 'metrics' | 'funds'

export default function ImpactAdmin() {
  const [tab, setTab] = useState<Tab>('metrics')
  const [metrics, setMetrics] = useState<ImpactMetric[]>([])
  const [funds, setFunds] = useState<FundAllocation[]>([])
  const [totalAmount, setTotalAmount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [metricForm, setMetricForm] = useState<ImpactMetricFormData>(emptyMetricForm)
  const [fundForm, setFundForm] = useState<FundAllocationFormData>(emptyFundForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const loadMetrics = useCallback(async () => {
    try {
      const res = await api.admin.getImpactMetrics()
      setMetrics(res.impact_metrics)
    } catch { /* noop */ }
  }, [])

  const loadFunds = useCallback(async () => {
    try {
      const res = await api.admin.getFundAllocations()
      setFunds(res.fund_allocations)
      setTotalAmount(res.total_amount)
    } catch { /* noop */ }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadMetrics(), loadFunds()]).finally(() => setLoading(false))
  }, [loadMetrics, loadFunds])

  useEffect(() => {
    if (editing === null) return
    if (tab === 'metrics') {
      if (editing === 'new') {
        setMetricForm({ ...emptyMetricForm, sort_order: metrics.length })
      } else {
        const m = metrics.find(x => x.id === editing)
        if (m) setMetricForm({
          label: m.label, value: m.value, description: m.description || '',
          category: m.category, icon: m.icon || 'globe', sort_order: m.sort_order,
          active: m.active, highlight: m.highlight,
        })
      }
    } else {
      if (editing === 'new') {
        setFundForm({ ...emptyFundForm, sort_order: funds.length, color: FUND_COLORS[funds.length % FUND_COLORS.length] })
      } else {
        const f = funds.find(x => x.id === editing)
        if (f) setFundForm({
          category: f.category, amount: f.amount, description: f.description || '',
          color: f.color || FUND_COLORS[0], sort_order: f.sort_order, active: f.active,
        })
      }
    }
  }, [editing, tab, metrics, funds])

  const handleSaveMetric = async () => {
    setSaving(true)
    setError('')
    try {
      if (editing === 'new') {
        await api.admin.createImpactMetric(metricForm)
        setSuccess('Metric created')
      } else if (typeof editing === 'number') {
        await api.admin.updateImpactMetric(editing, metricForm)
        setSuccess('Metric updated')
      }
      await loadMetrics()
      setEditing(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveFund = async () => {
    setSaving(true)
    setError('')
    try {
      if (editing === 'new') {
        await api.admin.createFundAllocation(fundForm)
        setSuccess('Fund allocation created')
      } else if (typeof editing === 'number') {
        await api.admin.updateFundAllocation(editing, fundForm)
        setSuccess('Fund allocation updated')
      }
      await loadFunds()
      setEditing(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      if (tab === 'metrics') {
        await api.admin.deleteImpactMetric(id)
        await loadMetrics()
      } else {
        await api.admin.deleteFundAllocation(id)
        await loadFunds()
      }
      setDeleteConfirm(null)
      setSuccess('Deleted successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  const handleToggleActive = async (item: ImpactMetric | FundAllocation) => {
    try {
      if (tab === 'metrics') {
        await api.admin.updateImpactMetric(item.id, { active: !item.active })
        await loadMetrics()
      } else {
        await api.admin.updateFundAllocation(item.id, { active: !item.active })
        await loadFunds()
      }
    } catch { /* noop */ }
  }

  useEffect(() => {
    if (!success) return
    const t = setTimeout(() => setSuccess(''), 3000)
    return () => clearTimeout(t)
  }, [success])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gold" />
      </div>
    )
  }

  const activeMetrics = metrics.filter(m => m.active)
  const activeFunds = funds.filter(f => f.active)
  const activeFundTotal = activeFunds.reduce((s, f) => s + Number(f.amount), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gold/10">
            <BarChart3 className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold text-text-primary">Impact & Analytics</h1>
            <p className="text-sm text-text-muted">Manage tourism data, competition stats, and fund allocation for sponsors</p>
          </div>
        </div>
        <button
          onClick={() => { setEditing('new'); setError('') }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gold/10 text-gold rounded-lg hover:bg-gold/20 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add {tab === 'metrics' ? 'Metric' : 'Fund Item'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface border border-white/5 rounded-lg p-4">
          <div className="text-2xl font-bold text-text-primary">{activeMetrics.length}</div>
          <div className="text-xs text-text-muted mt-1">Active Metrics</div>
        </div>
        <div className="bg-surface border border-white/5 rounded-lg p-4">
          <div className="text-2xl font-bold text-text-primary">{metrics.length}</div>
          <div className="text-xs text-text-muted mt-1">Total Metrics</div>
        </div>
        <div className="bg-surface border border-white/5 rounded-lg p-4">
          <div className="text-2xl font-bold text-text-primary">{activeFunds.length}</div>
          <div className="text-xs text-text-muted mt-1">Fund Categories</div>
        </div>
        <div className="bg-surface border border-white/5 rounded-lg p-4">
          <div className="text-2xl font-bold text-gold">
            ${activeFundTotal.toLocaleString()}
          </div>
          <div className="text-xs text-text-muted mt-1">Total Budget</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface border border-white/5 rounded-lg p-1">
        <button
          onClick={() => { setTab('metrics'); setEditing(null) }}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'metrics' ? 'bg-gold/10 text-gold' : 'text-text-muted hover:text-text-secondary'}`}
        >
          Impact Metrics ({metrics.length})
        </button>
        <button
          onClick={() => { setTab('funds'); setEditing(null) }}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'funds' ? 'bg-gold/10 text-gold' : 'text-text-muted hover:text-text-secondary'}`}
        >
          Fund Allocation ({funds.length})
        </button>
      </div>

      {/* Toasts */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-lg text-sm"
          >
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Metrics Tab */}
      {tab === 'metrics' && (
        <div className="space-y-3">
          {metrics.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No impact metrics yet.</p>
              <p className="text-sm mt-1">Add metrics like "Countries Represented", "Off-Island Athletes", etc.</p>
            </div>
          ) : (
            metrics.map(m => (
              <motion.div
                key={m.id}
                layout
                className={`bg-surface border border-white/5 rounded-lg p-4 ${!m.active ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0 ${CATEGORY_MAP[m.category]?.color || 'bg-white/5 text-text-muted'}`}>
                    {ICON_MAP[m.icon || 'globe'] ? (() => {
                      const Icon = ICON_MAP[m.icon || 'globe']
                      return <Icon className="w-5 h-5" />
                    })() : <Globe className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-heading text-lg font-bold text-text-primary">{m.value}</span>
                      {m.highlight && <Star className="w-4 h-4 text-gold fill-gold" />}
                    </div>
                    <div className="text-sm text-text-secondary">{m.label}</div>
                    {m.description && <div className="text-xs text-text-muted mt-1">{m.description}</div>}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_MAP[m.category]?.color || 'bg-white/5 text-text-muted'}`}>
                        {CATEGORY_MAP[m.category]?.label || m.category}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggleActive(m)}
                      className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
                      title={m.active ? 'Deactivate' : 'Activate'}
                    >
                      {m.active ? <ToggleRight className="w-5 h-5 text-green-400" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => { setEditing(m.id); setError('') }}
                      className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(m.id)}
                      className="p-1.5 text-text-muted hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Funds Tab */}
      {tab === 'funds' && (
        <div className="space-y-3">
          {/* Mini donut preview */}
          {activeFunds.length > 0 && (
            <div className="bg-surface border border-white/5 rounded-lg p-4">
              <div className="text-xs text-text-muted mb-3 font-medium uppercase tracking-wider">Budget Breakdown Preview</div>
              <div className="flex gap-1 h-4 rounded-full overflow-hidden bg-white/5">
                {activeFunds.map(f => {
                  const pct = activeFundTotal > 0 ? (Number(f.amount) / activeFundTotal * 100) : 0
                  return (
                    <div
                      key={f.id}
                      style={{ width: `${pct}%`, backgroundColor: f.color || FUND_COLORS[0] }}
                      className="transition-all duration-300"
                      title={`${f.category}: $${Number(f.amount).toLocaleString()} (${pct.toFixed(1)}%)`}
                    />
                  )
                })}
              </div>
              <div className="flex flex-wrap gap-3 mt-3">
                {activeFunds.map(f => (
                  <div key={f.id} className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: f.color || FUND_COLORS[0] }} />
                    {f.category} ({activeFundTotal > 0 ? (Number(f.amount) / activeFundTotal * 100).toFixed(0) : 0}%)
                  </div>
                ))}
              </div>
            </div>
          )}

          {funds.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No fund allocations yet.</p>
              <p className="text-sm mt-1">Add budget categories like "Prize Money", "Venue", "Travel Subsidies", etc.</p>
            </div>
          ) : (
            funds.map(f => (
              <motion.div
                key={f.id}
                layout
                className={`bg-surface border border-white/5 rounded-lg p-4 ${!f.active ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-3 h-10 rounded-full shrink-0 mt-0.5"
                    style={{ backgroundColor: f.color || FUND_COLORS[0] }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-heading font-bold text-text-primary">{f.category}</div>
                    <div className="text-lg font-semibold text-gold mt-0.5">
                      ${Number(f.amount).toLocaleString()}
                      {activeFundTotal > 0 && (
                        <span className="text-sm text-text-muted font-normal ml-2">
                          ({(Number(f.amount) / activeFundTotal * 100).toFixed(1)}%)
                        </span>
                      )}
                    </div>
                    {f.description && <div className="text-xs text-text-muted mt-1">{f.description}</div>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggleActive(f)}
                      className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
                      title={f.active ? 'Deactivate' : 'Activate'}
                    >
                      {f.active ? <ToggleRight className="w-5 h-5 text-green-400" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => { setEditing(f.id); setError('') }}
                      className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(f.id)}
                      className="p-1.5 text-text-muted hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Edit / Create Panel */}
      <AnimatePresence>
        {editing !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setEditing(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-surface border border-white/10 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/5">
                <h3 className="font-heading font-bold text-text-primary">
                  {editing === 'new' ? 'Add' : 'Edit'} {tab === 'metrics' ? 'Impact Metric' : 'Fund Allocation'}
                </h3>
                <button onClick={() => setEditing(null)} className="text-text-muted hover:text-text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {tab === 'metrics' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">Label *</label>
                      <input
                        value={metricForm.label}
                        onChange={e => setMetricForm(p => ({ ...p, label: e.target.value }))}
                        placeholder="e.g., Countries Represented"
                        className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">Value *</label>
                      <input
                        value={metricForm.value}
                        onChange={e => setMetricForm(p => ({ ...p, value: e.target.value }))}
                        placeholder="e.g., 12 or $50,000 or 450+"
                        className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                      />
                      <p className="text-xs text-text-muted mt-1">Can be a number, currency, percentage, or any text</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
                      <input
                        value={metricForm.description}
                        onChange={e => setMetricForm(p => ({ ...p, description: e.target.value }))}
                        placeholder="e.g., Athletes traveling from outside Guam"
                        className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Category</label>
                        <select
                          value={metricForm.category}
                          onChange={e => setMetricForm(p => ({ ...p, category: e.target.value }))}
                          className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-text-primary focus:border-gold/40 focus:outline-none"
                        >
                          {CATEGORIES.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Icon</label>
                        <select
                          value={metricForm.icon}
                          onChange={e => setMetricForm(p => ({ ...p, icon: e.target.value }))}
                          className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-text-primary focus:border-gold/40 focus:outline-none"
                        >
                          {ICON_OPTIONS.map(i => (
                            <option key={i.value} value={i.value}>{i.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={metricForm.active}
                          onChange={e => setMetricForm(p => ({ ...p, active: e.target.checked }))}
                          className="w-4 h-4 rounded border-white/20 bg-white/5 text-gold focus:ring-gold/40"
                        />
                        <span className="text-sm text-text-secondary">Active</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={metricForm.highlight}
                          onChange={e => setMetricForm(p => ({ ...p, highlight: e.target.checked }))}
                          className="w-4 h-4 rounded border-white/20 bg-white/5 text-gold focus:ring-gold/40"
                        />
                        <span className="text-sm text-text-secondary">Highlight (featured)</span>
                      </label>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">Category Name *</label>
                      <input
                        value={fundForm.category}
                        onChange={e => setFundForm(p => ({ ...p, category: e.target.value }))}
                        placeholder="e.g., Prize Money"
                        className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">Amount ($) *</label>
                      <input
                        type="number"
                        value={fundForm.amount || ''}
                        onChange={e => setFundForm(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                        placeholder="e.g., 15000"
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
                      <input
                        value={fundForm.description}
                        onChange={e => setFundForm(p => ({ ...p, description: e.target.value }))}
                        placeholder="e.g., Cash prizes for gold medal winners"
                        className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">Color</label>
                      <div className="flex flex-wrap gap-2">
                        {FUND_COLORS.map(c => (
                          <button
                            key={c}
                            onClick={() => setFundForm(p => ({ ...p, color: c }))}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${fundForm.color === c ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={fundForm.active}
                        onChange={e => setFundForm(p => ({ ...p, active: e.target.checked }))}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-gold focus:ring-gold/40"
                      />
                      <span className="text-sm text-text-secondary">Active</span>
                    </label>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-3 p-4 border-t border-white/5">
                <button
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={tab === 'metrics' ? handleSaveMetric : handleSaveFund}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gold/10 text-gold rounded-lg hover:bg-gold/20 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteConfirm !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-surface border border-white/10 rounded-xl p-6 max-w-sm w-full"
            >
              <h3 className="font-heading font-bold text-text-primary mb-2">Delete {tab === 'metrics' ? 'Metric' : 'Fund Item'}?</h3>
              <p className="text-sm text-text-muted mb-4">This action cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-text-muted hover:text-text-primary">
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
