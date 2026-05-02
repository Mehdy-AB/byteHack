'use client'

import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { Shield, Loader2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      if (errorParam === 'CredentialsSignin') {
        setError('Invalid email or password.')
      } else if (errorParam === 'SessionRequired') {
        setError('Please sign in to access this page.')
      } else {
        setError('Authentication failed. Please try again.')
      }
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await signIn('credentials', { email, password, redirect: false })
    if (result?.error) {
      const message = result.error === 'CredentialsSignin' ? 'Invalid email or password.' : 'An error occurred during sign in.'
      setError(message)
      toast.error(message)
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'color-mix(in oklab, var(--input) 60%, transparent)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-foreground)',
    borderRadius: '0.5rem',
    padding: '10px 12px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.15s',
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--color-background)' }}>
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'color-mix(in oklab, var(--primary) 15%, transparent)', border: '1px solid color-mix(in oklab, var(--primary) 25%, transparent)' }}
          >
            <Shield className="h-7 w-7" style={{ color: 'var(--color-primary)' }} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">SF SOAR</h1>
          <p className="text-xs mt-1 uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
            Security Operations Platform
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <h2 className="text-lg font-semibold mb-1">Sign In</h2>
          <p className="text-xs mb-6" style={{ color: 'var(--color-muted-foreground)' }}>Access your SOAR dashboard</p>

          {error && (
            <div 
              className="mb-4 p-3 rounded-lg text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-1"
              style={{ 
                background: 'color-mix(in oklab, var(--color-destructive) 10%, transparent)',
                border: '1px solid color-mix(in oklab, var(--color-destructive) 20%, transparent)',
                color: 'var(--color-destructive)'
              }}
            >
              <AlertCircle className="h-3.5 w-3.5" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="analyst@org.com"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--color-ring)')}
                onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--color-ring)')}
                onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold mt-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Authenticating…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] mt-6" style={{ color: 'color-mix(in oklab, var(--muted-foreground) 60%, transparent)' }}>
          Silent Fracture SOAR — Authorized Access Only
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--color-background)' }}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
