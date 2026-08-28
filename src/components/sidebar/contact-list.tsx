"use client";

import { useState, forwardRef } from 'react';
import { Search, UserPlus, MoreVertical, MessageCircle, Users, LogOut, Star, Settings, Archive, BellOff, Trash2, CircleDot, ArchiveIcon, ArrowLeft, Plus, Pin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';
import type { Chat, GroupPermissions } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AppleFormattedText from '../chat/apple-emoji-text';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import Link from 'next/link';
import { AddContactDialog } from './add-contact-dialog';
import { CreateGroupDialog } from './create-group-dialog';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
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
import { Separator } from '../ui/separator';

interface ContactListProps {
  chats: Chat[];
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onAddContact: (contact: { name: string; email: string }) => void;
  onCreateGroup: (group: { name: string; description: string; members: string[]; permissions: GroupPermissions }) => void;
  onToggleArchive: (chatId: string, currentState: boolean) => void;
  onToggleMute: (chatId: string, currentState: boolean) => void;
  onToggleFavorite: (chatId: string, currentState: boolean) => void;
  onMarkAsUnread: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  onExitGroup: (chatId: string) => void;
  loading: boolean;
  searchInputRef?: React.RefObject<HTMLInputElement>;
}

const formatTimestamp = (timestamp: Date | undefined) => {
  if (!timestamp) return '';
  const date = timestamp;
  if (isToday(date)) {
    return format(date, 'p').toLowerCase();
  }
  if (isYesterday(date)) {
    return 'Yesterday';
  }
  return format(date, 'dd/MM/yyyy');
};

type FilterType = 'All' | 'Unread' | 'Groups' | 'Favorites' | 'Archived';

const ContactList = forwardRef<HTMLDivElement, ContactListProps>(({ 
    chats, 
    selectedChatId, 
    onSelectChat, 
    onAddContact, 
    onCreateGroup, 
    onToggleArchive,
    onToggleMute,
    onToggleFavorite,
    onMarkAsUnread,
    onDeleteChat,
    onExitGroup,
    loading,
    searchInputRef
}, ref) => {
  const { user, logout } = useAuth();
  const [filter, setFilter] = useState<FilterType>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const archivedChats = chats.filter(chat => chat.isArchived);
  const archivedUnreadCount = archivedChats.reduce((acc, chat) => acc + (chat.unreadCount || 0), 0);

  const filteredChats = chats.filter(chat => {
    if (filter === 'Archived') {
      if (!chat.isArchived) return false;
    } else {
      if (chat.isArchived) return false;
    }

    const name = chat.isGroup ? chat.groupName : chat.contact?.name;
    const matchesSearch = name?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    
    if (filter === 'Unread') return (chat.unreadCount || 0) > 0;
    if (filter === 'Groups') return chat.isGroup;
    if (filter === 'Favorites') return chat.isFavorite;
    
    return true;
  });
  
  const ChatItem = ({ chat }: { chat: Chat }) => {
    const lastMessageText = chat.lastMessage?.text || (chat.isGroup ? 'Group created' : 'No messages yet');
    const lastMessageTimestamp = chat.lastMessage?.timestamp?.toDate();
    const contactName = chat.isGroup ? chat.groupName : chat.contact?.name;
    const contactAvatar = chat.isGroup ? chat.groupAvatar : chat.contact?.avatar;
    const isOnline = !chat.isGroup && chat.contact?.isOnline;
    const isTyping = Object.keys(chat.typingUsers || {}).some(
      id => id !== user?.id && chat.typingUsers?.[id]
    );

    let previewText = lastMessageText;

    // Fix raw media URLs appearing in sidebar last message preview
    if (previewText.startsWith('http://') || previewText.startsWith('https://') || previewText.startsWith('blob:')) {
      if (previewText.includes('.wzm') || previewText.includes('.opus') || previewText.includes('.mp3') || previewText.includes('audio')) {
        previewText = '🎤 Voice message';
      } else if (previewText.includes('.mp4') || previewText.includes('.webm') || previewText.includes('.mov') || previewText.includes('.mkv') || previewText.includes('video')) {
        previewText = '🎥 Video';
      } else if (previewText.includes('.doc') || previewText.includes('.pdf') || previewText.includes('.zip') || previewText.includes('document')) {
        previewText = '📄 Document';
      } else {
        previewText = '📷 Photo';
      }
    }

    const lastMsg = chat.messages?.[chat.messages.length - 1];
    if (lastMsg?.reactions && Object.keys(lastMsg.reactions).length > 0) {
      const reactionEntries = Object.entries(lastMsg.reactions);
      if (reactionEntries.length > 0) {
        const [emoji, userIds] = reactionEntries[0];
        const isSelf = userIds.includes(user?.id || '');
        previewText = isSelf ? `You reacted ${emoji} to: "${previewText}"` : `Reacted ${emoji} to: "${previewText}"`;
      }
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <button
                    onClick={() => onSelectChat(chat.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3.5 py-3 text-left transition-all relative border-b border-border/30 select-none",
                      selectedChatId === chat.id
                          ? "bg-primary/10 dark:bg-primary/20 font-semibold text-primary"
                          : "hover:bg-muted/50"
                    )}
                >
                    <div className="relative shrink-0">
                      <Avatar className="h-12 w-12 border border-border/40 shadow-sm">
                          <AvatarImage src={contactAvatar} alt={contactName} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {contactName?.charAt(0) || 'U'}
                          </AvatarFallback>
                      </Avatar>
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-card shadow-sm" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className="font-semibold text-sm text-foreground truncate">{contactName}</p>
                        <span className={cn(
                          'text-xs whitespace-nowrap font-sans', 
                          chat.unreadCount > 0 ? 'text-emerald-500 font-bold' : 'text-muted-foreground/80'
                        )}>
                            {formatTimestamp(lastMessageTimestamp)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs text-muted-foreground truncate leading-relaxed">
                            {isTyping ? (
                              <span className="text-emerald-500 font-semibold animate-pulse">typing...</span>
                            ) : (
                              <AppleFormattedText text={previewText} emojiSize="sm" />
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {chat.isFavorite && (
                            <Pin className="h-3.5 w-3.5 text-muted-foreground/70 rotate-45" />
                          )}
                          {chat.unreadCount > 0 && (
                              <span className="bg-emerald-500 text-white h-4.5 min-w-[18px] px-1.5 rounded-full flex items-center justify-center font-bold text-[10px] shadow-sm">
                                {chat.unreadCount}
                              </span>
                          )}
                        </div>
                      </div>
                    </div>
                </button>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-56">
                <ContextMenuItem onSelect={() => onToggleArchive(chat.id, chat.isArchived ?? false)}>
                    <Archive className="mr-2.5 h-4 w-4 text-muted-foreground" /> {chat.isArchived ? "Unarchive" : "Archive"} chat
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => onToggleMute(chat.id, chat.isMuted ?? false)}>
                    <BellOff className="mr-2.5 h-4 w-4 text-muted-foreground" /> {chat.isMuted ? "Unmute" : "Mute"} notifications
                </ContextMenuItem>
                 <ContextMenuItem onSelect={() => onToggleFavorite(chat.id, chat.isFavorite ?? false)}>
                    <Star className="mr-2.5 h-4 w-4 text-muted-foreground" /> {chat.isFavorite ? "Unpin" : "Pin"} chat
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => onMarkAsUnread(chat.id)}>
                    <CircleDot className="mr-2.5 h-4 w-4 text-muted-foreground" /> Mark as unread
                </ContextMenuItem>
                 <ContextMenuSeparator />
                {chat.isGroup ? (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                             <ContextMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                <LogOut className="mr-2.5 h-4 w-4" /> Exit group
                            </ContextMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Exit "{chat.groupName}"?</AlertDialogTitle>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onExitGroup(chat.id)} className="bg-destructive hover:bg-destructive/90">Exit</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                ) : (
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <ContextMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2.5 h-4 w-4" /> Delete chat
                            </ContextMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete this chat from your list.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDeleteChat(chat.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </ContextMenuContent>
        </ContextMenu>
    );
  };

  const handleFilterClick = (newFilter: FilterType) => {
    if (newFilter === 'Archived') {
        setFilter(currentFilter => currentFilter === 'Archived' ? 'All' : 'Archived');
    } else {
        setFilter(newFilter);
    }
  };

  return (
    <div className="h-full flex flex-col select-none bg-transparent" ref={ref}>
      {filter === 'Archived' ? (
        <header className="p-3 border-b border-black/5 flex items-center justify-start gap-4 min-h-[56px] liquid-glass-thin">
          <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-muted-foreground hover:text-foreground" onClick={() => setFilter('All')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-base font-semibold">Archived Chats</h2>
        </header>
      ) : (
        <header className="px-4 py-3 border-b border-black/5 flex items-center justify-between min-h-[56px] liquid-glass-thin">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight gradient-text">WhatsApp</h1>
          </div>
          
          <div className="flex items-center gap-1">
              <AddContactDialog onAddContact={onAddContact}>
                  <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-muted-foreground hover:text-foreground" title="New Chat">
                      <Plus className="h-5 w-5" />
                  </Button>
              </AddContactDialog>

              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-muted-foreground hover:text-foreground" title="Menu">
                          <MoreVertical className="h-5 w-5" />
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                      <CreateGroupDialog onCreateGroup={onCreateGroup} chats={chats}>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Users className="mr-2.5 h-4 w-4 text-muted-foreground" />
                              <span>New group</span>
                          </DropdownMenuItem>
                      </CreateGroupDialog>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                          <Link href="/settings">
                              <Settings className="mr-2.5 h-4 w-4 text-muted-foreground" />
                              <span>Settings</span>
                          </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                          <LogOut className="mr-2.5 h-4 w-4" />
                          <span>Log out</span>
                      </DropdownMenuItem>
                  </DropdownMenuContent>
              </DropdownMenu>
          </div>
        </header>
      )}

      {/* Search Input & WhatsApp Style Filter Pills */}
      {filter !== 'Archived' && (
        <div className="px-3 py-2.5 border-b border-black/5 space-y-2.5 bg-white/30">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              ref={searchInputRef}
              placeholder="Search or start a new chat" 
              className="pl-9 rounded-full h-9 text-xs focus-visible:ring-1 focus-visible:ring-teal-400/50 border border-white/80 bg-white/75 shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar items-center">
              {[
                { id: 'All', label: 'All' },
                { id: 'Unread', label: `Unread${chats.filter(c => !c.isArchived && c.unreadCount > 0).length > 0 ? ` ${chats.filter(c => !c.isArchived && c.unreadCount > 0).length}` : ''}` },
                { id: 'Favorites', label: 'Favourites' },
                { id: 'Groups', label: `Groups${chats.filter(c => !c.isArchived && c.isGroup).length > 0 ? ` ${chats.filter(c => !c.isArchived && c.isGroup).length}` : ''}` }
              ].map(f => (
                  <Button
                      key={f.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFilterClick(f.id as FilterType)}
                      className={cn(
                          "rounded-full h-7 py-1 px-3 text-xs font-medium transition-all whitespace-nowrap",
                          filter === f.id 
                              ? "bg-teal-50 text-teal-700 border border-teal-200/80 font-semibold" 
                              : "bg-white/50 text-slate-500 border border-black/5 hover:bg-teal-50 hover:text-teal-700"
                      )}
                  >
                      {f.label}
                  </Button>
              ))}
          </div>
        </div>
      )}
      
      {/* Contact List */}
      <ScrollArea className="flex-1">
        <div className="py-1">
            {filter !== 'Archived' && archivedChats.length > 0 && (
                <>
                    <button 
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/40 transition-colors border-b border-border/40"
                        onClick={() => handleFilterClick('Archived')}
                    >
                        <div className="flex items-center gap-3">
                            <ArchiveIcon className="h-4.5 w-4.5 text-primary" />
                            <span className="font-semibold text-sm">Archived</span>
                        </div>
                        {archivedUnreadCount > 0 && (
                            <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full badge-teal">{archivedUnreadCount}</span>
                        )}
                    </button>
                </>
            )}

            {filter === 'Archived' && (
                 <div className="p-4 text-center text-xs text-muted-foreground">
                    <p>These chats stay archived when new messages are received.</p>
                    <Separator className="my-4" />
                 </div>
            )}
            
            <nav>
              {loading ? (
                <div className="p-3 space-y-3">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-12 w-12 rounded-full bg-slate-200" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No chats found
                </div>
              ) : (
                filteredChats.map((chat) => (
                    <ChatItem key={chat.id} chat={chat} />
                ))
              )}
            </nav>
        </div>
      </ScrollArea>
    </div>
  );
});

ContactList.displayName = "ContactList";

export default ContactList;
