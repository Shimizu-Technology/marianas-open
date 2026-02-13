import { LayoutDashboard } from 'lucide-react'

export default function AdminDashboard() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <LayoutDashboard className="w-6 h-6 text-gold" />
        <h1 className="font-heading text-2xl font-bold text-text-primary">Dashboard</h1>
      </div>
      <div className="bg-surface border border-white/5 p-8 text-center">
        <p className="text-text-secondary">Dashboard overview coming soon.</p>
      </div>
    </div>
  )
}
