'use client'

import { useEffect, useState } from 'react'
import { User, Bell, Globe, Shield, Loader2, CheckCircle2, Save } from 'lucide-react'

type ExperienceLevel = 'JUNIOR' | 'MID' | 'SENIOR' | 'LEAD'

interface Profile {
  id: string
  email: string
  name: string | null
  role: string
  phone: string | null
  department: string | null
  bio: string | null
  experience_level: ExperienceLevel
  notify_email: boolean
  notify_sms: boolean
  timezone: string
  language: string
  total_approvals: number
  total_rejections: number
  total_tasks_completed: number
}

const EXPERIENCE_LEVELS: ExperienceLevel[] = ['JUNIOR', 'MID', 'SENIOR', 'LEAD']
const TIMEZONES = ['UTC', 'Europe/London', 'Europe/Paris', 'Africa/Algiers', 'Asia/Dubai', 'America/New_York', 'America/Los_Angeles', 'Asia/Singapore']
const LANGUAGES = [{ value: 'en', label: 'English' }, { value: 'fr', label: 'Français' }, { value: 'ar', label: 'العربية' }]

function inputStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    width: '100%',
    background: 'color-mix(in oklab, var(--muted) 30%, transparent)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-foreground)',
    borderRadius: '0.5rem',
    padding: '9px 12px',
    fontSize: '13px',
    outline: 'none',
    ...extra,
  }
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState<Partial<Profile>>({})

  useEffect(() => {
    fetch('/api/user/profile')
      .then(r => r.json())
      .then(d => {
        setProfile(d.profile)
        setForm(d.profile || {})
      })
      .finally(() => setLoading(false))
  }, [])

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed to save')
      const d = await res.json()
      setProfile(d.profile)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Account Settings</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>Manage your profile and preferences</p>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Approvals', value: profile?.total_approvals ?? 0, color: 'var(--status-done)' },
          { label: 'Rejections', value: profile?.total_rejections ?? 0, color: 'var(--severity-critical)' },
          { label: 'Completed', value: profile?.total_tasks_completed ?? 0, color: 'var(--color-primary)' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Identity */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <User className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
          <h2 className="text-sm font-semibold">Identity</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>Full Name</label>
              <input type="text" value={form.name || ''} onChange={e => set('name', e.target.value)} style={inputStyle()} placeholder="Your name" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>Email</label>
              <input type="email" value={form.email || ''} disabled style={inputStyle({ opacity: 0.5, cursor: 'not-allowed' })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>Phone</label>
              <input type="tel" value={form.phone || ''} onChange={e => set('phone', e.target.value)} style={inputStyle()} placeholder="+213 xxx xxx xxx" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>Department</label>
              <input type="text" value={form.department || ''} onChange={e => set('department', e.target.value)} style={inputStyle()} placeholder="e.g. SOC Team" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>Bio</label>
            <textarea rows={3} value={form.bio || ''} onChange={e => set('bio', e.target.value)} style={inputStyle({ resize: 'none' })} placeholder="Brief description about yourself..." />
          </div>
        </div>
      </div>

      {/* Experience */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <Shield className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
          <h2 className="text-sm font-semibold">Experience Level</h2>
        </div>
        <div className="p-5">
          <div className="flex gap-3 flex-wrap">
            {EXPERIENCE_LEVELS.map(level => (
              <button
                key={level}
                type="button"
                onClick={() => set('experience_level', level)}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={form.experience_level === level
                  ? { background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }
                  : { background: 'color-mix(in oklab, var(--muted) 30%, transparent)', color: 'var(--color-muted-foreground)', border: '1px solid var(--color-border)' }
                }
              >
                {level}
              </button>
            ))}
          </div>
          <p className="text-[11px] mt-3" style={{ color: 'var(--color-muted-foreground)' }}>
            Your current role: <span className="font-semibold" style={{ color: 'var(--color-foreground)' }}>{profile?.role?.replace(/_/g, ' ')}</span>
          </p>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <Bell className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
          <h2 className="text-sm font-semibold">Notifications</h2>
        </div>
        <div className="p-5 space-y-3">
          {[
            { key: 'notify_email', label: 'Email Notifications', desc: 'Receive task assignments and alerts by email' },
            { key: 'notify_sms', label: 'SMS Notifications', desc: 'Receive critical alerts by SMS (requires phone number)' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between gap-4 py-2">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>{item.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => set(item.key as keyof Profile, !form[item.key as keyof Profile] as any)}
                className="h-6 w-11 rounded-full relative transition-all flex-shrink-0"
                style={{ background: form[item.key as keyof Profile] ? 'var(--color-primary)' : 'color-mix(in oklab, var(--muted) 60%, transparent)' }}
              >
                <span
                  className="absolute top-0.5 h-5 w-5 rounded-full transition-all"
                  style={{ background: 'white', left: form[item.key as keyof Profile] ? 'calc(100% - 22px)' : '2px' }}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Locale */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <Globe className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
          <h2 className="text-sm font-semibold">Locale</h2>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>Timezone</label>
            <select value={form.timezone || 'UTC'} onChange={e => set('timezone', e.target.value)} style={inputStyle()}>
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>Language</label>
            <select value={form.language || 'en'} onChange={e => set('language', e.target.value)} style={inputStyle()}>
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end pb-6">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-60"
          style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
