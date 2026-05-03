'use client'

import { CheckCircle2, Clock, Loader2, GitBranch, Terminal, Shield, Brain, User, AlertCircle } from 'lucide-react'

const STEPS = [
  { id: '1', type: 'INGEST', status: 'COMPLETED', label: 'Log Ingestion', desc: 'S3:audit-logs-2024' },
  { id: '2', type: 'AI_ANALYZE', status: 'COMPLETED', label: 'AI Deep Analysis', desc: 'Confidence: 98.4%' },
  { id: '3', type: 'CONTAINMENT', status: 'WAITING_APPROVAL', label: 'Host Isolation', desc: 'Target: 10.0.4.12' },
  { id: '4', type: 'NOTIFICATION', status: 'PENDING', label: 'Admin Notification', desc: 'Channel: Slack' },
]

export function LandingWorkflowPreview() {
  return (
    <div className="w-full h-full bg-background rounded-2xl overflow-hidden border border-border shadow-2xl flex flex-col font-sans selection:bg-primary/20">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border bg-card/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <GitBranch className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-tight">Workflow: Ransomware Detection & Response</h3>
            <p className="text-[10px] text-muted-foreground">ID: wf_4920_active</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
           LIVE_MONITOR
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative overflow-hidden bg-[radial-gradient(circle_at_center,var(--color-border)_1px,transparent_1px)] bg-[size:24px_24px]">
        {/* Node Graph Mockup */}
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="flex items-center gap-16 relative">
            {STEPS.map((step, i) => (
              <div 
                key={step.id} 
                className="relative group animate-bloom"
                style={{ animationDelay: `${i * 600}ms` }}
              >
                {/* Node */}
                <div className={`w-48 p-4 rounded-xl border transition-all duration-500 ${
                  step.status === 'COMPLETED' ? 'bg-card border-border shadow-lg shadow-black/40' :
                  step.status === 'WAITING_APPROVAL' ? 'bg-primary/5 border-primary/40 shadow-[0_0_30px_rgba(var(--primary),0.15)] node-pulse' :
                  'bg-card/50 border-white/5 opacity-40'
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2 rounded-lg ${
                      step.type === 'AI_ANALYZE' ? 'bg-primary/20 text-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]' : 'bg-muted text-muted-foreground'
                    }`}>
                      {step.type === 'AI_ANALYZE' ? <Brain className="h-4 w-4" /> : 
                       step.type === 'CONTAINMENT' ? <Shield className="h-4 w-4" /> :
                       <Terminal className="h-4 w-4" />}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {step.status === 'COMPLETED' && <CheckCircle2 className="h-4 w-4 text-status-done" />}
                      {step.status === 'WAITING_APPROVAL' && <Clock className="h-4 w-4 text-primary animate-pulse" />}
                    </div>
                  </div>
                  <h4 className="text-xs font-bold mb-1 tracking-tight">{step.label}</h4>
                  <p className="text-[10px] text-muted-foreground font-medium leading-tight">{step.desc}</p>
                  
                  {step.status === 'WAITING_APPROVAL' && (
                    <div className="mt-4 flex gap-2 animate-in fade-in zoom-in duration-500 delay-1000 fill-mode-backwards">
                      <div className="flex-1 h-7 rounded-lg bg-primary text-black text-[10px] font-black grid place-items-center cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20">APPROVE</div>
                      <div className="flex-1 h-7 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold grid place-items-center cursor-pointer hover:bg-white/10 transition-colors">VIEW</div>
                    </div>
                  )}
                </div>

                {/* Connection Line (SVG for 'draw' and 'flow' effect) */}
                {i < STEPS.length - 1 && (
                  <div className="absolute top-1/2 -right-16 w-16 h-8 -translate-y-1/2 pointer-events-none">
                    <svg className="w-full h-full overflow-visible">
                      {/* Base static line */}
                      <path 
                        d="M 0 16 L 64 16" 
                        fill="none" 
                        stroke="oklch(0.72 0.16 220 / 0.1)" 
                        strokeWidth="2" 
                      />
                      {/* Drawing line */}
                      <path 
                        d="M 0 16 L 64 16" 
                        fill="none" 
                        stroke="oklch(0.72 0.16 220 / 0.4)" 
                        strokeWidth="2" 
                        className="animate-draw"
                        style={{ animationDelay: `${(i * 600) + 300}ms` }}
                      />
                      {/* Flowing dashed line */}
                      <path 
                        d="M 0 16 L 64 16" 
                        fill="none" 
                        stroke="oklch(0.72 0.16 220 / 0.6)" 
                        strokeWidth="2" 
                        strokeDasharray="4 4"
                        className="flow-dash animate-in fade-in duration-500"
                        style={{ animationDelay: `${(i * 600) + 800}ms` }}
                      />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* AI Insight Overlay */}
        <div 
          className="absolute bottom-6 left-6 right-6 p-5 glass rounded-2xl border border-white/10 flex items-start gap-5 animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-backwards shadow-2xl"
          style={{ animationDelay: `${STEPS.length * 600}ms` }}
        >
           <div className="h-10 w-10 shrink-0 rounded-full bg-primary/20 grid place-items-center text-primary">
              <Brain className="h-5 w-5" />
           </div>
           <div>
              <div className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">AI Analyst Insight</div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                Detected lateral movement attempt on 10.0.4.12 following anomalous SMB traffic. <span className="text-foreground">Quarantine recommended</span> to prevent domain controller compromise.
              </p>
           </div>
           <div className="ml-auto text-[10px] font-mono text-muted-foreground">Confidence 98.4%</div>
        </div>
      </div>
    </div>
  )
}
