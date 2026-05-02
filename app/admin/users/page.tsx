'use client'

import { useEffect, useState } from 'react'
import { Users, Search, Filter, RotateCcw, CheckCircle2, XCircle, Loader2, Mail, Bell } from 'lucide-react'

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'var(--severity-critical)',
  CISO: 'oklch(0.7 0.2 310)',
  SOC_LEAD: 'var(--severity-high)',
  SOC_ANALYST: 'var(--color-primary)',
  IT_ADMIN: 'oklch(0.74 0.18 180)',
  LEGAL: 'var(--severity-medium)',
  EXEC: 'oklch(0.7 0.2 290)',
}

const ALL_ROLES = ['ALL', 'ADMIN', 'CISO', 'SOC_LEAD', 'SOC_ANALYST', 'IT_ADMIN', 'LEGAL', 'EXEC']

interface User {
  id: string
  email: string
  name: string | null
  role: string
  is_active: boolean
  experience_level: string
  department: string | null
  phone: string | null
  total_approvals: number
  total_rejections: number
  total_tasks_completed: number
  created_at: string
}

function getInitials(name: string | null, email: string) {
  if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  return email.slice(0, 2).toUpperCase()
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('ALL')
  const [filterActive, setFilterActive] = useState<'all' | 'true' | 'false'>('all')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [notifyMsg, setNotifyMsg] = useState('')
  const [notifyLoading, setNotifyLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [patchLoading, setPatchLoading] = useState<string | null>(null)

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  function fetchUsers() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterRole !== 'ALL') params.set('role', filterRole)
    if (filterActive !== 'all') params.set('active', filterActive)
    fetch(`/api/admin/users?${params}`)
      .then(r => r.json())
      .then(d => setUsers(d.users || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchUsers() }, [filterRole, filterActive])

  const filtered = users.filter(u =>
    search === '' ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.department?.toLowerCase().includes(search.toLowerCase())
  )

  async function toggleActive(user: User) {
    setPatchLoading(user.id)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !user.is_active }),
      })
      if (!res.ok) throw new Error('Failed')
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u))
      showToast(`User ${!user.is_active ? 'activated' : 'deactivated'}`)
    } catch {
      showToast('Failed to update user', false)
    } finally {
      setPatchLoading(null)
    }
  }

  async function changeRole(user: User, role: string) {
    setPatchLoading(user.id + '-role')
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) throw new Error('Failed')
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role } : u))
      setSelectedUser(prev => prev?.id === user.id ? { ...prev, role } : prev)
      showToast('Role updated')
    } catch {
      showToast('Failed to update role', false)
    } finally {
      setPatchLoading(null)
    }
  }

  async function sendNotification() {
    if (!selectedUser || !notifyMsg.trim()) return
    setNotifyLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: notifyMsg }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to send')
      }
      showToast('Notification sent')
      setNotifyMsg('')
    } catch (e: any) {
      showToast(e.message, false)
    } finally {
      setNotifyLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg"
          style={{
            background: toast.ok ? 'color-mix(in oklab, var(--status-done) 15%, var(--color-card))' : 'color-mix(in oklab, var(--severity-critical) 15%, var(--color-card))',
            border: `1px solid ${toast.ok ? 'color-mix(in oklab, var(--status-done) 35%, transparent)' : 'color-mix(in oklab, var(--severity-critical) 35%, transparent)'}`,
            color: toast.ok ? 'var(--status-done)' : 'var(--severity-critical)',
          }}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Users className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
        <div>
          <h1 className="text-xl font-semibold">User Management</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>{users.length} users total</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: user list */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-0 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--color-muted-foreground)' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email, department…"
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
              />
            </div>
            <select
              value={filterActive}
              onChange={e => setFilterActive(e.target.value as any)}
              className="px-3 py-2 rounded-lg text-xs outline-none"
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
            >
              <option value="all">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <button onClick={fetchUsers} className="p-2 rounded-lg" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <RotateCcw className="h-3.5 w-3.5" style={{ color: 'var(--color-muted-foreground)' }} />
            </button>
          </div>

          {/* Role filter pills */}
          <div className="flex gap-2 flex-wrap">
            {ALL_ROLES.map(r => (
              <button
                key={r}
                onClick={() => setFilterRole(r)}
                className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all"
                style={filterRole === r
                  ? { background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }
                  : { background: 'color-mix(in oklab, var(--muted) 25%, transparent)', color: 'var(--color-muted-foreground)', border: '1px solid var(--color-border)' }
                }
              >
                {r}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--color-primary)' }} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>No users found</div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {filtered.map(user => {
                  const roleColor = ROLE_COLORS[user.role] || 'var(--color-muted-foreground)'
                  const isSelected = selectedUser?.id === user.id
                  return (
                    <div
                      key={user.id}
                      onClick={() => setSelectedUser(isSelected ? null : user)}
                      className="flex items-center gap-4 px-4 py-3.5 cursor-pointer transition-all"
                      style={{ background: isSelected ? 'color-mix(in oklab, var(--primary) 8%, transparent)' : undefined }}
                    >
                      <div
                        className="h-9 w-9 rounded-full grid place-items-center text-xs font-bold shrink-0"
                        style={{ background: `color-mix(in oklab, ${roleColor} 15%, transparent)`, border: `1px solid color-mix(in oklab, ${roleColor} 30%, transparent)`, color: roleColor }}
                      >
                        {getInitials(user.name, user.email)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{user.name || user.email}</span>
                          {!user.is_active && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: 'color-mix(in oklab, var(--severity-critical) 12%, transparent)', color: 'var(--severity-critical)' }}>
                              INACTIVE
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                            style={{ color: roleColor, background: `color-mix(in oklab, ${roleColor} 10%, transparent)`, border: `1px solid color-mix(in oklab, ${roleColor} 22%, transparent)` }}
                          >
                            {user.role.replace(/_/g, ' ')}
                          </span>
                          {user.department && (
                            <span className="text-[10px]" style={{ color: 'var(--color-muted-foreground)' }}>{user.department}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex gap-3 text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>
                          <span className="font-bold" style={{ color: 'var(--status-done)' }}>{user.total_approvals}✓</span>
                          <span className="font-bold" style={{ color: 'var(--severity-critical)' }}>{user.total_rejections}✗</span>
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>{user.experience_level}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: user detail panel */}
        <div>
          {selectedUser ? (
            <div className="space-y-4">
              {/* User card */}
              <div className="rounded-xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="h-12 w-12 rounded-xl grid place-items-center text-sm font-bold"
                    style={{ background: `color-mix(in oklab, ${ROLE_COLORS[selectedUser.role] || 'var(--color-primary)'} 15%, transparent)`, border: `1px solid color-mix(in oklab, ${ROLE_COLORS[selectedUser.role] || 'var(--color-primary)'} 30%, transparent)`, color: ROLE_COLORS[selectedUser.role] || 'var(--color-primary)' }}
                  >
                    {getInitials(selectedUser.name, selectedUser.email)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{selectedUser.name || '—'}</p>
                    <p className="text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>{selectedUser.email}</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                  {selectedUser.phone && <div>Phone: <span style={{ color: 'var(--color-foreground)' }}>{selectedUser.phone}</span></div>}
                  {selectedUser.department && <div>Dept: <span style={{ color: 'var(--color-foreground)' }}>{selectedUser.department}</span></div>}
                  <div>Experience: <span style={{ color: 'var(--color-foreground)' }}>{selectedUser.experience_level}</span></div>
                  <div className="flex gap-4 pt-1">
                    <span>Approvals: <strong style={{ color: 'var(--status-done)' }}>{selectedUser.total_approvals}</strong></span>
                    <span>Rejections: <strong style={{ color: 'var(--severity-critical)' }}>{selectedUser.total_rejections}</strong></span>
                  </div>
                </div>

                {/* Toggle active */}
                <button
                  onClick={() => toggleActive(selectedUser)}
                  disabled={patchLoading === selectedUser.id}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-60"
                  style={selectedUser.is_active
                    ? { background: 'color-mix(in oklab, var(--severity-critical) 12%, transparent)', color: 'var(--severity-critical)', border: '1px solid color-mix(in oklab, var(--severity-critical) 25%, transparent)' }
                    : { background: 'color-mix(in oklab, var(--status-done) 12%, transparent)', color: 'var(--status-done)', border: '1px solid color-mix(in oklab, var(--status-done) 25%, transparent)' }
                  }
                >
                  {patchLoading === selectedUser.id ? <Loader2 className="h-3 w-3 animate-spin" /> : selectedUser.is_active ? <XCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                  {selectedUser.is_active ? 'Deactivate Account' : 'Activate Account'}
                </button>
              </div>

              {/* Change role */}
              <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-muted-foreground)' }}>Change Role</p>
                <div className="grid grid-cols-2 gap-2">
                  {['SOC_ANALYST', 'SOC_LEAD', 'IT_ADMIN', 'LEGAL', 'CISO', 'EXEC', 'ADMIN'].map(role => {
                    const rColor = ROLE_COLORS[role] || 'var(--color-muted-foreground)'
                    const isCurrentRole = selectedUser.role === role
                    return (
                      <button
                        key={role}
                        onClick={() => changeRole(selectedUser, role)}
                        disabled={isCurrentRole || patchLoading === selectedUser.id + '-role'}
                        className="text-[10px] font-bold py-1.5 rounded-lg transition-all disabled:cursor-default"
                        style={isCurrentRole
                          ? { background: `color-mix(in oklab, ${rColor} 20%, transparent)`, color: rColor, border: `1px solid color-mix(in oklab, ${rColor} 40%, transparent)` }
                          : { background: 'color-mix(in oklab, var(--muted) 20%, transparent)', color: 'var(--color-muted-foreground)', border: '1px solid var(--color-border)' }
                        }
                      >
                        {role.replace(/_/g, ' ')}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Send notification */}
              <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-muted-foreground)' }}>Send Notification</p>
                <textarea
                  rows={3}
                  value={notifyMsg}
                  onChange={e => setNotifyMsg(e.target.value)}
                  placeholder="Message to send to this user..."
                  className="w-full rounded-lg text-xs p-2.5 resize-none outline-none"
                  style={{ background: 'color-mix(in oklab, var(--muted) 30%, transparent)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
                />
                <button
                  onClick={sendNotification}
                  disabled={notifyLoading || !notifyMsg.trim()}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-60"
                  style={{ background: 'color-mix(in oklab, var(--primary) 20%, transparent)', color: 'var(--color-primary)', border: '1px solid color-mix(in oklab, var(--primary) 35%, transparent)' }}
                >
                  {notifyLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
                  Send Email
                </button>
              </div>
            </div>
          ) : (
            <div
              className="rounded-xl flex flex-col items-center justify-center py-16 text-center"
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
            >
              <Users className="h-8 w-8 mb-3" style={{ color: 'color-mix(in oklab, var(--muted-foreground) 30%, transparent)' }} />
              <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Select a user</p>
              <p className="text-xs mt-1" style={{ color: 'color-mix(in oklab, var(--muted-foreground) 60%, transparent)' }}>Click on any row to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
