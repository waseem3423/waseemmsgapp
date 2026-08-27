"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, Bell, Tv, LogOut } from "lucide-react";
import { broadcastNotification } from "@/ai/flows/broadcast-notification";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { User } from "@/lib/types";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { setAnnouncementConfig } from "@/ai/flows/set-announcement-config";
import initialConfig from "@/lib/config.json";


export default function AdminDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // User Management State
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Broadcast State
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Announcement State
  const [announcementText, setAnnouncementText] = useState(initialConfig.announcement.text);
  const [isAnnouncementActive, setIsAnnouncementActive] = useState(initialConfig.announcement.active);
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);


  useEffect(() => {
    // This is a simple client-side check. A real app should use server-side authentication.
    const loggedIn = sessionStorage.getItem("admin-logged-in");
    if (loggedIn !== "true") {
      router.push("/admin");
    } else {
      setIsLoggedIn(true);
    }
  }, [router]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };
  
  useEffect(() => {
    if (isLoggedIn) {
        fetchUsers();
    }
  }, [isLoggedIn]);

  const handleBroadcast = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage) {
        toast({ title: "Title and message cannot be empty.", variant: "destructive" });
        return;
    }
    setIsBroadcasting(true);
    try {
        await broadcastNotification({ title: broadcastTitle, message: broadcastMessage });
        toast({ title: "Broadcast Sent!", description: "Notification is being sent to all users." });
        setBroadcastTitle("");
        setBroadcastMessage("");
    } catch (error) {
        console.error("Broadcast failed:", error);
        toast({ title: "Broadcast Failed", description: "Could not send the notification.", variant: "destructive" });
    } finally {
        setIsBroadcasting(false);
    }
  };
  
  const handleSaveAnnouncement = async () => {
    setIsSavingAnnouncement(true);
    try {
        await setAnnouncementConfig({ text: announcementText, active: isAnnouncementActive });
        toast({
            title: "Announcement Saved!",
            description: "The app-wide announcement has been updated.",
        });
    } catch (error) {
        console.error("Failed to save announcement:", error);
        toast({ title: "Save Failed", description: "Could not update the announcement.", variant: "destructive" });
    } finally {
        setIsSavingAnnouncement(false);
    }
  };


  const handleLogout = () => {
    sessionStorage.removeItem("admin-logged-in");
    router.push("/admin");
  };

  if (!isLoggedIn) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-8">
        <header className="flex items-center justify-between mb-8 max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" /> Log Out
            </Button>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-3">
                    <Tv className="h-6 w-6" />
                    <CardTitle className="text-xl">App-Wide Announcement</CardTitle>
                </div>
                <CardDescription>
                  Display a banner at the top of the app for all users.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="flex items-center space-x-2">
                    <Switch 
                        id="announcement-active" 
                        checked={isAnnouncementActive} 
                        onCheckedChange={setIsAnnouncementActive}
                        disabled={isSavingAnnouncement}
                    />
                    <Label htmlFor="announcement-active">Enable Announcement Banner</Label>
                </div>
                <Textarea 
                    placeholder="Enter announcement text here..."
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    disabled={isSavingAnnouncement || !isAnnouncementActive}
                />
                <Button onClick={handleSaveAnnouncement} disabled={isSavingAnnouncement}>
                    {isSavingAnnouncement && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Announcement
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                    <Bell className="h-6 w-6" />
                    <CardTitle className="text-xl">Broadcast Notification</CardTitle>
                </div>
                <CardDescription>
                  Send a push notification to all users with a notification token.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBroadcast} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="broadcast-title">Title</Label>
                        <Input 
                            id="broadcast-title" 
                            placeholder="e.g., App Update!" 
                            value={broadcastTitle}
                            onChange={(e) => setBroadcastTitle(e.target.value)}
                            disabled={isBroadcasting}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="broadcast-message">Message</Label>
                        <Textarea 
                            id="broadcast-message" 
                            placeholder="e.g., A new version of ZapChat is available."
                            value={broadcastMessage}
                            onChange={(e) => setBroadcastMessage(e.target.value)}
                            disabled={isBroadcasting}
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={isBroadcasting}>
                        {isBroadcasting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Broadcast
                    </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                 <div className="flex items-center gap-3">
                    <Users className="h-6 w-6" />
                    <CardTitle className="text-xl">User Management</CardTitle>
                </div>
                <CardDescription>
                  View all registered users in the application.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                    <div className="flex justify-center items-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        <p className="text-sm font-semibold">{users.length} Users Found</p>
                        {users.map(user => (
                            <div key={user.id} className="p-2 border rounded-md text-sm">
                                <p className="font-medium">{user.name}</p>
                                <p className="text-muted-foreground">{user.email}</p>
                            </div>
                        ))}
                    </div>
                )}
              </CardContent>
            </Card>
        </main>
    </div>
  );
}
