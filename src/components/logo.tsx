import { MessageCircle } from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center justify-center gap-2">
      <div className="p-2 rounded-lg">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor: '#0A48A5'}} />
                    <stop offset="100%" style={{stopColor: '#2AF598'}} />
                </linearGradient>
            </defs>
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" stroke="url(#iconGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h1 className="text-2xl font-bold font-headline text-foreground">
        <span style={{color: '#0052D4'}}>Zap</span>
        <span style={{color: '#43C6AC'}}>Chat</span>
      </h1>
    </div>
  );
}
