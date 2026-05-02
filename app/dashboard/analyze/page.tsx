'use client'

import { useState } from 'react'
import { Activity, Shield, AlertTriangle, Cpu, Code, BookOpen, ChevronRight, Terminal, CheckCircle2, Play } from 'lucide-react'
import toast from 'react-hot-toast'

interface SearchResult {
  chunk_id: string
  topic: string
  type: string
  content: string
  similarity: number
  page_start?: number
}

interface AnalyzeResponse {
  incident_type: string
  summary: string
  retrieval: {
    query: string
    topic_used: string
    chunks_found: number
    grouped: Record<string, SearchResult[]>
    assembled_context: string
  }
  workflow: any
}

const Card = ({ children, className = "", style = {} }: { children: React.ReactNode, className?: string, style?: React.CSSProperties }) => (
  <div 
    className={`bg-card border border-border rounded-xl overflow-hidden ${className}`} 
    style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', ...style }}
  >
    {children}
  </div>
)

export default function AIAnalyzerPage() {
  const [logs, setLogs] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [activeTab, setActiveTab] = useState<'summary' | 'workflow' | 'context'>('summary')
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: () => {} })

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault()
    
    if (!logs.trim()) {
      toast.error('Please paste some security logs to analyze.')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      // Try to parse as JSON first, if it fails, send as a string in a wrapper
      let payload: any
      try {
        payload = JSON.parse(logs)
      } catch {
        payload = { raw_text: logs, incident_type: 'Manual Investigation' }
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze logs')
      }

      setResult(data)
      toast.success('AI Analysis complete!')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Cpu className="w-6 h-6 text-primary" style={{ color: 'var(--color-primary)' }} />
            AI Incident Analyzer
          </h1>
          <p className="text-muted-foreground mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
            Analyze raw logs using RAG-powered expert knowledge and generate mitigation workflows.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-primary/5 border border-primary/20 px-3 py-1.5 rounded-full text-primary"
          style={{ background: 'color-mix(in oklab, var(--primary) 5%, transparent)', border: '1px solid color-mix(in oklab, var(--primary) 20%, transparent)', color: 'var(--color-primary)' }}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" style={{ background: 'var(--color-primary)' }}></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" style={{ background: 'var(--color-primary)' }}></span>
          </span>
          Gemini 1.5 Flash Active
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Section */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="h-full flex flex-col">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between" style={{ background: 'color-mix(in oklab, var(--muted) 20%, transparent)', borderBottom: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Terminal className="w-4 h-4 text-primary" style={{ color: 'var(--color-primary)' }} />
                Raw Security Logs
              </div>
              <button 
                onClick={() => setLogs('')}
                className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                style={{ color: 'var(--color-muted-foreground)' }}
              >
                Clear
              </button>
            </div>
            <div className="flex-1 p-0 relative">
              <textarea
                value={logs}
                onChange={(e) => setLogs(e.target.value)}
                placeholder='Paste your Wazuh alerts, SIEM logs, or raw JSON incident data here...'
                className="w-full h-[500px] lg:h-full bg-transparent border-none focus:ring-0 p-4 font-mono text-xs resize-none placeholder:text-muted-foreground/50"
                style={{ color: 'var(--color-foreground)', outline: 'none' }}
              />
              <div className="absolute bottom-4 right-4">
                <button
                  onClick={handleAnalyze}
                  disabled={loading || !logs.trim()}
                  className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-semibold shadow-lg shadow-primary/20 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100"
                  style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
                >
                  {loading ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      Run Analysis
                    </>
                  )}
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* Results Section */}
        <div className="lg:col-span-7">
          {!result ? (
            <Card className="h-full border-dashed border-2 flex flex-col items-center justify-center text-center p-12 min-h-[500px]"
              style={{ background: 'color-mix(in oklab, var(--muted) 10%, transparent)', borderStyle: 'dashed', borderWidth: '2px' }}>
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-6" style={{ background: 'var(--color-muted)' }}>
                <Shield className="w-8 h-8 text-muted-foreground" style={{ color: 'var(--color-muted-foreground)' }} />
              </div>
              <h3 className="text-lg font-semibold">Ready for Analysis</h3>
              <p className="text-muted-foreground max-w-sm mt-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                Paste incident logs on the left to trigger the RAG orchestration pipeline. We'll cross-reference with security handbooks to find the best response.
              </p>
            </Card>
          ) : (
            <Card className="h-full flex flex-col min-h-[500px]">
              <div className="px-4 border-b border-border" style={{ background: 'color-mix(in oklab, var(--muted) 20%, transparent)', borderBottom: '1px solid var(--color-border)' }}>
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
                  <button
                    onClick={() => setActiveTab('summary')}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                      activeTab === 'summary' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                    style={activeTab === 'summary' ? { borderBottomColor: 'var(--color-primary)', color: 'var(--color-primary)' } : { color: 'var(--color-muted-foreground)' }}
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Analysis Summary
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('workflow')}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                      activeTab === 'workflow' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                    style={activeTab === 'workflow' ? { borderBottomColor: 'var(--color-primary)', color: 'var(--color-primary)' } : { color: 'var(--color-muted-foreground)' }}
                  >
                    <div className="flex items-center gap-2">
                      <Code className="w-4 h-4" />
                      JSON Workflow
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('context')}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                      activeTab === 'context' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                    style={activeTab === 'context' ? { borderBottomColor: 'var(--color-primary)', color: 'var(--color-primary)' } : { color: 'var(--color-muted-foreground)' }}
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Expert Context
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'summary' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 mb-2"
                          style={{ background: 'color-mix(in oklab, var(--primary) 10%, transparent)', color: 'var(--color-primary)', border: '1px solid color-mix(in oklab, var(--primary) 20%, transparent)' }}>
                          Attack Detected
                        </div>
                        <h2 className="text-2xl font-bold">{result.incident_type}</h2>
                      </div>
                      <div className="bg-muted px-4 py-3 rounded-xl text-center border border-border" style={{ background: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Confidence</div>
                        <div className="text-xl font-mono font-bold text-primary" style={{ color: 'var(--color-primary)' }}>98%</div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-border leading-relaxed text-sm" style={{ background: 'color-mix(in oklab, var(--muted) 15%, transparent)', border: '1px solid var(--color-border)' }}>
                      {result.summary}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-border bg-muted/30" style={{ border: '1px solid var(--color-border)', background: 'color-mix(in oklab, var(--muted) 10%, transparent)' }}>
                        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-3 flex items-center gap-1.5" style={{ color: 'var(--color-muted-foreground)' }}>
                          <Activity className="w-3 h-3" />
                          Knowledge Base Retrieval
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="text-2xl font-bold">{result.retrieval.chunks_found}</div>
                          <div className="text-xs text-muted-foreground pb-1">Context Chunks</div>
                        </div>
                      </div>
                      <div className="p-4 rounded-xl border border-border bg-muted/30" style={{ border: '1px solid var(--color-border)', background: 'color-mix(in oklab, var(--muted) 10%, transparent)' }}>
                        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-3 flex items-center gap-1.5" style={{ color: 'var(--color-muted-foreground)' }}>
                          <AlertTriangle className="w-3 h-3 text-primary" style={{ color: 'var(--color-primary)' }} />
                          Risk Assessment
                        </div>
                        <div className="flex items-end gap-2 text-primary" style={{ color: 'var(--color-primary)' }}>
                          <div className="text-2xl font-bold uppercase">High</div>
                          <div className="text-xs pb-1">Mitigation Required</div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4">
                      <button 
                        onClick={() => setActiveTab('workflow')}
                        className="w-full flex items-center justify-between p-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm transition-all hover:brightness-110 group"
                        style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
                      >
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          View Recommended Response Workflow
                        </span>
                        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'workflow' && (
                  <div className="h-full animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-xs font-mono text-muted-foreground">GENERATED_RESPONSE_PLAN.json</div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setConfirmModal({
                              open: true,
                              title: 'Execute Workflow',
                              message: 'Initialize a new incident and start executing this AI-generated response plan immediately?',
                              onConfirm: async () => {
                                toast.loading('Initializing workflow...', { id: 'exec' })
                                try {
                                  const res = await fetch('/api/analyze/execute', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(result.workflow),
                                  })
                                  const d = await res.json()
                                  if (!res.ok) throw new Error(d.error || 'Execution failed')
                                  
                                  toast.success('Incident Created & Workflow Started!', { id: 'exec' })
                                  setConfirmModal(prev => ({ ...prev, open: false }))
                                } catch (err: any) {
                                  toast.error(err.message, { id: 'exec' })
                                }
                              }
                            })
                          }}
                          className="text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary hover:bg-primary/30 px-3 py-1 rounded transition-colors flex items-center gap-1.5"
                          style={{ background: 'color-mix(in oklab, var(--primary) 15%, transparent)', color: 'var(--color-primary)' }}
                        >
                          <Play className="w-3 h-3 fill-current" />
                          Execute Workflow
                        </button>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify(result.workflow, null, 2))
                            toast.success('Workflow copied to clipboard')
                          }}
                          className="text-[10px] font-bold uppercase tracking-wider bg-muted hover:bg-border px-3 py-1 rounded transition-colors"
                          style={{ background: 'var(--color-muted)' }}
                        >
                          Copy JSON
                        </button>
                      </div>
                    </div>
                    <pre className="p-4 rounded-lg bg-black text-[#50fa7b] font-mono text-xs overflow-x-auto border border-[#50fa7b]/20 leading-relaxed max-h-[500px]"
                      style={{ background: '#000', color: '#50fa7b', borderColor: 'rgba(80, 250, 123, 0.2)' }}>
                      {JSON.stringify(result.workflow, null, 2)}
                    </pre>
                  </div>
                )}

                {activeTab === 'context' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Source: The Web Application Hacker's Handbook</div>
                      <div className="text-xs text-muted-foreground italic">Top {result.retrieval.chunks_found} relevant passages</div>
                    </div>
                    
                    <div className="space-y-4">
                      {Object.entries(result.retrieval.grouped).map(([type, chunks]) => (
                        <div key={type} className="space-y-3">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
                            <span className="h-px flex-1 bg-primary/20" style={{ background: 'color-mix(in oklab, var(--primary) 20%, transparent)' }}></span>
                            {type}
                            <span className="h-px flex-1 bg-primary/20" style={{ background: 'color-mix(in oklab, var(--primary) 20%, transparent)' }}></span>
                          </div>
                          {chunks.map((chunk, idx) => (
                            <div key={idx} className="p-4 rounded-xl border border-border bg-muted/20 space-y-2" style={{ border: '1px solid var(--color-border)', background: 'color-mix(in oklab, var(--muted) 10%, transparent)' }}>
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded border border-border uppercase">
                                  {chunk.topic} • Chunk {chunk.chunk_id.slice(-4)}
                                </div>
                                <div className="text-[10px] font-mono text-primary" style={{ color: 'var(--color-primary)' }}>
                                  {(chunk.similarity * 100).toFixed(1)}% Match
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed italic" style={{ color: 'var(--color-muted-foreground)' }}>
                                "{chunk.content.length > 300 ? chunk.content.slice(0, 300) + '...' : chunk.content}"
                              </p>
                              {chunk.page_start && (
                                <div className="text-[9px] text-muted-foreground text-right">
                                  Ref: WAHH pg.{chunk.page_start}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
      {/* Confirmation Modal */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}
          />
          <div 
            className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200"
            style={{ background: 'var(--color-card)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-primary/15 grid place-items-center" style={{ background: 'color-mix(in oklab, var(--primary) 15%, transparent)' }}>
                <Shield className="h-5 w-5 text-primary" style={{ color: 'var(--color-primary)' }} />
              </div>
              <h2 className="text-xl font-bold">{confirmModal.title}</h2>
            </div>
            
            <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--color-muted-foreground)' }}>
              {confirmModal.message}
            </p>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                style={{ background: 'var(--color-muted)', color: 'var(--color-foreground)' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-primary/20"
                style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
              >
                Confirm & Execute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
