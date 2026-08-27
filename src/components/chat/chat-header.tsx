import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MoreVertical, Phone, Video, ArrowLeft, Users, MessageSquare, BellOff, XCircle, Trash2, LogOut, Search, Plus } from 'lucide-react';
import type { Chat } from "@/lib/types";
import { useAuth } from '@/hooks/use-auth';
import { formatRelative, parseISO } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

interface ChatHeaderProps {
  chat: Chat;
  onBack?: () => void;
  onOpenInfo: () => void;
  onInitiateCall: (chatId: string, type?: 'audio' | 'video') => void;
  onClearChat: (chatId: string) => void;
  onExitGroup: (chatId: string) => void;
}

const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return "offline";
    try {
      const date = parseISO(lastSeen);
      return `last seen ${formatRelative(date, new Date())}`;
    } catch (error) {
      return "offline";
    }
}

export default function ChatHeader({ chat, onBack, onOpenInfo, onInitiateCall, onClearChat, onExitGroup }: ChatHeaderProps) {
  const { user } = useAuth();
  const contact = chat.contact;
  const isGroup = chat.isGroup;
  
  const headerName = isGroup ? chat.groupName : contact?.name;
  const headerAvatar = isGroup ? chat.groupAvatar : contact?.avatar;
  const isOnline = !isGroup && contact?.isOnline;

  const typingUserIds = Object.keys(chat.typingUsers || {}).filter(
    id => id !== user?.id && chat.typingUsers?.[id]
  );
  const isTyping = typingUserIds.length > 0;

  let headerStatus = '';
  if (isTyping) {
    headerStatus = isGroup ? 'someone is typing...' : 'typing...';
  } else if (isGroup) {
    headerStatus = `${chat.userIds?.length || 0} members`;
  } else if (isOnline) {
    headerStatus = 'online';
  } else {
    headerStatus = formatLastSeen(contact?.lastSeen) || '';
  }

  return (
    <header className="flex items-center justify-between px-4 py-2.5 bg-card border-b border-border/80 shadow-sm select-none">
      <div className="flex items-center gap-3 min-w-0 cursor-pointer flex-1" onClick={onOpenInfo}>
        {onBack && (
          <Button variant="ghost" size="icon" className="md:hidden -ml-1 h-9 w-9 rounded-full text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); onBack(); }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="relative">
          <Avatar className="h-10 w-10 border border-border/50">
            <AvatarImage src={headerAvatar} alt={headerName} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {headerName?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          {isOnline && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-card shadow-sm" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="font-medium text-sm text-foreground truncate leading-tight">
            {headerName}
          </h2>
          <p className={`text-xs truncate ${isTyping ? 'text-emerald-500 font-semibold animate-pulse' : isOnline ? 'text-emerald-500 font-medium' : 'text-muted-foreground'}`}>
            {headerStatus}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Button
          variant="ghost"
          size="sm"
          className="hidden lg:flex items-center gap-1.5 h-7 px-3 rounded-full bg-secondary/80 hover:bg-secondary text-xs text-zinc-300 font-medium border border-border/40"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add to list</span>
        </Button>

        {!isGroup && (
          <>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/60"
              onClick={() => onInitiateCall(chat.id, 'video')}
              title="Video Call"
            >
              <Video className="h-4.5 w-4.5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/60" 
              onClick={() => onInitiateCall(chat.id, 'audio')}
              title="Voice Call"
            >
              <Phone className="h-4.5 w-4.5" />
            </Button>
          </>
        )}

        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/60"
          title="Search"
        >
          <Search className="h-4.5 w-4.5" />
        </Button>

        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/60"
          onClick={onOpenInfo}
          title="Search in chat"
        >
          <Search className="h-4.5 w-4.5" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/60">
              <MoreVertical className="h-4.5 w-4.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {isGroup ? (
              <>
                <DropdownMenuItem onSelect={onOpenInfo}>
                  <Users className="mr-2.5 h-4 w-4 text-muted-foreground" />
                  <span>Group info</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onOpenInfo}>
                  <MessageSquare className="mr-2.5 h-4 w-4 text-muted-foreground" />
                  <span>Select messages</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <BellOff className="mr-2.5 h-4 w-4 text-muted-foreground" />
                  <span>Mute notifications</span>
                </DropdownMenuItem>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Trash2 className="mr-2.5 h-4 w-4 text-muted-foreground" />
                      <span>Clear chat</span>
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear chat history?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all messages in this group for you.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onClearChat(chat.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Clear Chat
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                            <LogOut className="mr-2.5 h-4 w-4" />
                            <span>Exit group</span>
                        </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Exit group?</AlertDialogTitle>
                            <AlertDialogDescription>
                                You will no longer be able to send or receive messages in this group.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onExitGroup(chat.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Exit Group
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <>
                <DropdownMenuItem onSelect={onOpenInfo}>
                  <Users className="mr-2.5 h-4 w-4 text-muted-foreground" />
                  <span>Contact info</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <MessageSquare className="mr-2.5 h-4 w-4 text-muted-foreground" />
                  <span>Select messages</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <BellOff className="mr-2.5 h-4 w-4 text-muted-foreground" />
                  <span>Mute notifications</span>
                </DropdownMenuItem>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Trash2 className="mr-2.5 h-4 w-4 text-muted-foreground" />
                      <span>Clear chat</span>
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear chat history?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete messages in this chat.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onClearChat(chat.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Clear
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
