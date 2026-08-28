import { Lock, Zap, MessageCircle, Shield } from 'lucide-react';

export default function Welcome() {
  return (
    <div className="flex h-full flex-col items-center justify-center relative overflow-hidden select-none"
      style={{background:'linear-gradient(135deg, #f0fdf9 0%, #f0f4ff 50%, #fdf4ff 100%)'}}>

      {/* Background Blobs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full pointer-events-none"
        style={{background:'radial-gradient(circle, rgba(20,184,166,0.08) 0%, transparent 70%)', filter:'blur(32px)'}} />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full pointer-events-none"
        style={{background:'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)', filter:'blur(28px)'}} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{background:'radial-gradient(circle, rgba(255,255,255,0.7) 0%, transparent 60%)', filter:'blur(40px)'}} />

      {/* Grid tint */}
      <div className="absolute inset-0 pointer-events-none opacity-40"
        style={{backgroundImage:'linear-gradient(rgba(20,184,166,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(20,184,166,0.04) 1px, transparent 1px)', backgroundSize:'48px 48px'}} />

      <div className="relative z-10 flex flex-col items-center max-w-md text-center px-10 animate-fade-up">
        {/* Main Icon */}
        <div className="relative mb-8 animate-float">
          <div className="w-28 h-28 rounded-3xl flex items-center justify-center relative"
            style={{background:'rgba(255,255,255,0.75)', backdropFilter:'blur(24px) saturate(180%)', border:'1px solid rgba(255,255,255,0.9)', boxShadow:'0 1px 0 rgba(255,255,255,0.95) inset, 0 0 0 0.5px rgba(0,0,0,0.05), 0 24px 56px rgba(20,184,166,0.12), 0 8px 20px rgba(0,0,0,0.06)'}}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient id="wGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#14b8a6"/>
                  <stop offset="100%" stopColor="#6366f1"/>
                </linearGradient>
              </defs>
              <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" stroke="url(#wGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="absolute inset-0 rounded-3xl border-2 border-teal-400/20 animate-ping" style={{animationDuration:'2.5s'}} />
          </div>
          {/* Badge */}
          <div className="absolute -top-2 -right-2 w-9 h-9 rounded-2xl flex items-center justify-center shadow-lg"
            style={{background:'linear-gradient(135deg, #14b8a6, #0d9488)', boxShadow:'0 4px 14px rgba(20,184,166,0.4)', border:'2px solid white'}}>
            <Zap className="h-4 w-4 text-white" />
          </div>
        </div>

        {/* Text */}
        <h1 className="text-4xl font-bold tracking-tight mb-3 gradient-text">ZapChat Web</h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
          Send and receive messages without keeping your phone online. Use ZapChat on up to 4 linked devices.
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mt-7">
          {[
            { label:'Lightning Fast', icon: Zap },
            { label:'Encrypted', icon: Shield },
            { label:'Multi-Device', icon: MessageCircle },
          ].map(({ label, icon: Icon }) => (
            <div key={label} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-teal-700"
              style={{background:'rgba(255,255,255,0.7)', backdropFilter:'blur(12px)', border:'1px solid rgba(20,184,166,0.2)', boxShadow:'0 2px 8px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.9)'}}>
              <Icon className="h-3 w-3" />
              {label}
            </div>
          ))}
        </div>

        {/* Arrow hint */}
        <div className="mt-9 flex items-center gap-2 text-xs text-muted-foreground/50">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="animate-pulse">
            <path d="M19 12H5M5 12L11 6M5 12L11 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Select a chat from the sidebar to begin</span>
        </div>
      </div>

      {/* Bottom badge */}
      <div className="absolute bottom-8 flex items-center gap-2 px-4 py-2 rounded-full text-xs text-muted-foreground/60"
        style={{background:'rgba(255,255,255,0.65)', backdropFilter:'blur(16px)', border:'1px solid rgba(255,255,255,0.8)', boxShadow:'0 4px 16px rgba(0,0,0,0.06)'}}>
        <Lock className="h-3 w-3 text-teal-500/70" />
        <span>Your personal messages are end-to-end encrypted</span>
      </div>
    </div>
  );
}
