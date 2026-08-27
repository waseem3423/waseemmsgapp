
"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Play, Bell, ArrowLeft } from 'lucide-react';
import { notificationSounds } from '@/lib/sounds';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

const SettingsItem = ({ id, title, description, checked, onCheckedChange }: { id: string, title: string, description: string, checked: boolean, onCheckedChange: (checked: boolean) => void }) => (
    <div className="flex items-center justify-between">
        <div>
            <Label htmlFor={id} className="font-semibold cursor-pointer">{title}</Label>
            <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
);

export default function NotificationsSettingsPage() {
  const [selectedSound, setSelectedSound] = useState<string>(notificationSounds[0].src);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // States for all the toggles
  const [settings, setSettings] = useState({
    messageNotifications: true,
    showPreviews: true,
    showReactionNotifications: true,
    incomingSounds: true,
    outgoingSounds: false,
  });

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSound = localStorage.getItem('notificationSound');
    if (savedSound) {
      setSelectedSound(savedSound);
    }
    
    const savedSettings: Partial<typeof settings> = {};
    Object.keys(settings).forEach(key => {
        const item = localStorage.getItem(`setting_${key}`);
        if (item !== null) {
            (savedSettings as any)[key] = JSON.parse(item);
        }
    });
    setSettings(prev => ({...prev, ...savedSettings}));

  }, []);

  const handleSettingChange = (key: keyof typeof settings, value: boolean) => {
    setSettings(prev => {
        const newSettings = {...prev, [key]: value};
        localStorage.setItem(`setting_${key}`, JSON.stringify(value));
        return newSettings;
    });
  }

  const handleSoundChange = (value: string) => {
    setSelectedSound(value);
    localStorage.setItem('notificationSound', value);
    playPreview(value);
  };

  const playPreview = (src: string) => {
    if (audioRef.current) {
      audioRef.current.src = src;
      audioRef.current.play().catch(e => console.error("Error playing preview:", e));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
       <audio ref={audioRef} className="hidden" />
       <Card className="w-full max-w-2xl mx-auto relative">
        <CardHeader className="text-center relative">
           <div className="absolute top-1/2 -translate-y-1/2 left-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/settings">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
            </div>
          <CardTitle className="text-2xl font-headline">Notifications</CardTitle>
          <CardDescription>Manage your message notification settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Messages</h3>
                <SettingsItem
                    id="message-notifications"
                    title="Message notifications"
                    description="Show notifications for new messages"
                    checked={settings.messageNotifications}
                    onCheckedChange={(val) => handleSettingChange('messageNotifications', val)}
                />
                <SettingsItem
                    id="show-previews"
                    title="Show previews"
                    description="Display message text in notifications"
                    checked={settings.showPreviews}
                    onCheckedChange={(val) => handleSettingChange('showPreviews', val)}
                />
                <SettingsItem
                    id="show-reactions"
                    title="Show reaction notifications"
                    description="Get notified when someone reacts to your message"
                    checked={settings.showReactionNotifications}
                    onCheckedChange={(val) => handleSettingChange('showReactionNotifications', val)}
                />
            </div>
            <Separator />

            <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
            <AccordionItem value="item-1" className="border-b-0">
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold">Notification Tones</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <RadioGroup value={selectedSound} onValueChange={handleSoundChange}>
                  <div className="space-y-2 pt-2">
                    {notificationSounds.map((sound) => (
                      <div key={sound.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value={sound.src} id={sound.name} />
                          <Label htmlFor={sound.name} className="font-normal cursor-pointer">{sound.name}</Label>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); playPreview(sound.src); }}>
                          <Play className="h-4 w-4" />
                          <span className="sr-only">Play preview</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Separator />

          <div className="space-y-4">
                <SettingsItem
                    id="incoming-sounds"
                    title="Incoming sounds"
                    description="Play sounds for incoming messages"
                    checked={settings.incomingSounds}
                    onCheckedChange={(val) => handleSettingChange('incomingSounds', val)}
                />
                 <SettingsItem
                    id="outgoing-sounds"
                    title="Outgoing sounds"
                    description="Play sounds for outgoing messages"
                    checked={settings.outgoingSounds}
                    onCheckedChange={(val) => handleSettingChange('outgoingSounds', val)}
                />
            </div>

        </CardContent>
      </Card>
    </div>
  );
}
