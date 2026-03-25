import { useEffect, useState, useCallback } from 'react'
import { Users, Plus, Pencil, Trash2, X, Loader2, Save, UserPlus, MailPlus, Clock, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../services/api'
import type { UserProfile } from '../../services/api'

const ROLES = ['admin', 'staff', 'viewer'] as const

function StatusBadge({ user }: { user: UserProfile }) {
  if (user.invitation_pending) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-amber-500/10 text-amber-400">
        <Clock className="w-3 h-3" />
        Pending
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-green-500/10 text-green-400">
      <CheckCircle2 className="w-3 h-3" />
      Active
    </span>
  )
}

export default function UsersAdmin() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<number | 'invite' | null>(null)
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'staff' as string, first_name: '', last_name: '' })
  const [editRole, setEditRole] = useState('')
  const [saving, setSaving] = useState(false)
  const [resending, setResending] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      const [usersRes, meRes] = await Promise.all([api.getUsers(), api.getCurrentUser()])
      setUsers(usersRes.users)
      setCurrentUserId(meRes.user.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleInvite = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await api.createUser(inviteForm) as { user: UserProfile; invitation_sent: boolean; invitation_error?: string }
      if (res.invitation_sent) {
        setSuccess('Invitation email sent!')
      } else {
        setSuccess(`User created, but invitation email failed: ${res.invitation_error || 'Unknown error'}. You can resend it.`)
      }
      setEditing(null)
      setInviteForm({ email: '', role: 'staff', first_name: '', last_name: '' })
      await load()
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invite failed')
    } finally {
      setSaving(false)
    }
  }

  const handleResendInvitation = async (userId: number) => {
    setResending(userId)
    setError('')
    try {
      await api.resendInvitation(userId)
      setSuccess('Invitation email resent!')
      await load()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend invitation')
    } finally {
      setResending(null)
    }
  }

  const handleUpdateRole = async (id: number) => {
    setSaving(true)
    setError('')
    try {
      await api.updateUser(id, { role: editRole as UserProfile['role'] })
      setSuccess('Role updated')
      setEditing(null)
      await load()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.deleteUser(id)
      setDeleteConfirm(null)
      setSuccess('User deleted')
      await load()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-gold animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-gold" />
          <h1 className="font-heading text-2xl font-bold text-text-primary">Users</h1>
        </div>
        {editing !== 'invite' && (
          <button
            onClick={() => { setEditing('invite'); setError('') }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gold/10 text-gold text-sm font-medium hover:bg-gold/15 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Invite User
          </button>
        )}
      </div>

      <AnimatePresence>
        {success && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-4 px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 text-sm"
          >{success}</motion.div>
        )}
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-4 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
          >{error}</motion.div>
        )}
      </AnimatePresence>

      {/* Invite Form */}
      {editing === 'invite' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-surface border border-white/5 mb-6">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-heading text-sm font-semibold text-text-primary">Invite User</h2>
            <button onClick={() => setEditing(null)} className="text-text-muted hover:text-text-primary">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5">
            <p className="text-xs text-text-secondary mb-4">
              An invitation email will be sent via Clerk. The user will create their account through that link.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Email *</label>
                <input
                  value={inviteForm.email}
                  onChange={e => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                  type="email"
                  placeholder="user@example.com"
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Role</label>
                <select
                  value={inviteForm.role}
                  onChange={e => setInviteForm(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none"
                >
                  {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">First Name</label>
                <input
                  value={inviteForm.first_name}
                  onChange={e => setInviteForm(prev => ({ ...prev, first_name: e.target.value }))}
                  placeholder="Optional"
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Last Name</label>
                <input
                  value={inviteForm.last_name}
                  onChange={e => setInviteForm(prev => ({ ...prev, last_name: e.target.value }))}
                  placeholder="Optional"
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleInvite}
                disabled={saving || !inviteForm.email}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gold/10 text-gold text-sm font-medium hover:bg-gold/15 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {saving ? 'Sending Invitation...' : 'Send Invitation'}
              </button>
              <button onClick={() => setEditing(null)} className="px-5 py-2.5 text-text-muted text-sm hover:text-text-primary">Cancel</button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Users Table */}
      <div className="bg-surface border border-white/5 overflow-hidden">
        {users.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">No users</div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="border-b border-white/5 text-left">
                    <th className="px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wide">Name</th>
                    <th className="px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wide">Email</th>
                    <th className="px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wide">Role</th>
                    <th className="px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wide">Joined</th>
                    <th className="px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wide w-32"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3 text-text-primary font-medium">
                        {user.full_name}
                        {user.id === currentUserId && <span className="ml-2 text-xs text-text-muted">(you)</span>}
                      </td>
                      <td className="px-5 py-3 text-text-secondary">{user.email}</td>
                      <td className="px-5 py-3">
                        {editing === user.id ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={editRole}
                              onChange={e => setEditRole(e.target.value)}
                              className="bg-white/[0.03] border border-white/10 px-2 py-1 text-xs text-text-primary focus:border-gold/40 focus:outline-none"
                            >
                              {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                            </select>
                            <button
                              onClick={() => handleUpdateRole(user.id)}
                              disabled={saving}
                              className="p-1 text-gold hover:text-gold/80"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setEditing(null)} className="p-1 text-text-muted hover:text-text-primary">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className={`text-xs px-2 py-0.5 ${
                            user.role === 'admin' ? 'bg-gold/10 text-gold' :
                            user.role === 'staff' ? 'bg-blue-500/10 text-blue-400' :
                            'bg-white/5 text-text-muted'
                          }`}>
                            {user.role}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge user={user} />
                      </td>
                      <td className="px-5 py-3 text-text-muted text-xs">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {user.invitation_pending && (
                            <button
                              onClick={() => handleResendInvitation(user.id)}
                              disabled={resending === user.id}
                              className="p-1.5 text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50"
                              title="Resend invitation"
                            >
                              {resending === user.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <MailPlus className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          <button
                            onClick={() => { setEditRole(user.role); setEditing(user.id); setError('') }}
                            className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
                            title="Edit role"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {user.id !== currentUserId && (
                            <button
                              onClick={() => setDeleteConfirm(user.id)}
                              className="p-1.5 text-text-muted hover:text-red-400 transition-colors"
                              title="Delete user"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-white/5">
              {users.map(user => (
                <div key={user.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm text-text-primary font-medium">
                        {user.full_name}
                        {user.id === currentUserId && <span className="ml-2 text-xs text-text-muted">(you)</span>}
                      </div>
                      <div className="text-xs text-text-secondary mt-1 break-all">{user.email}</div>
                      <div className="text-xs text-text-muted mt-1">
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {editing === user.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={editRole}
                            onChange={e => setEditRole(e.target.value)}
                            className="bg-white/[0.03] border border-white/10 px-2 py-1 text-xs text-text-primary focus:border-gold/40 focus:outline-none"
                          >
                            {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                          </select>
                          <button
                            onClick={() => handleUpdateRole(user.id)}
                            disabled={saving}
                            className="p-1 text-gold hover:text-gold/80"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditing(null)} className="p-1 text-text-muted hover:text-text-primary">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className={`text-xs px-2 py-0.5 ${
                          user.role === 'admin' ? 'bg-gold/10 text-gold' :
                          user.role === 'staff' ? 'bg-blue-500/10 text-blue-400' :
                          'bg-white/5 text-text-muted'
                        }`}>
                          {user.role}
                        </span>
                      )}
                      <StatusBadge user={user} />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    {user.invitation_pending && (
                      <button
                        onClick={() => handleResendInvitation(user.id)}
                        disabled={resending === user.id}
                        className="p-1.5 text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50"
                        title="Resend invitation"
                      >
                        {resending === user.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <MailPlus className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    <button
                      onClick={() => { setEditRole(user.role); setEditing(user.id); setError('') }}
                      className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {user.id !== currentUserId && (
                      <button
                        onClick={() => setDeleteConfirm(user.id)}
                        className="p-1.5 text-text-muted hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirm !== null && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-surface border border-white/10 p-6 max-w-sm w-full mx-4"
            >
              <h3 className="font-heading text-lg font-semibold text-text-primary mb-2">Delete User</h3>
              <p className="text-sm text-text-secondary mb-5">
                Are you sure? This will remove their access.
                {users.find(u => u.id === deleteConfirm)?.invitation_pending &&
                  ' Their pending invitation will also be revoked.'}
              </p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-text-muted hover:text-text-primary">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
