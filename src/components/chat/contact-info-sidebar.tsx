
"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Bell, Link as LinkIcon, Star, Trash2, LogOut, X, VolumeX, MessageSquare, Phone, Video } from "lucide-react";
import type { Chat } from "@/lib/types";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ContactInfoSidebarProps {
  chat: Chat;
  isOpen: boolean;
  onClose: () => void;
  onToggleFavorite: (chatId: string, currentState: boolean) => void;
  onClearChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
}

const urlRegex = /(https?:\/\/[^\s]+)/g;

export default function ContactInfoSidebar({ chat, isOpen, onClose, onToggleFavorite, onClearChat, onDeleteChat }: ContactInfoSidebarProps) {
    const contact = chat.contact;

    const sharedLinks = React.useMemo(() => {
        if (!chat.messages) return [];
        const links: string[] = [];
        chat.messages.forEach(message => {
            if(message.type === 'text') {
                const found = message.content.match(urlRegex);
                if (found) {
                    links.push(...found);
                }
            }
        });
        return links;
    }, [chat.messages]);

  if (!contact) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-sm p-0 flex flex-col" side="right">
        <SheetHeader className="p-4 border-b">
           <div className="flex items-center gap-4">
             <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <X className="h-5 w-5" />
             </Button>
            <SheetTitle>Contact info</SheetTitle>
           </div>
        </SheetHeader>
        <ScrollArea className="flex-1">
            <div className="flex flex-col items-center p-6 space-y-2 border-b">
                <Avatar className="h-32 w-32">
                    <AvatarImage src={contact.avatar} alt={contact.name} />
                    <AvatarFallback className="text-4xl">{contact.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold">{contact.name}</h2>
                <p className="text-sm text-muted-foreground">{contact.email}</p>
                 <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="gap-2"><MessageSquare className="h-4 w-4" /> Message</Button>
                    <Button variant="outline" size="sm" className="gap-2"><Phone className="h-4 w-4" /> Call</Button>
                    <Button variant="outline" size="sm" className="gap-2"><Video className="h-4 w-4" /> Video</Button>
                 </div>
            </div>

            <div className="p-4 space-y-4 border-b">
                <p className="text-sm">About</p>
                <p className="text-sm text-muted-foreground">Busy</p>
            </div>
            
            <Accordion type="single" collapsible>
                <AccordionItem value="item-1" className="border-b-0 px-4">
                    <AccordionTrigger className="py-3 hover:no-underline">
                        <div className="flex items-center gap-3">
                            <LinkIcon className="h-5 w-5 text-muted-foreground" />
                            <span>Links</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-2">
                        {sharedLinks.length > 0 ? (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {sharedLinks.map((link, index) => (
                                    <a 
                                        key={index} 
                                        href={link} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="block p-2 rounded-md bg-muted hover:bg-muted/80 text-sm truncate"
                                    >
                                        {link}
                                    </a>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No links shared yet.</p>
                        )}
                    </AccordionContent>
                </AccordionItem>

                 <Separator />

                <div className="px-4 py-3 space-y-1">
                    <Button variant="ghost" className="w-full justify-start px-0 hover:bg-transparent">
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                                <Bell className="h-5 w-5 text-muted-foreground" />
                                <span>Mute Notifications</span>
                            </div>
                            <VolumeX className="h-5 w-5 text-muted-foreground" />
                        </div>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start px-0 hover:bg-transparent" onClick={() => onToggleFavorite(chat.id, chat.isFavorite ?? false)}>
                         <div className="flex items-center gap-3">
                            <Star className={cn("h-5 w-5 text-muted-foreground", chat.isFavorite && "fill-yellow-400 text-yellow-400")}/>
                            <span>{chat.isFavorite ? 'Remove from favorites' : 'Add to favorites'}</span>
                        </div>
                    </Button>
                </div>
                <Separator />
            </Accordion>
        </ScrollArea>
        <div className="p-4 border-t mt-auto space-y-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4"/> Clear chat
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all messages in this chat. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      onClearChat(chat.id);
                      onClose();
                    }}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Clear Chat
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive">
                    <LogOut className="mr-2 h-4 w-4"/> Delete chat
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the chat history from your device.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                     onClick={(e) => {
                      e.preventDefault();
                      onDeleteChat(chat.id);
                      onClose();
                    }}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
      </SheetContent>
    </Sheet>
  );
}
