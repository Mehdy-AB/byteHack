'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'

interface Profile {
  name: string | null
  role: string
  email: string
}

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zm0 9.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zm9.75-9.75A2.25 2.25 0 0115.75 3.75H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zm0 9.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    label: 'Incidents',
    href: '/dashboard/incidents',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
  {
    label: 'My Tasks',
    href: '/dashboard/tasks',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: 'Compliance',
    href: '/dashboard/compliance',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
]

const adminItem = {
  label: 'Admin',
  href: '/admin',
  icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
}

function getFilteredNavItems(role: string) {
  const items = [navItems[0]] // Dashboard is for everyone

  if (['ADMIN', 'CISO', 'SOC_LEAD', 'SOC_ANALYST'].includes(role)) {
    items.push(navItems[1]) // Incidents
  }

  items.push(navItems[2]) // My Tasks is for everyone

  if (['ADMIN', 'CISO', 'LEGAL'].includes(role)) {
    items.push(navItems[3]) // Compliance
  }

  if (role === 'ADMIN') {
    items.push(adminItem)
  }

  return items
}

function getInitials(name: string | null, email: string) {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }
  return email.slice(0, 2).toUpperCase()
}

function roleBadgeColor(role: string) {
  const map: Record<string, string> = {
    ADMIN: 'bg-red-900/40 text-red-400',
    CISO: 'bg-purple-900/40 text-purple-400',
    SOC_LEAD: 'bg-orange-900/40 text-orange-400',
    SOC_ANALYST: 'bg-blue-900/40 text-blue-400',
    IT_ADMIN: 'bg-cyan-900/40 text-cyan-400',
    LEGAL: 'bg-yellow-900/40 text-yellow-400',
    EXEC: 'bg-pink-900/40 text-pink-400',
  }
  return map[role] ?? 'bg-gray-800 text-gray-400'
}

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()

  async function handleSignOut() {
    await signOut({ callbackUrl: '/login' })
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const items = getFilteredNavItems(profile.role)

  return (
    <div className="w-60 min-w-[240px] h-screen flex flex-col bg-[#0d1117] border-r border-[#1f2937] fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#1f2937]">
        <span className="text-xl font-bold text-blue-500 tracking-tight">⬡ SF SOAR</span>
        <p className="text-[#4b5563] text-xs mt-0.5">Silent Fracture</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <p className="text-xs font-semibold text-[#4b5563] uppercase tracking-wider px-2 mb-2">Navigation</p>
        {items.map(item => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-blue-600/20 text-blue-400 border-l-2 border-blue-500 pl-[10px]'
                  : 'text-[#9ca3af] hover:text-white hover:bg-[#1a2234] border-l-2 border-transparent pl-[10px]'
              }`}
            >
              <span className={active ? 'text-blue-400' : 'text-[#6b7280]'}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-[#1f2937] p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-600/30 border border-blue-800 flex items-center justify-center text-blue-300 text-sm font-bold flex-shrink-0">
            {getInitials(profile.name, profile.email)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{profile.name || profile.email}</p>
            <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-xs font-semibold ${roleBadgeColor(profile.role)}`}>
              {profile.role.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#6b7280] hover:text-red-400 hover:bg-red-900/20 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  )
}
