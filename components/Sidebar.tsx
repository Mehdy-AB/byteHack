'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { LayoutDashboard, AlertTriangle, CheckSquare, Shield, Settings, LogOut, History, Users, Activity, Gavel } from 'lucide-react'

interface Profile {
  name: string | null
  role: string
  email: string
}

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  {
    label: 'Incidents',
    href: '/dashboard/incidents',
    icon: <AlertTriangle className="w-4 h-4" />,
    roles: ['ADMIN', 'CISO', 'SOC_LEAD', 'SOC_ANALYST'],
  },
  { label: 'My Tasks', href: '/dashboard/tasks', icon: <CheckSquare className="w-4 h-4" /> },
  { label: 'History', href: '/dashboard/history', icon: <History className="w-4 h-4" /> },
  {
    label: 'Compliance',
    href: '/dashboard/compliance',
    icon: <Gavel className="w-4 h-4" />,
    roles: ['ADMIN', 'CISO', 'LEGAL'],
  },
  { label: 'Settings', href: '/dashboard/settings', icon: <Settings className="w-4 h-4" /> },
]

const adminItems = [
  { label: 'System Monitor', href: '/admin', icon: <Shield className="w-4 h-4" /> },
  { label: 'Users', href: '/admin/users', icon: <Users className="w-4 h-4" /> },
  { label: 'Audit Log', href: '/admin/audit', icon: <Activity className="w-4 h-4" /> },
]

function getInitials(name: string | null, email: string) {
  if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  return email.slice(0, 2).toUpperCase()
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'var(--severity-critical)',
  CISO: 'oklch(0.7 0.2 310)',
  SOC_LEAD: 'var(--severity-high)',
  SOC_ANALYST: 'var(--color-primary)',
  IT_ADMIN: 'oklch(0.74 0.18 180)',
  LEGAL: 'var(--severity-medium)',
  EXEC: 'oklch(0.7 0.2 290)',
}

const isAdmin = (role: string) => ['ADMIN', 'CISO', 'SOC_LEAD'].includes(role)

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()

  const items = navItems.filter(i => !i.roles || i.roles.includes(profile.role))

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const roleColor = ROLE_COLORS[profile.role] || 'var(--color-muted-foreground)'

  function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
    const active = isActive(href)
    return (
      <Link
        href={href}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
        style={active
          ? { background: 'color-mix(in oklab, var(--primary) 15%, transparent)', color: 'var(--color-primary)', borderLeft: '2px solid var(--color-primary)', paddingLeft: '10px' }
          : { color: 'var(--color-muted-foreground)', borderLeft: '2px solid transparent', paddingLeft: '10px' }
        }
      >
        <span style={{ color: active ? 'var(--color-primary)' : 'oklch(0.55 0.02 260)' }}>
          {icon}
        </span>
        {label}
      </Link>
    )
  }

  return (
    <div
      className="w-60 min-w-[240px] h-screen flex flex-col fixed left-0 top-0 z-40"
      style={{ background: 'var(--color-sidebar)', borderRight: '1px solid var(--color-sidebar-border)' }}
    >
      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid var(--color-sidebar-border)' }}>
        <div className="flex items-center gap-2.5">
          <div
            className="h-8 w-8 rounded-lg grid place-items-center"
            style={{ background: 'color-mix(in oklab, var(--primary) 15%, transparent)', border: '1px solid color-mix(in oklab, var(--primary) 25%, transparent)' }}
          >
            <Shield className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">SF SOAR</div>
            <div className="text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>Silent Fracture</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest px-2 mb-2" style={{ color: 'var(--color-muted-foreground)' }}>
          Navigation
        </p>
        {items.map(item => (
          <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} />
        ))}

        {isAdmin(profile.role) && (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-widest px-2 mt-5 mb-2" style={{ color: 'var(--color-muted-foreground)' }}>
              Administration
            </p>
            {adminItems.map(item => (
              <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} />
            ))}
          </>
        )}
      </nav>

      {/* User section */}
      <div className="p-4 space-y-3" style={{ borderTop: '1px solid var(--color-sidebar-border)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: `color-mix(in oklab, ${roleColor} 15%, transparent)`, border: `1px solid color-mix(in oklab, ${roleColor} 30%, transparent)`, color: roleColor }}
          >
            {getInitials(profile.name, profile.email)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{profile.name || profile.email}</p>
            <span
              className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold"
              style={{ background: `color-mix(in oklab, ${roleColor} 12%, transparent)`, color: roleColor, border: `1px solid color-mix(in oklab, ${roleColor} 25%, transparent)` }}
            >
              {profile.role.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: 'var(--color-muted-foreground)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--severity-critical)'; (e.currentTarget as HTMLElement).style.background = 'color-mix(in oklab, var(--severity-critical) 10%, transparent)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-muted-foreground)'; (e.currentTarget as HTMLElement).style.background = '' }}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
