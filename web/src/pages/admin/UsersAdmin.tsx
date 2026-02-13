import { Users } from 'lucide-react'

export default function UsersAdmin() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Users className="w-6 h-6 text-gold" />
        <h1 className="font-heading text-2xl font-bold text-text-primary">Users</h1>
      </div>
      <div className="bg-surface border border-white/5 p-8 text-center">
        <p className="text-text-secondary">User management coming soon.</p>
      </div>
    </div>
  )
}
