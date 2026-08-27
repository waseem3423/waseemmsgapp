
"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { user, logout, updateProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const MAX_FILE_SIZE = 500 * 1024; // 500 KB

  if (!user) {
    return null; // AuthProvider handles redirect
  }
  
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
       if (file.size > MAX_FILE_SIZE) {
        toast({
          variant: "destructive",
          title: "Image Too Large",
          description: (
            <p>
              Please use an image under 500KB. You can compress it at{" "}
              <a
                href="http://piccompressors.blogspot.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                piccompressors.blogspot.com
              </a>
            </p>
          ),
        });
        e.target.value = ''; // Reset the file input
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const uploadToCloudinary = async (file: File): Promise<string | null> => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      console.error("Cloudinary environment variables are not set.");
      toast({
        title: "Configuration Error",
        description: "Image upload is not configured.",
        variant: "destructive",
      });
      return null;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Cloudinary upload failed");
      const data = await response.json();
      return data.secure_url;

    } catch (error) {
      console.error("Error uploading to Cloudinary:", error);
      toast({
        title: "Image Upload Failed",
        description: "Could not upload your profile picture.",
        variant: "destructive",
      });
      return null;
    }
  };
  
  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      toast({ title: "Name cannot be empty", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    let newAvatarUrl = user.avatar;

    if (avatarFile) {
        const uploadedUrl = await uploadToCloudinary(avatarFile);
        if (uploadedUrl) {
            newAvatarUrl = uploadedUrl;
        } else {
            setIsLoading(false);
            return; // Stop if upload failed
        }
    }

    try {
        await updateProfile({ name, avatar: newAvatarUrl });
        toast({ title: "Profile Updated", description: "Your changes have been saved." });
    } catch (error) {
        console.error("Error updating profile:", error);
        toast({ title: "Update Failed", description: "Could not save your changes.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md mx-auto relative">
        <CardHeader className="pt-12">
            <div className="absolute top-4 left-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
            </div>
            <div className="text-center space-y-2">
                 <div 
                  className="relative group cursor-pointer mx-auto h-24 w-24"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Avatar className="h-24 w-24 border-2 border-primary">
                    <AvatarImage src={avatarPreview || ""} alt={name} />
                    <AvatarFallback className="text-3xl">{name.charAt(0)}</AvatarFallback>
                  </Avatar>
                   <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="h-8 w-8 text-white" />
                   </div>
                </div>
                <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleAvatarChange}
                    className="hidden"
                    accept="image/png, image/jpeg, image/gif"
                />
                <CardTitle className="text-2xl font-headline">Profile</CardTitle>
                <CardDescription>Manage your account settings.</CardDescription>
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={isLoading} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" defaultValue={user.email} disabled />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button className="flex-1" onClick={handleUpdateProfile} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
            </Button>
            <Button variant="outline" onClick={logout} className="flex-1" disabled={isLoading}>Log Out</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
