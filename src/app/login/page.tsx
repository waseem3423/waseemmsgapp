"use client";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2, Mail, Lock, Zap, Shield, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const email = (e.currentTarget.elements.namedItem("email") as HTMLInputElement).value;
      const password = (e.currentTarget.elements.namedItem("password") as HTMLInputElement).value;
      await login({ email, password });
    } catch {
      toast({ title: "Login Failed", description: "Please check your credentials and try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center auth-bg relative overflow-hidden p-4">
      {/* Background blobs */}
      <div className="absolute top-[-8%] left-[-4%] w-96 h-96 rounded-full pointer-events-none"
        style={{background: 'radial-gradient(circle, rgba(20,184,166,0.18) 0%, transparent 70%)', filter: 'blur(40px)'}} />
      <div className="absolute bottom-[-8%] right-[-4%] w-80 h-80 rounded-full pointer-events-none"
        style={{background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', filter: 'blur(40px)'}} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 60%)', filter: 'blur(60px)'}} />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-up">
          <div className="inline-flex items-center justify-center w-18 h-18 rounded-3xl mb-5 p-4 relative"
            style={{background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.85)', boxShadow: '0 8px 32px rgba(20,184,166,0.15), inset 0 1px 0 rgba(255,255,255,0.9)'}}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient id="lg1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#14b8a6"/>
                  <stop offset="100%" stopColor="#6366f1"/>
                </linearGradient>
              </defs>
              <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" stroke="url(#lg1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold gradient-text tracking-tight">ZapChat</h1>
          <p className="text-sm text-muted-foreground mt-1.5 font-medium">Messaging, reimagined.</p>
        </div>

        {/* Glass Card */}
        <div className="liquid-glass-card rounded-3xl p-8 animate-fade-up" style={{animationDelay:'0.08s'}}>
          <h2 className="text-xl font-semibold text-foreground mb-1">Welcome back</h2>
          <p className="text-sm text-muted-foreground mb-6">Sign in to your account</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                <Input id="email" type="email" name="email" placeholder="you@example.com" required disabled={isLoading}
                  className="pl-10 h-11 rounded-xl bg-white/60 border-white/70 focus-visible:ring-2 focus-visible:ring-teal-400/40 focus-visible:border-teal-400/50 placeholder:text-muted-foreground/40 shadow-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                <Input id="password" type="password" name="password" placeholder="••••••••" required disabled={isLoading}
                  className="pl-10 h-11 rounded-xl bg-white/60 border-white/70 focus-visible:ring-2 focus-visible:ring-teal-400/40 focus-visible:border-teal-400/50 placeholder:text-muted-foreground/40 shadow-sm" />
              </div>
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full h-11 rounded-xl btn-liquid flex items-center justify-center gap-2 text-sm mt-1 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {isLoading ? "Signing in…" : "Sign In"}
              {!isLoading && <ArrowRight className="h-4 w-4 ml-auto opacity-70" />}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-black/5 text-center text-sm text-muted-foreground">
            No account?{" "}
            <Link href="/signup" className="text-teal-600 font-semibold hover:text-teal-700 underline-offset-2 hover:underline transition-colors">
              Create one free
            </Link>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground/60">
          <Shield className="h-3 w-3" />
          <span>End-to-end encrypted · Your privacy first</span>
        </div>
      </div>
    </div>
  );
}
