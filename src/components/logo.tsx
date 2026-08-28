export function Logo() {
  return (
    <div className="flex items-center justify-center gap-2.5">
      <div className="p-2 rounded-xl" style={{background:'rgba(255,255,255,0.7)', backdropFilter:'blur(12px)', border:'1px solid rgba(255,255,255,0.85)', boxShadow:'0 2px 8px rgba(20,184,166,0.12), inset 0 1px 0 rgba(255,255,255,0.9)'}}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="logoG" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#14b8a6"/>
              <stop offset="100%" stopColor="#6366f1"/>
            </linearGradient>
          </defs>
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" stroke="url(#logoG)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h1 className="text-xl font-bold gradient-text tracking-tight">ZapChat</h1>
    </div>
  );
}
