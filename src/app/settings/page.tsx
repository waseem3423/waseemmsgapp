
"use client";

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { ArrowLeft, Search, KeyRound, Lock, MessageSquareText, Bell, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const settingsItems = [
  { href: '/settings/account', icon: KeyRound, title: 'Account', description: 'Security notifications, account info' },
  { href: '/settings/privacy', icon: Lock, title: 'Privacy', description: 'Blocked contacts, disappearing messages' },
  { href: '/settings/chats', icon: MessageSquareText, title: 'Chats', description: 'Theme, wallpaper, chat settings' },
  { href: '/settings/notifications', icon: Bell, title: 'Notifications', description: 'Message notifications' },
  { href: '/settings/help', icon: HelpCircle, title: 'Help', description: 'Help center, contact us, privacy policy' },
];

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="flex h-screen auth-bg">
      <div className="w-full max-w-md mx-auto flex flex-col border-r border-black/5 liquid-glass-sidebar">
        <header className="p-4 border-b border-black/5 min-h-[60px] flex items-center gap-4 liquid-glass-thin">
            <Link href="/" passHref>
                <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
            </Link>
            <h1 className="text-xl font-semibold gradient-text">Settings</h1>
        </header>

        <div className="flex-1 flex flex-col">
            <div className="p-4 space-y-4">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search settings" className="pl-10 bg-white/70 border border-white/80 rounded-xl shadow-sm focus-visible:ring-1 focus-visible:ring-teal-400/40" />
                </div>
                 {user && (
                    <Link href="/profile" className="flex items-center gap-4 p-3 rounded-xl hover:bg-teal-50/60 transition-colors">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold text-lg text-slate-800">{user.name}</p>
                            <p className="text-sm text-slate-500">Life is not boring Actually you don't have money 💸</p>
                        </div>
                    </Link>
                 )}
            </div>

            <nav className="flex-1 overflow-y-auto">
                {settingsItems.map((item) => (
                    <Link href={item.href} key={item.href} className="flex items-center gap-6 px-6 py-4 hover:bg-teal-50/50 transition-colors border-b border-black/4 last:border-b-0">
                        <item.icon className="h-6 w-6 text-teal-500/70" />
                        <div>
                            <p className="font-semibold">{item.title}</p>
                            <p className="text-sm text-slate-500">{item.description}</p>
                        </div>
                    </Link>
                ))}
            </nav>
        </div>
      </div>
       <div className="flex-1 hidden md:block" style="background: linear-gradient(135deg, rgba(20,184,166,0.03), rgba(99,102,241,0.03))">
        {/* This will be the area to display nested setting pages on larger screens */}
      </div>
    </div>
  );
}
