
"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Bell, Link as LinkIcon, Users, X, VolumeX, Star, Trash2, LogOut, MoreVertical, Shield, Crown, UserMinus, UserCog } from "lucide-react";
import type { Chat, User } from "@/lib/types";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import React from "react";
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

interface GroupInfoSidebarProps {
  chat: Chat;
  isOpen: boolean;
  onClose: () => void;
  onToggleFavorite: (chatId: string, currentState: boolean) => void;
  onUpdateGroupRoles: (chatId: string, memberId: string, newRole: 'admin' | 'editor' | 'member') => void;
  onRemoveMember: (chatId: string, memberId: string) => void;
  onClearChat: (chatId: string) => void;
  onExitGroup: (chatId: string) => void;
}

const MemberItem = ({ member, chat, currentUserId, onUpdateGroupRoles, onRemoveMember }: { member: User; chat: Chat; currentUserId: string; onUpdateGroupRoles: GroupInfoSidebarProps['onUpdateGroupRoles']; onRemoveMember: GroupInfoSidebarProps['onRemoveMember'] }) => {
  const isCurrentUserAdmin = chat.groupAdmins?.includes(currentUserId) ?? false;
  const isMemberAdmin = chat.groupAdmins?.includes(member.id) ?? false;
  const isMemberEditor = chat.groupEditors?.includes(member.id) ?? false;
  
  const canManage = isCurrentUserAdmin && member.id !== currentUserId;

  return (
    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted">
      <Avatar className="h-10 w-10">
        <AvatarImage src={member.avatar} alt={member.name} />
        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <p className="font-semibold text-sm">{member.name}</p>
        <p className="text-xs text-muted-foreground">~{member.email.split('@')[0]}</p>
      </div>
      {isMemberAdmin && <Badge variant="secondary" className="border-green-500/50 border"><Crown className="h-3 w-3 mr-1"/>Admin</Badge>}
      {isMemberEditor && <Badge variant="secondary" className="border-blue-500/50 border"><Shield className="h-3 w-3 mr-1"/>Editor</Badge>}
      
      {canManage && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!isMemberAdmin && <DropdownMenuItem onClick={() => onUpdateGroupRoles(chat.id, member.id, 'admin')}><Crown className="mr-2 h-4 w-4"/> Make Admin</DropdownMenuItem>}
            {isMemberAdmin && <DropdownMenuItem onClick={() => onUpdateGroupRoles(chat.id, member.id, 'member')}><UserCog className="mr-2 h-4 w-4"/> Demote to Member</DropdownMenuItem>}
            
            {!isMemberEditor && <DropdownMenuItem onClick={() => onUpdateGroupRoles(chat.id, member.id, 'editor')}><Shield className="mr-2 h-4 w-4"/> Make Editor</DropdownMenuItem>}
            {isMemberEditor && <DropdownMenuItem onClick={() => onUpdateGroupRoles(chat.id, member.id, 'member')}><UserCog className="mr-2 h-4 w-4"/> Demote to Member</DropdownMenuItem>}

            <DropdownMenuSeparator />
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}>
                        <UserMinus className="mr-2 h-4 w-4" /> Remove from Group
                    </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove {member.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove {member.name} from the group?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={() => onRemoveMember(chat.id, member.id)}
                        >
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

const urlRegex = /(https?:\/\/[^\s]+)/g;

export default function GroupInfoSidebar({ chat, isOpen, onClose, onToggleFavorite, onUpdateGroupRoles, onRemoveMember, onClearChat, onExitGroup }: GroupInfoSidebarProps) {
    const { user } = useAuth();
    const [members, setMembers] = useState<User[]>([]);

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

    useEffect(() => {
        const fetchMembers = async () => {
            if (!chat.userIds || chat.userIds.length === 0) return;
            
            const membersData: User[] = [];
            
            // Fetch users in chunks of 10 as `in` query has a limit of 10
            for (let i = 0; i < chat.userIds.length; i += 10) {
                const chunk = chat.userIds.slice(i, i + 10);
                const usersQuery = query(collection(db, "users"), where('__name__', 'in', chunk));
                const querySnapshot = await getDocs(usersQuery);
                querySnapshot.forEach((doc) => {
                    membersData.push({ id: doc.id, ...doc.data() } as User);
                });
            }
            
            setMembers(membersData);
        };

        if (isOpen) {
            fetchMembers();
        }
    }, [isOpen, chat.userIds]);

  if (!user) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-sm p-0 flex flex-col" side="right">
        <SheetHeader className="p-4 border-b">
           <div className="flex items-center gap-4">
             <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <X className="h-5 w-5" />
             </Button>
            <SheetTitle>Group info</SheetTitle>
           </div>
        </SheetHeader>
        <ScrollArea className="flex-1">
            <div className="flex flex-col items-center p-6 space-y-2 border-b">
                <Avatar className="h-32 w-32">
                    <AvatarImage src={chat.groupAvatar} alt={chat.groupName} />
                    <AvatarFallback className="text-4xl">{chat.groupName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold">{chat.groupName}</h2>
                <p className="text-sm text-muted-foreground">
                    Group · {chat.userIds?.length} members
                </p>
            </div>

            <div className="p-4 space-y-4 border-b">
                <p className="text-sm">{chat.groupDescription}</p>
                <p className="text-xs text-muted-foreground">Created on {chat.timestamp?.seconds ? new Date(chat.timestamp.seconds * 1000).toLocaleDateString() : 'Recently'}</p>
            </div>
            
            <Accordion type="single" collapsible defaultValue="item-2">
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
                
                <AccordionItem value="item-2" className="border-b-0 px-4">
                    <AccordionTrigger className="py-3 hover:no-underline">
                        <div className="flex items-center gap-3">
                            <Users className="h-5 w-5 text-muted-foreground" />
                            <span>{chat.userIds?.length} Members</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-1">
                        {members.map(member => (
                            <MemberItem 
                                key={member.id} 
                                member={member} 
                                chat={chat}
                                currentUserId={user.id}
                                onUpdateGroupRoles={onUpdateGroupRoles}
                                onRemoveMember={onRemoveMember}
                            />
                        ))}
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </ScrollArea>
        <div className="p-4 border-t space-y-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive">
                    <LogOut className="mr-2 h-4 w-4"/> Exit group
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you want to exit this group?</AlertDialogTitle>
                  <AlertDialogDescription>
                      You will be removed from this group and will no longer receive messages.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      onExitGroup(chat.id);
                      onClose();
                    }}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Exit Group
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4"/> Clear chat
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you want to clear this chat?</AlertDialogTitle>
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
        </div>
      </SheetContent>
    </Sheet>
  );
}

    