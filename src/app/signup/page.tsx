"use client";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef } from "react";
import { Loader2, Camera, Mail, Lock, User, Zap, Shield, ArrowRight } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function SignupPage() {
  const { signup } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [nameVal, setNameVal] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (file.size > 500*1024) { toast({ variant:"destructive", title:"Image Too Large", description:"Max 500KB please." }); e.target.value=''; return; }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const uploadToGitHub = async (file: File): Promise<string|null> => {
    const fd = new FormData(); fd.append("file", file);
    try {
      const r = await fetch("/api/upload", { method:"POST", body:fd });
      if (!r.ok) throw new Error();
      return (await r.json()).url;
    } catch {
      toast({ title:"Upload Failed", description:"Try again.", variant:"destructive" });
      return null;
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setIsLoading(true);
    const name = (e.currentTarget.elements.namedItem("name") as HTMLInputElement).value;
    const email = (e.currentTarget.elements.namedItem("email") as HTMLInputElement).value;
    const password = (e.currentTarget.elements.namedItem("password") as HTMLInputElement).value;
    let avatarUrl = `https://picsum.photos/seed/${name||'user'}/100/100`;
    if (avatarFile) { const u = await uploadToGitHub(avatarFile); if (u) avatarUrl=u; else { setIsLoading(false); return; } }
    try { await signup({ name, email, password, avatar: avatarUrl }); }
    catch { toast({ title:"Signup Failed", description:"Try again.", variant:"destructive" }); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center auth-bg relative overflow-hidden p-4">
      <div className="absolute top-[-8%] left-[-4%] w-96 h-96 rounded-full pointer-events-none"
        style={{background:'radial-gradient(circle, rgba(20,184,166,0.18) 0%, transparent 70%)', filter:'blur(40px)'}} />
      <div className="absolute bottom-[-8%] right-[-4%] w-80 h-80 rounded-full pointer-events-none"
        style={{background:'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', filter:'blur(40px)'}} />

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-7 animate-fade-up">
          <div className="inline-flex items-center justify-center w-18 h-18 rounded-3xl mb-4 p-4"
            style={{background:'rgba(255,255,255,0.65)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.85)', boxShadow:'0 8px 32px rgba(20,184,166,0.15), inset 0 1px 0 rgba(255,255,255,0.9)'}}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <defs><linearGradient id="lg2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#14b8a6"/><stop offset="100%" stopColor="#6366f1"/></linearGradient></defs>
              <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" stroke="url(#lg2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold gradient-text tracking-tight">ZapChat</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Join millions chatting</p>
        </div>

        <div className="liquid-glass-card rounded-3xl p-8 animate-fade-up" style={{animationDelay:'0.06s'}}>
          <h2 className="text-xl font-semibold text-foreground mb-1">Create account</h2>
          <p className="text-sm text-muted-foreground mb-5">Get started in seconds</p>

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Avatar picker */}
            <div className="flex justify-center mb-1">
              <button type="button" className="relative group focus:outline-none" onClick={() => fileInputRef.current?.click()}>
                <Avatar className="h-20 w-20 ring-2 ring-white shadow-lg group-hover:ring-teal-300 transition-all">
                  <AvatarImage src={avatarPreview||`https://picsum.photos/seed/placeholder/100/100`} />
                  <AvatarFallback className="bg-teal-50 text-teal-600 font-bold text-2xl">{nameVal?.[0]?.toUpperCase()||'?'}</AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center shadow-md btn-liquid">
                  <Camera className="h-3.5 w-3.5 text-white" />
                </div>
              </button>
              <input type="file" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" accept="image/png,image/jpeg,image/gif" />
            </div>

            {[
              { label:'Name', id:'name', icon: User, type:'text', placeholder:'John Doe', value:nameVal, onChange:(v:string)=>setNameVal(v) },
              { label:'Email', id:'email', icon: Mail, type:'email', placeholder:'you@example.com' },
              { label:'Password', id:'password', icon: Lock, type:'password', placeholder:'••••••••' },
            ].map(f => (
              <div key={f.id}>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{f.label}</label>
                <div className="relative">
                  <f.icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                  <Input id={f.id} name={f.id} type={f.type} placeholder={f.placeholder} required disabled={isLoading}
                    value={f.value} onChange={f.onChange ? (e:React.ChangeEvent<HTMLInputElement>)=>f.onChange!(e.target.value) : undefined}
                    className="pl-10 h-11 rounded-xl bg-white/60 border-white/70 focus-visible:ring-2 focus-visible:ring-teal-400/40 focus-visible:border-teal-400/50 placeholder:text-muted-foreground/40 shadow-sm" />
                </div>
              </div>
            ))}

            <button type="submit" disabled={isLoading}
              className="w-full h-11 rounded-xl btn-liquid flex items-center justify-center gap-2 text-sm mt-1 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {isLoading ? "Creating…" : "Create Account"}
              {!isLoading && <ArrowRight className="h-4 w-4 ml-auto opacity-70" />}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-black/5 text-center text-sm text-muted-foreground">
            Have an account?{" "}
            <Link href="/login" className="text-teal-600 font-semibold hover:text-teal-700 underline-offset-2 hover:underline">Sign in</Link>
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
