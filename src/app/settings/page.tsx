
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
    <div className="flex h-screen bg-background">
      <div className="w-full max-w-md mx-auto flex flex-col border-r">
        <header className="p-4 border-b bg-card min-h-[60px] flex items-center gap-4">
            <Link href="/" passHref>
                <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
            </Link>
            <h1 className="text-xl font-semibold">Settings</h1>
        </header>

        <div className="flex-1 flex flex-col">
            <div className="p-4 space-y-4">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search settings" className="pl-10 bg-muted border-none" />
                </div>
                 {user && (
                    <Link href="/profile" className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold text-lg">{user.name}</p>
                            <p className="text-sm text-muted-foreground">Life is not boring Actually you don't have money 💸</p>
                        </div>
                    </Link>
                 )}
            </div>

            <nav className="flex-1 overflow-y-auto">
                {settingsItems.map((item) => (
                    <Link href={item.href} key={item.href} className="flex items-center gap-6 px-6 py-4 hover:bg-muted">
                        <item.icon className="h-6 w-6 text-muted-foreground" />
                        <div>
                            <p className="font-semibold">{item.title}</p>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                    </Link>
                ))}
            </nav>
        </div>
      </div>
       <div className="flex-1 hidden md:block bg-muted/40">
        {/* This will be the area to display nested setting pages on larger screens */}
      </div>
    </div>
  );
}
