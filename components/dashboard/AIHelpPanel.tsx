'use client'

import { useState, useEffect, useRef } from 'react'
import {
  ArrowLeft, Send, Sparkles, CheckCircle2, XCircle,
  FileJson, User, Bot, Loader2, ChevronRight, Zap,
  AlertTriangle, Clock, Shield, Activity, ChevronDown
} from 'lucide-react'
import { SeverityBadge, StatusBadge } from '@/components/badges'

export interface Task {
  id: string
  incident_id: string
  incident_title: string
  type: string
  status: string
  assigned_role: string | null
  message: string | null
  context: { severity: string; source: string; playbook_id?: string; ai_confidence?: number }
  requested_at: string
  sla_expires_at: string | null
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  isTyping?: boolean
  hasSolution?: boolean
  isError?: boolean
}

function renderMarkdown(text: string) {
  return text
    // Headers
    .replace(/^### (.*$)/gim, '<h3 style="font-size:13px;font-weight:700;margin:12px 0 6px;color:var(--color-primary)">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 style="font-size:14px;font-weight:700;margin:16px 0 8px;color:var(--foreground)">$1</h2>')
    
    // Alerts (GitHub style)
    .replace(/^> \[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\n([\s\S]*?)(?=\n\n|\n$|$)/gim, (match, type, content) => {
      const colors: Record<string, string> = {
        NOTE: 'var(--color-primary)',
        TIP: 'var(--status-done)',
        IMPORTANT: 'oklch(0.7 0.2 310)',
        WARNING: 'var(--severity-medium)',
        CAUTION: 'var(--severity-critical)'
      }
      const color = colors[type] || 'var(--color-primary)'
      return `<div style="margin:10px 0;padding:10px 14px;border-left:3px solid ${color};background:color-mix(in oklab, ${color} 8%, transparent);border-radius:4px;font-size:11px"><strong style="color:${color};display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em;font-size:9px">${type}</strong>${content}</div>`
    })

    // Bold/Italic
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    
    // Code blocks
    .replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre style="background:rgba(0,0,0,0.3);padding:10px 12px;border-radius:6px;font-size:10px;margin:8px 0;overflow-x:auto;border:1px solid rgba(255,255,255,0.1);font-family:monospace;white-space:pre-wrap;word-break:break-all">$1</pre>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.08);padding:1px 5px;border-radius:3px;font-family:monospace;font-size:10px;color:var(--color-primary)">$1</code>')
    
    // Lists
    .replace(/^\* (.*$)/gim, '<div style="display:flex;gap:8px;margin-bottom:4px"><span style="color:var(--color-primary)">•</span><span>$1</span></div>')
    .replace(/^\d\. (.*$)/gim, '<div style="display:flex;gap:8px;margin-bottom:4px"><span style="color:var(--color-primary);font-weight:700">$&</span></div>') // Simple hack for numbered lists
    
    // Horizontal rule
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--color-border);margin:12px 0"/>')
    
    // Newlines
    .replace(/\n\n/g, '<div style="height:8px"></div>')
    .replace(/\n/g, '<br/>')
}

function countdownText(expiresAt: string): string {
  const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
  if (diff <= 0) return 'SLA Expired'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`
  return `${Math.floor(diff / 86400)}d remaining`
}

interface Props {
  task: Task
  onClose: () => void
}

export function AIHelpPanel({ task, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [solutionAccepted, setSolutionAccepted] = useState(false)
  const [solutionDeclined, setSolutionDeclined] = useState(false)
  const [executed, setExecuted] = useState(false)
  const [payloadOpen, setPayloadOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const isExpiredSla = task.sla_expires_at && new Date(task.sla_expires_at) < new Date()

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem(`sf:task-chat:${task.id}`)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setMessages(parsed)
        // Also restore solution status if any message has it
        if (parsed.some((m: Message) => m.hasSolution)) {
          setSolutionAccepted(localStorage.getItem(`sf:task-chat-accepted:${task.id}`) === 'true')
        }
      } catch (e) {
        console.error('Failed to load chat history', e)
      }
    } else {
      setMessages([{
        id: 'intro',
        role: 'assistant',
        content: `I'm ready to help with the **${task.type.replace(/_/g, ' ')}** step on incident **${task.incident_title}**.\n\nDescribe what you need — a recommended action, risk assessment, or anything about this step.`,
      }])
    }
    
    setSolutionDeclined(false)
    setExecuted(false)
    setInput('')
    return () => { abortRef.current?.abort() }
  }, [task.id])

  // Save history whenever messages change
  useEffect(() => {
    if (messages.length > 0 && messages[0].id !== 'intro' || messages.length > 1) {
      localStorage.setItem(`sf:task-chat:${task.id}`, JSON.stringify(messages))
    }
  }, [messages, task.id])

  // Save acceptance state
  useEffect(() => {
    localStorage.setItem(`sf:task-chat-accepted:${task.id}`, String(solutionAccepted))
  }, [solutionAccepted, task.id])

  function clearHistory() {
    localStorage.removeItem(`sf:task-chat:${task.id}`)
    localStorage.removeItem(`sf:task-chat-accepted:${task.id}`)
    setMessages([{
      id: 'intro',
      role: 'assistant',
      content: `Chat cleared. How else can I help with this **${task.type.replace(/_/g, ' ')}** step?`,
    }])
    setSolutionAccepted(false)
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function improveInChat(aspect?: string) {
    setInput(aspect
      ? `Please improve the solution — specifically: ${aspect}`
      : 'Please improve your proposed solution with a refined version.')
    setSolutionDeclined(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function handleExecute() {
    setExecuted(true)
    window.dispatchEvent(new CustomEvent('sf:task-resolved'))
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || thinking) return
    setInput('')

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text }
    const assistantId = `a-${Date.now()}`

    setMessages(prev => [...prev, userMsg, { id: 'typing', role: 'assistant', content: '', isTyping: true }])
    setThinking(true)
    abortRef.current = new AbortController()

    try {
      const historyForApi = [...messages, userMsg]
        .filter(m => !m.isTyping && !m.isError)
        .map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/ai/task-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
        body: JSON.stringify({ messages: historyForApi, task }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Error ${res.status}`)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      setMessages(prev => prev.filter(m => m.id !== 'typing').concat({ id: assistantId, role: 'assistant', content: '' }))

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullText += decoder.decode(value, { stream: true })
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, content: fullText, hasSolution: fullText.includes('PROPOSED SOLUTION') }
            : m
        ))
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return
      setMessages(prev => prev.filter(m => m.id !== 'typing').concat({
        id: `err-${Date.now()}`, role: 'assistant', content: err.message || 'Something went wrong.', isError: true,
      }))
    } finally {
      setThinking(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const rawPayload = {
    step_id: task.id,
    incident_id: task.incident_id,
    type: task.type,
    status: task.status,
    assigned_role: task.assigned_role,
    message: task.message,
    context: task.context,
    requested_at: task.requested_at,
    sla_expires_at: task.sla_expires_at,
  }

  return (
    <div
      className="fixed top-0 bottom-0 right-0 flex flex-col z-30"
      style={{ left: '240px', background: 'var(--color-background)' }}
    >
      {/* ── Top bar ── */}
      <div
        className="shrink-0 flex items-center gap-3 px-5 h-12"
        style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-card)' }}
      >
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-70 shrink-0"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> My Tasks
        </button>

        <div className="h-4 w-px shrink-0" style={{ background: 'var(--color-border)' }} />

        <div className="h-5 w-5 rounded grid place-items-center shrink-0" style={{ background: 'color-mix(in oklab, var(--color-primary) 15%, transparent)' }}>
          <Sparkles className="h-3 w-3" style={{ color: 'var(--color-primary)' }} />
        </div>
        <span className="text-sm font-semibold">AI Assistance</span>

        <div className="h-4 w-px shrink-0 mx-1" style={{ background: 'var(--color-border)' }} />

        <span className="text-xs truncate flex-1 min-w-0" style={{ color: 'var(--color-muted-foreground)' }}>
          {task.incident_title}
        </span>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={clearHistory}
            className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded transition-colors hover:bg-muted"
            style={{ color: 'var(--color-muted-foreground)' }}
          >
            Clear History
          </button>
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded"
            style={{ background: 'color-mix(in oklab, var(--muted) 40%, transparent)', color: 'var(--color-muted-foreground)', border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)' }}
          >
            {task.type.replace(/_/g, ' ')}
          </span>
          <SeverityBadge severity={task.context?.severity || 'MEDIUM'} />
          <StatusBadge status={task.status} />
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 min-h-0 flex">

        {/* ═══ LEFT — Payload Info ═══ */}
        <div
          className="w-[420px] shrink-0 overflow-y-auto"
          style={{ borderRight: '1px solid var(--color-border)', background: 'color-mix(in oklab, var(--card) 40%, transparent)' }}
        >
          <div className="p-5 space-y-4">

            {/* Incident block */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-muted-foreground)' }}>Incident</p>
              <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                <div>
                  <p className="text-sm font-semibold leading-snug">{task.incident_title}</p>
                  <p className="text-[10px] font-mono mt-1 break-all" style={{ color: 'var(--color-muted-foreground)' }}>{task.incident_id}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <SeverityBadge severity={task.context?.severity || 'MEDIUM'} />
                  <StatusBadge status={task.status} />
                  {task.context?.source && (
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono" style={{ background: 'color-mix(in oklab, var(--muted) 40%, transparent)', color: 'var(--color-muted-foreground)', border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)' }}>
                      {task.context.source}
                    </span>
                  )}
                </div>
                {task.context?.playbook_id && (
                  <div className="flex items-center gap-2">
                    <Shield className="h-3 w-3 shrink-0" style={{ color: 'var(--color-muted-foreground)' }} />
                    <span className="text-[11px] font-mono" style={{ color: 'var(--color-muted-foreground)' }}>{task.context.playbook_id}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Step block */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-muted-foreground)' }}>Step Details</p>
              <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                <div className="grid grid-cols-2 divide-x divide-y" style={{ borderColor: 'color-mix(in oklab, var(--border) 50%, transparent)' }}>
                  {[
                    { label: 'Type', value: <span className="font-mono text-xs">{task.type.replace(/_/g, ' ')}</span> },
                    { label: 'Assigned To', value: <span className="text-xs">{task.assigned_role?.replace(/_/g, ' ') || '—'}</span> },
                    {
                      label: 'Requested',
                      value: <span className="text-xs">{new Date(task.requested_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    },
                    {
                      label: 'SLA',
                      value: task.sla_expires_at
                        ? <span className="text-xs font-semibold" style={{ color: isExpiredSla ? 'var(--severity-critical)' : 'var(--severity-medium)' }}>{countdownText(task.sla_expires_at)}</span>
                        : <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>—</span>
                    },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-4 py-3">
                      <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: 'var(--color-muted-foreground)' }}>{label}</p>
                      {value}
                    </div>
                  ))}
                </div>

                {task.message && (
                  <div className="px-4 py-3" style={{ borderTop: '1px solid color-mix(in oklab, var(--border) 50%, transparent)' }}>
                    <p className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--color-muted-foreground)' }}>Message</p>
                    <div
                      className="text-xs px-3 py-2.5 rounded-lg leading-relaxed"
                      style={{ background: 'color-mix(in oklab, var(--color-primary) 8%, transparent)', border: '1px solid color-mix(in oklab, var(--color-primary) 15%, transparent)', color: 'color-mix(in oklab, var(--foreground) 85%, transparent)' }}
                    >
                      {task.message}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AI Confidence */}
            {task.context?.ai_confidence != null && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-muted-foreground)' }}>AI Triage Confidence</p>
                <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Activity className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
                      <span className="text-xs font-semibold">Confidence Score</span>
                    </div>
                    <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--color-primary)' }}>
                      {(task.context.ai_confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'color-mix(in oklab, var(--muted) 60%, transparent)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(task.context.ai_confidence * 100).toFixed(0)}%`, background: 'var(--color-primary)' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Raw Payload — collapsible */}
            <div>
              <button
                onClick={() => setPayloadOpen(v => !v)}
                className="w-full flex items-center justify-between mb-3"
              >
                <div className="flex items-center gap-2">
                  <FileJson className="h-3.5 w-3.5" style={{ color: 'var(--color-muted-foreground)' }} />
                  <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>Raw Payload</p>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${payloadOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--color-muted-foreground)' }} />
              </button>
              {payloadOpen && (
                <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                  <div className="p-4 overflow-x-auto">
                    <pre className="text-[10px] font-mono leading-relaxed whitespace-pre-wrap break-all" style={{ color: 'color-mix(in oklab, var(--foreground) 70%, transparent)' }}>
                      {JSON.stringify(rawPayload, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Quick improve shortcuts */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-muted-foreground)' }}>Quick Actions</p>
              <div className="space-y-2">
                {[
                  { label: 'Improve Payload Parameters', aspect: 'the step message and execution parameters based on the payload' },
                  { label: 'Improve Risk Assessment', aspect: 'the risk assessment and recommended action for compliance' },
                  { label: 'Suggest Alternative Approach', aspect: 'an alternative approach or workaround if the current step cannot be completed' },
                ].map(({ label, aspect }) => (
                  <button
                    key={label}
                    onClick={() => improveInChat(aspect)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium text-left transition-colors"
                    style={{ background: 'color-mix(in oklab, var(--muted) 25%, transparent)', color: 'var(--color-foreground)', border: '1px solid color-mix(in oklab, var(--border) 50%, transparent)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in oklab, var(--color-primary) 10%, transparent)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'color-mix(in oklab, var(--muted) 25%, transparent)')}
                  >
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--color-primary)' }} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* ═══ RIGHT — AI Chat ═══ */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div
                  className="h-7 w-7 rounded-full grid place-items-center shrink-0 mt-0.5"
                  style={
                    msg.isError
                      ? { background: 'color-mix(in oklab, var(--severity-critical) 12%, transparent)', border: '1px solid color-mix(in oklab, var(--severity-critical) 25%, transparent)' }
                      : msg.role === 'assistant'
                        ? { background: 'color-mix(in oklab, var(--color-primary) 12%, transparent)', border: '1px solid color-mix(in oklab, var(--color-primary) 25%, transparent)' }
                        : { background: 'color-mix(in oklab, var(--muted) 60%, transparent)', border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)' }
                  }
                >
                  {msg.isError
                    ? <AlertTriangle className="h-3.5 w-3.5" style={{ color: 'var(--severity-critical)' }} />
                    : msg.role === 'assistant'
                      ? <Bot className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
                      : <User className="h-3.5 w-3.5" style={{ color: 'var(--color-muted-foreground)' }} />
                  }
                </div>

                <div className={`max-w-[80%] flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {msg.isTyping ? (
                    <div className="px-4 py-3 rounded-2xl rounded-tl-sm" style={{ background: 'var(--color-card)', border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)' }}>
                      <div className="flex gap-1 items-center h-4">
                        {[0, 1, 2].map(i => (
                          <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--color-primary)', animationDelay: `${i * 150}ms` }} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`px-4 py-3 text-xs leading-relaxed ${msg.role === 'user' ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl rounded-tl-sm'}`}
                      style={
                        msg.isError
                          ? { background: 'color-mix(in oklab, var(--severity-critical) 8%, transparent)', border: '1px solid color-mix(in oklab, var(--severity-critical) 20%, transparent)', color: 'var(--severity-critical)' }
                          : msg.role === 'user'
                            ? { background: 'color-mix(in oklab, var(--color-primary) 15%, transparent)', border: '1px solid color-mix(in oklab, var(--color-primary) 25%, transparent)', color: 'var(--color-foreground)' }
                            : { background: 'var(--color-card)', border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)', color: 'var(--color-foreground)' }
                      }
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                    />
                  )}

                  {msg.hasSolution && !solutionAccepted && !solutionDeclined && (
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => setSolutionAccepted(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold"
                        style={{ background: 'color-mix(in oklab, var(--status-done) 15%, transparent)', color: 'var(--status-done)', border: '1px solid color-mix(in oklab, var(--status-done) 30%, transparent)' }}
                      >
                        <CheckCircle2 className="h-3 w-3" /> Accept Solution
                      </button>
                      <button
                        onClick={() => setSolutionDeclined(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold"
                        style={{ background: 'color-mix(in oklab, var(--muted) 40%, transparent)', color: 'var(--color-muted-foreground)', border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)' }}
                      >
                        <XCircle className="h-3 w-3" /> Refine
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {solutionAccepted && (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid color-mix(in oklab, var(--status-done) 25%, transparent)' }}>
                <div className="flex items-center gap-3 px-4 py-3" style={{ background: 'color-mix(in oklab, var(--status-done) 10%, transparent)' }}>
                  <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: 'var(--status-done)' }} />
                  <div className="flex-1">
                    <p className="text-xs font-semibold" style={{ color: 'var(--status-done)' }}>Solution Accepted</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'color-mix(in oklab, var(--status-done) 70%, transparent)' }}>
                      Ready to execute — or refine it first.
                    </p>
                  </div>
                </div>
                {!executed ? (
                  <div className="flex gap-2 px-4 py-3" style={{ background: 'color-mix(in oklab, var(--status-done) 5%, transparent)', borderTop: '1px solid color-mix(in oklab, var(--status-done) 15%, transparent)' }}>
                    <button onClick={handleExecute} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-semibold" style={{ background: 'var(--status-done)', color: '#fff' }}>
                      <Zap className="h-3 w-3" /> Execute Solution
                    </button>
                    <button onClick={() => improveInChat()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold" style={{ background: 'color-mix(in oklab, var(--color-primary) 10%, transparent)', color: 'var(--color-primary)', border: '1px solid color-mix(in oklab, var(--color-primary) 25%, transparent)' }}>
                      <ChevronRight className="h-3 w-3" /> Improve First
                    </button>
                  </div>
                ) : (
                  <div className="px-4 py-3 text-[11px] font-semibold" style={{ background: 'color-mix(in oklab, var(--status-done) 5%, transparent)', color: 'var(--status-done)', borderTop: '1px solid color-mix(in oklab, var(--status-done) 15%, transparent)' }}>
                    Executed — use the back button to return to your tasks.
                  </div>
                )}
              </div>
            )}

            {solutionDeclined && !solutionAccepted && (
              <div className="px-4 py-3 rounded-xl text-xs" style={{ background: 'color-mix(in oklab, var(--muted) 30%, transparent)', border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)', color: 'var(--color-muted-foreground)' }}>
                Got it — keep chatting or use a Quick Action on the left to refine the solution.
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 px-5 py-4" style={{ borderTop: '1px solid var(--color-border)', background: 'color-mix(in oklab, var(--card) 50%, transparent)' }}>
            {executed ? (
              <p className="text-center text-xs py-2" style={{ color: 'var(--color-muted-foreground)' }}>
                Solution executed — use the back button to return to your tasks.
              </p>
            ) : (
              <>
                <div className="flex gap-3 items-end">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Ask a question, request a solution, or describe what you need…"
                    rows={2}
                    className="flex-1 resize-none text-xs rounded-xl px-4 py-3 focus:outline-none"
                    style={{ background: 'color-mix(in oklab, var(--muted) 30%, transparent)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)', lineHeight: '1.5' }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || thinking}
                    className="h-10 w-10 grid place-items-center rounded-xl transition-all disabled:opacity-40"
                    style={{ background: 'var(--color-primary)', color: 'var(--color-background)' }}
                  >
                    {thinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[10px] mt-2" style={{ color: 'color-mix(in oklab, var(--muted-foreground) 45%, transparent)' }}>
                  Enter to send · Shift+Enter for new line · Powered by AI
                </p>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
