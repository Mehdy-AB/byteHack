import Link from 'next/link'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/auth'
import { Shield, Cpu, Activity, Zap, Lock, ChevronRight, ArrowRight, CheckCircle2, Globe, Server, Brain } from 'lucide-react'
import { LandingWorkflowPreview } from '@/components/dashboard/LandingWorkflowPreview'

export default async function Home() {
  const session = await getServerSession(authOptions)

  return (
    <div className="min-h-screen flex flex-col mesh-bg selection:bg-primary/30">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between glass-dark border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary/20 grid place-items-center border border-primary/30">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <span className="text-xl font-bold tracking-tight">Mythos</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden md:block">Features</Link>
          <Link href="#compliance" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden md:block">Compliance</Link>
          <Link 
            href={session ? '/dashboard' : '/login'} 
            className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/25"
          >
            {session ? 'Dashboard' : 'Login'}
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 flex flex-col items-center text-center overflow-hidden">
        <div className="hero-glow" />
        
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold uppercase tracking-widest text-primary mb-8 animate-in fade-in slide-in-from-top-4 duration-1000">
          <Zap className="w-3 h-3 fill-primary" />
          Autonomous SOAR Platform
        </div>

        <h1 className="text-5xl md:text-7xl font-black mb-6 max-w-4xl text-gradient leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-700">
          Security that thinks <br />
          and acts for you.
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl leading-relaxed animate-in fade-in slide-in-from-bottom-12 duration-1000">
          Mythos is an autonomous Security Operations Center that detects, analyzes, and responds to threats in real-time. Experience the next generation of SOAR.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-16 duration-1000">
          <Link 
            href={session ? '/dashboard' : '/login'}
            className="px-8 py-4 rounded-2xl bg-white text-black font-bold text-lg flex items-center gap-2 group transition-all hover:scale-105 hover:shadow-2xl hover:shadow-white/10"
          >
            Launch System
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link 
            href="#features"
            className="px-8 py-4 rounded-2xl glass text-white font-bold text-lg transition-all hover:bg-white/10"
          >
            Learn More
          </Link>
        </div>

        {/* Hero Visual Previews */}
        <div className="mt-20 relative w-full max-w-6xl aspect-[16/8] animate-in zoom-in-95 duration-1000">
          <LandingWorkflowPreview />
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 px-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: <Cpu className="w-8 h-8" />,
              title: "AI Analysis Engine",
              desc: "Every log and incident is processed by Gemini 1.5 Flash for deep contextual understanding."
            },
            {
              icon: <Zap className="w-8 h-8" />,
              title: "Instant Response",
              desc: "Automated workflows contain threats in milliseconds, not hours."
            },
            {
              icon: <Lock className="w-8 h-8" />,
              title: "Compliance Ready",
              desc: "Built-in Law 18-07 tracking and 72h notification automated alerts."
            }
          ].map((f, i) => (
            <div key={i} className="p-8 rounded-3xl glass border border-white/5 transition-all hover:bg-white/[0.05] group">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 grid place-items-center text-primary mb-6 group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <h3 className="text-xl font-bold mb-4">{f.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="py-20 bg-primary/5 border-y border-white/5 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1 space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold leading-tight">
              A command center <br />
              built for the elite.
            </h2>
            <div className="space-y-4">
              {[
                { icon: <Globe className="w-5 h-5" />, text: "Global threat intelligence feed integration" },
                { icon: <Server className="w-5 h-5" />, text: "Real-time infrastructure monitoring" },
                { icon: <Shield className="w-5 h-5" />, text: "Automated forensic data collection" }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 text-muted-foreground">
                  <div className="text-primary">{item.icon}</div>
                  <span className="font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 relative">
             <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full" />
             <div className="relative glass rounded-3xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  </div>
                  <div className="px-3 py-1 rounded-full bg-white/5 text-[10px] font-mono border border-white/10">mythos-terminal v1.0</div>
                </div>
                <div className="space-y-4 font-mono text-xs">
                  <div className="text-green-500">$ mythos analyze --incident-id=4920</div>
                  <div className="text-white/70 tracking-tight">
                    {"[SYSTEM] Initializing Gemini 1.5 Flash..."}<br />
                    {"[SYSTEM] Analyzing network packet anomalies..."}<br />
                    {"[ALERT] Exfiltration pattern detected from source 10.0.4.12"}<br />
                    {"[ACTION] Automated isolation workflow triggered."}<br />
                  </div>
                  <div className="flex items-center gap-2 text-primary font-bold">
                    <span className="animate-pulse">_</span>
                    READY FOR COMMAND
                  </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-12 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2.5 opacity-50">
            <Shield className="h-4 w-4" />
            <span className="text-sm font-bold tracking-tight">Mythos</span>
          </div>
          <div className="text-muted-foreground text-xs font-medium">
            © 2024 Mythos Autonomous SOAR. All rights reserved.
          </div>
          <div className="flex gap-6 text-muted-foreground text-sm font-medium">
            <Link href="#" className="hover:text-foreground transition-colors">Documentation</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
