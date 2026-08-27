
"use client";

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function PrivacySettingsPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
       <Card className="w-full max-w-2xl mx-auto relative">
        <CardHeader className="text-center relative">
           <div className="absolute top-1/2 -translate-y-1/2 left-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/settings">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
            </div>
          <CardTitle className="text-2xl font-headline">Privacy Settings</CardTitle>
          <CardDescription>Manage your privacy settings.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-center text-muted-foreground">Privacy settings will be available here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
