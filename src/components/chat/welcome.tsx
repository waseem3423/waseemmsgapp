import { Lock, Laptop, Smartphone, ShieldCheck } from 'lucide-react';

export default function Welcome() {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-card border-l text-center p-8 relative overflow-hidden select-none">
      <div className="w-full max-w-lg space-y-6 flex flex-col items-center z-10">
        {/* WhatsApp Web Computer & Phone Graphic */}
        <div className="relative flex items-center justify-center mb-2">
          <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
            <div className="flex items-center gap-3">
              <Laptop className="h-14 w-14 text-primary animate-pulse" />
              <Smartphone className="h-10 w-10 text-primary/80" />
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground p-1.5 rounded-full shadow-md">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-light text-foreground tracking-tight">
            ZapChat Web
          </h1>
          <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
            Send and receive messages without keeping your phone online. Use ZapChat on up to 4 linked devices and 1 phone.
          </p>
        </div>
      </div>

      {/* Encryption Banner Footer */}
      <div className="absolute bottom-8 text-xs text-muted-foreground flex items-center gap-1.5 bg-muted/40 px-4 py-2 rounded-full border border-border/50 backdrop-blur-sm">
        <Lock className="h-3.5 w-3.5 text-primary" />
        <span>End-to-end encrypted personal messages</span>
      </div>
    </div>
  );
}
