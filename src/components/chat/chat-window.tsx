

"use client";

import { useState, useEffect, useRef } from "react";
import ChatHeader from "./chat-header";
import MessageList from "./message-list";
import MessageInput from "./message-input";
import { getSmartReplySuggestions } from "@/ai/flows/smart-reply-suggestions";
import { useAuth } from "@/hooks/use-auth";
import type { Chat, Message, MessageType } from "@/lib/types";
import { collection, query, onSnapshot, orderBy, doc, writeBatch, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import GroupInfoSidebar from "./group-info-sidebar";
import ContactInfoSidebar from "./contact-info-sidebar";
import SharedMediaSidebar from "./shared-media-sidebar";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { User, MessageSquare, BellOff, Timer, Star, XCircle, AlertTriangle, ShieldAlert, Trash2, Users, LogOut, UploadCloud, Search, X, Pin } from 'lucide-react';
import { Input } from "@/components/ui/input";
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
import MessageSelectionBar from "./message-selection-bar";
import ForwardMessageDialog from "./forward-message-dialog";
import { notificationSounds } from "@/lib/sounds";
import ImagePreviewDialog from "./image-preview-dialog";
import ImageModal from "./image-modal";


interface ChatWindowProps {
  chat: Chat;
  allChats: Chat[];
  onSendMessage: (chatId: string, text: string, replyTo?: Message['replyTo']) => void;
  onSendFile: (chatId: string, file: File, type: MessageType, caption?: string) => void;
  onSendGif: (chatId: string, gifUrl: string) => void;
  onToggleFavorite: (chatId: string, currentState: boolean) => void;
  onUpdateGroupRoles: (chatId: string, memberId: string, newRole: 'admin' | 'editor' | 'member') => void;
  onRemoveMember: (chatId: string, memberId: string) => void;
  onClearChat: (chatId: string) => void;
  onExitGroup: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  onToggleStarMessages: (chatId: string, messageIds: string[], star: boolean) => void;
  onTogglePinMessage: (chatId: string, messageId: string, pin: boolean) => void;
  onDeleteMessages: (chatId: string, messageIds: string[]) => void;
  onForwardMessages: (targetChatIds: string[], messages: Message[]) => void;
  onInitiateCall: (chatId: string, type?: 'audio' | 'video') => void;
  onMessageReaction: (chatId: string, messageId: string, emoji: string) => void;
  onMarkAsRead: (chatId: string) => void;
  onTypingStatusChange?: (isTyping: boolean) => void;
  onBack?: () => void;
}

export default function ChatWindow({
  chat,
  allChats,
  onSendMessage,
  onSendFile,
  onSendGif,
  onToggleFavorite,
  onUpdateGroupRoles,
  onRemoveMember,
  onClearChat,
  onExitGroup,
  onDeleteChat,
  onToggleStarMessages,
  onTogglePinMessage,
  onDeleteMessages,
  onForwardMessages,
  onInitiateCall,
  onMessageReaction,
  onMarkAsRead,
  onTypingStatusChange,
  onBack
}: ChatWindowProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isInfoSidebarOpen, setIsInfoSidebarOpen] = useState(false);
  const [isMediaSidebarOpen, setIsMediaSidebarOpen] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [isForwardDialogOpen, setIsForwardDialogOpen] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const [selectedSound, setSelectedSound] = useState(notificationSounds[0].src);
  const notificationSoundRef = useRef<HTMLAudioElement>(null);
  const messagesRef = useRef<Message[]>([]);
  const [imagePreview, setImagePreview] = useState<{ file: File, url: string } | null>(null);
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);

  useEffect(() => {
    const savedSound = localStorage.getItem('notificationSound');
    if (savedSound) {
      setSelectedSound(savedSound);
    }

    const handleStorageChange = () => {
      const updatedSound = localStorage.getItem('notificationSound');
      if (updatedSound) {
        setSelectedSound(updatedSound);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (isSelectMode === false) {
      setSelectedMessages([]);
    }
  }, [isSelectMode]);

  useEffect(() => {
    if (!chat.id || !user?.id) return;

    // Mark chat as read when it's opened
    if (chat.unreadCount > 0) {
      onMarkAsRead(chat.id);
    }

    const currentUserParticipant = chat.participants?.[user.id];
    let messageQuery = query(collection(db, "chats", chat.id, "messages"), orderBy("timestamp", "asc"));

    if (currentUserParticipant?.clearedTimestamp) {
      messageQuery = query(messageQuery, where("timestamp", ">", currentUserParticipant.clearedTimestamp));
    }

    const unsubscribe = onSnapshot(messageQuery, (querySnapshot) => {
      const newMessages: Message[] = [];
      let isInitialLoad = messagesRef.current.length === 0;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        newMessages.push({
          id: doc.id,
          ...data,
          type: data.type || 'text',
          timestamp: data.timestamp?.toDate().toISOString() || new Date().toISOString(),
        } as Message);
      });

      const lastNewMessage = newMessages.length > 0 ? newMessages[newMessages.length - 1] : null;
      if (!isInitialLoad && lastNewMessage && lastNewMessage.senderId !== user?.id && document.hasFocus()) {
        if (notificationSoundRef.current) {
          notificationSoundRef.current.play().catch(e => console.error("Error playing sound:", e));
        }
      }

      setMessages(newMessages);

      // Mark messages as read for other users
      markMessagesAsReadForOthers(newMessages);
    });

    return () => unsubscribe();
  }, [chat.id, user?.id, chat.participants]);

  const handleToggleMessageSelection = (messageId: string) => {
    setSelectedMessages(prev =>
      prev.includes(messageId)
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  const handleClearSelection = () => {
    setSelectedMessages([]);
  };

  const markMessagesAsReadForOthers = async (currentMessages: Message[]) => {
    if (!user) return;
    const batch = writeBatch(db);
    let hasUnread = false;

    currentMessages.forEach(message => {
      if (message.senderId !== user.id && message.status !== 'read') {
        const msgRef = doc(db, "chats", chat.id, "messages", message.id);
        batch.update(msgRef, {
          status: "read",
          readTimestamp: new Date().toISOString()
        });
        hasUnread = true;
      }
    });

    if (hasUnread) {
      try {
        await batch.commit();
      } catch (error) {
        console.error("Error marking messages as read: ", error);
      }
    }
  }

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (lastMessage && lastMessage.senderId !== user?.id && lastMessage.type === 'text' && lastMessage.content) {
        setIsLoadingSuggestions(true);
        try {
          const result = await getSmartReplySuggestions({ message: lastMessage.content });
          setSuggestions(result.suggestions);
        } catch (error) {
          console.error("Failed to get smart replies:", error);
          setSuggestions([]);
        } finally {
          setIsLoadingSuggestions(false);
        }
      } else {
        setSuggestions([]);
      }
    };

    const updateDeliveredStatus = async () => {
      if (!user) return;
      const q = query(collection(db, "chats", chat.id, "messages"), where("status", "==", "sent"), where("senderId", "==", user.id));
      const sentMessages = await getDocs(q);
      const batch = writeBatch(db);
      sentMessages.forEach(messageDoc => {
        const msgRef = doc(db, "chats", chat.id, "messages", messageDoc.id);
        batch.update(msgRef, { status: "delivered" });
      });
      if (!sentMessages.empty) {
        await batch.commit();
      }
    };

    fetchSuggestions();
    updateDeliveredStatus();

  }, [lastMessage, user?.id, chat.id]);

  const handleSendMessage = (text: string) => {
    if (!user) return;
    let replyToPayload: Message['replyTo'] = undefined;
    if (replyingToMessage) {
      const senderName = replyingToMessage.senderId === user.id ? 'You' : (chat.contact?.name || 'User');
      replyToPayload = {
        id: replyingToMessage.id,
        senderName,
        content: replyingToMessage.content,
        type: replyingToMessage.type,
      };
    }
    onSendMessage(chat.id, text, replyToPayload);
    setSuggestions([]);
    setReplyingToMessage(null);
  };

  const handleSendGif = (gifUrl: string) => {
    if (!user) return;
    onSendGif(chat.id, gifUrl);
  };

  const handleFileSelected = (file: File, type: MessageType) => {
    if (type === 'image') {
      setImagePreview({ file, url: URL.createObjectURL(file) });
    } else {
      onSendFile(chat.id, file, type);
    }
  };

  const handleSendFile = (file: File, type: MessageType, caption?: string) => {
    if (!user) return;
    onSendFile(chat.id, file, type, caption);
    setImagePreview(null);
  };

  const handleStar = () => {
    if (selectedMessages.length === 0) return;
    const messagesToStar = messages.filter(m => selectedMessages.includes(m.id));
    const allCurrentlyStarred = messagesToStar.every(m => m.isStarred);
    onToggleStarMessages(chat.id, selectedMessages, !allCurrentlyStarred);
    setIsSelectMode(false);
  };

  const handleDelete = () => {
    if (selectedMessages.length === 0) return;
    onDeleteMessages(chat.id, selectedMessages);
    setIsSelectMode(false);
  };

  const handleForward = () => {
    if (selectedMessages.length > 0) {
      setIsForwardDialogOpen(true);
    }
  };

  const handleConfirmForward = (targetChatIds: string[]) => {
    if (selectedMessages.length > 0) {
      const messagesToForward = messages.filter(m => selectedMessages.includes(m.id));
      onForwardMessages(targetChatIds, messagesToForward);
      setIsSelectMode(false);
    }
  };

  const handleReaction = (messageId: string, emoji: string) => {
    onMessageReaction(chat.id, messageId, emoji);
  }


  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounter = useRef(0);

  const detectFileType = (file: File): MessageType => {
    const mime = file.type.toLowerCase();
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/') || ['mp4', 'webm', 'mkv', 'mov', 'avi', 'wmv', 'flv'].includes(ext)) return 'video';
    if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'opus', 'm4a', 'wzm', 'aac'].includes(ext)) return 'audio';
    return 'document';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDraggingOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      const type = detectFileType(droppedFile);
      handleFileSelected(droppedFile, type);
    }
  };

  const [isSearchingInChat, setIsSearchingInChat] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  const filteredMessages = chatSearchQuery.trim()
    ? messages.filter(m => m.content?.toLowerCase().includes(chatSearchQuery.toLowerCase()))
    : messages;

  return (
    <div
      className="flex h-full w-full bg-background relative select-none overflow-hidden"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {selectedSound && <audio ref={notificationSoundRef} src={selectedSound} />}
      
      {/* Main Chat Content */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        <ContextMenu>
          <ContextMenuTrigger className="flex flex-col h-full">
          <ChatHeader
            chat={chat}
            onBack={onBack}
            onOpenInfo={() => setIsInfoSidebarOpen(true)}
            onInitiateCall={onInitiateCall}
            onClearChat={onClearChat}
            onExitGroup={onExitGroup}
            onToggleSearch={() => setIsSearchingInChat(prev => !prev)}
            onToggleMediaSidebar={() => setIsMediaSidebarOpen(prev => !prev)}
          />

          {isSearchingInChat && (
            <div className="px-4 py-2 border-b border-black/5 flex items-center gap-2 animate-in slide-in-from-top duration-150 z-20 select-none liquid-glass-thin">
              <Search className="h-4 w-4 text-emerald-400 shrink-0" />
              <Input
                placeholder="Search in this chat..."
                value={chatSearchQuery}
                onChange={(e) => setChatSearchQuery(e.target.value)}
                className="h-8 bg-background/80 border-none text-xs flex-1 focus-visible:ring-1 focus-visible:ring-primary shadow-inner"
                autoFocus
              />
              {chatSearchQuery && (
                <span className="text-[11px] font-mono text-emerald-400 font-bold px-2 whitespace-nowrap">
                  {filteredMessages.length} matches
                </span>
              )}
              <button
                onClick={() => { setIsSearchingInChat(false); setChatSearchQuery(''); }}
                className="p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Authentic WhatsApp Web Pinned Message Banner (matching screenshot) */}
          {messages.some(m => m.isPinned) && (() => {
            const pinnedMsgs = messages.filter(m => m.isPinned);
            const currentPinned = pinnedMsgs[pinnedMsgs.length - 1];
            if (!currentPinned) return null;

            const previewText = currentPinned.content || (currentPinned.type === 'image' ? '📷 Photo' : currentPinned.type === 'video' ? '🎥 Video' : currentPinned.type === 'audio' ? '🎵 Voice message' : '📄 Document');

            return (
              <div 
                className="px-4 py-2 border-b border-black/5 flex items-center justify-between cursor-pointer hover:bg-teal-50/50 transition-colors z-20 select-none shadow-sm border-l-4 border-l-teal-400 bg-white/60 backdrop-blur"
                onClick={() => {
                  const element = document.getElementById(`msg-${currentPinned.id}`);
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('ring-2', 'ring-emerald-500', 'bg-emerald-500/10', 'transition-all');
                    setTimeout(() => element.classList.remove('ring-2', 'ring-emerald-500', 'bg-emerald-500/10'), 2000);
                  }
                }}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Pin className="h-4 w-4 text-zinc-400 shrink-0 transform -rotate-45" />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[11px] font-semibold text-emerald-400 leading-tight">Pinned Message</span>
                    <p className="text-xs text-zinc-200 truncate font-sans mt-0.5 font-normal">
                      {previewText}
                    </p>
                  </div>
                </div>
                {pinnedMsgs.length > 1 && (
                  <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-full shrink-0">
                    {pinnedMsgs.length} pinned
                  </span>
                )}
              </div>
            );
          })()}

          <div className="flex-1 overflow-y-auto">
            <MessageList
              chat={chat}
              messages={filteredMessages}
              currentUserId={user!.id}
              isSelectMode={isSelectMode}
              selectedMessages={selectedMessages}
              onToggleMessageSelection={handleToggleMessageSelection}
              onImageClick={setImageModalUrl}
              onMessageReaction={handleReaction}
              onReplyToMessage={(msg) => setReplyingToMessage(msg)}
              onStarMessage={(msgId, currentlyStarred) => onToggleStarMessages(chat.id, [msgId], !currentlyStarred)}
              onPinMessage={(msgId, currentlyPinned) => onTogglePinMessage(chat.id, msgId, !currentlyPinned)}
              onDeleteMessage={(msgId) => onDeleteMessages(chat.id, [msgId])}
              onForwardMessage={(msg) => { setSelectedMessages([msg.id]); setIsForwardDialogOpen(true); }}
            />
          </div>
          {isSelectMode ? (
            <MessageSelectionBar
              selectedCount={selectedMessages.length}
              onStar={handleStar}
              onDelete={handleDelete}
              onForward={handleForward}
              onClear={handleClearSelection}
              onClose={() => setIsSelectMode(false)}
            />
          ) : (
            <MessageInput
              onSendMessage={handleSendMessage}
              onFileSelected={handleFileSelected}
              onSendGif={handleSendGif}
              suggestions={suggestions}
              isLoadingSuggestions={isLoadingSuggestions}
              replyingToMessage={replyingToMessage}
              onCancelReply={() => setReplyingToMessage(null)}
              onTypingStatusChange={onTypingStatusChange}
            />
          )}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-64">
          {chat.isGroup ? (
            <>
              <ContextMenuItem inset onSelect={() => setIsInfoSidebarOpen(true)}>
                <Users className="mr-2 h-4 w-4" />
                Group info
              </ContextMenuItem>
              <ContextMenuItem inset onSelect={() => setIsSelectMode(true)}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Select messages
              </ContextMenuItem>
              <ContextMenuItem inset>
                <BellOff className="mr-2 h-4 w-4" />
                Mute notifications
              </ContextMenuItem>
              <ContextMenuItem inset onSelect={() => onToggleFavorite(chat.id, chat.isFavorite ?? false)}>
                <Star className="mr-2 h-4 w-4" />
                {chat.isFavorite ? 'Unfavorite' : 'Add to favorites'}
              </ContextMenuItem>
              <ContextMenuItem inset onSelect={onBack}>
                <XCircle className="mr-2 h-4 w-4" />
                Close chat
              </ContextMenuItem>
              <ContextMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <ContextMenuItem inset onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear chat
                  </ContextMenuItem>
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
                    <AlertDialogAction onClick={() => onClearChat(chat.id)} className="bg-destructive hover:bg-destructive/90">Clear Chat</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <ContextMenuItem inset onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Exit group
                  </ContextMenuItem>
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
                    <AlertDialogAction onClick={() => onExitGroup(chat.id)} className="bg-destructive hover:bg-destructive/90">Exit Group</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <>
              <ContextMenuItem inset onSelect={() => setIsInfoSidebarOpen(true)}>
                <User className="mr-2 h-4 w-4" />
                Contact info
              </ContextMenuItem>
              <ContextMenuItem inset onSelect={() => setIsSelectMode(true)}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Select messages
              </ContextMenuItem>
              <ContextMenuItem inset>
                <BellOff className="mr-2 h-4 w-4" />
                Mute notifications
              </ContextMenuItem>
              <ContextMenuItem inset>
                <Timer className="mr-2 h-4 w-4" />
                Disappearing messages
              </ContextMenuItem>
              <ContextMenuItem inset onSelect={() => onToggleFavorite(chat.id, chat.isFavorite ?? false)}>
                <Star className="mr-2 h-4 w-4" />
                {chat.isFavorite ? 'Unfavorite' : 'Add to favorites'}
              </ContextMenuItem>
              <ContextMenuItem inset onSelect={onBack}>
                <XCircle className="mr-2 h-4 w-4" />
                Close chat
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem inset>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Report
              </ContextMenuItem>
              <ContextMenuItem inset>
                <ShieldAlert className="mr-2 h-4 w-4" />
                Block
              </ContextMenuItem>
              <ContextMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <ContextMenuItem inset onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear chat
                  </ContextMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>This action will clear all messages in this chat for you. Other people in the chat will still see the messages.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onClearChat(chat.id)} className="bg-destructive hover:bg-destructive/90">Clear</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <ContextMenuItem inset onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete chat
                  </ContextMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to delete this chat?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this chat from your list. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDeleteChat(chat.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
      </div>

      {chat.isGroup ? (
        <GroupInfoSidebar
          chat={chat}
          isOpen={isInfoSidebarOpen}
          onClose={() => setIsInfoSidebarOpen(false)}
          onToggleFavorite={onToggleFavorite}
          onUpdateGroupRoles={onUpdateGroupRoles}
          onRemoveMember={onRemoveMember}
          onClearChat={onClearChat}
          onExitGroup={onExitGroup}
        />
      ) : (
        <ContactInfoSidebar
          chat={chat}
          isOpen={isInfoSidebarOpen}
          onClose={() => setIsInfoSidebarOpen(false)}
          onToggleFavorite={onToggleFavorite}
          onClearChat={onClearChat}
          onDeleteChat={onDeleteChat}
        />
      )}

      {isMediaSidebarOpen && (
        <SharedMediaSidebar
          messages={messages}
          onClose={() => setIsMediaSidebarOpen(false)}
          onImageClick={setImageModalUrl}
        />
      )}

      {imagePreview && (
        <ImagePreviewDialog
          file={imagePreview.file}
          fileUrl={imagePreview.url}
          onClose={() => setImagePreview(null)}
          onSend={handleSendFile}
        />
      )}

      {imageModalUrl && (
        <ImageModal imageUrl={imageModalUrl} onClose={() => setImageModalUrl(null)} />
      )}

      <ForwardMessageDialog
        isOpen={isForwardDialogOpen}
        onOpenChange={setIsForwardDialogOpen}
        onForward={handleConfirmForward}
        chats={allChats}
      />

      {isDraggingOver && (
        <div className="absolute inset-0 z-[100] bg-white/70 backdrop-blur-xl p-4 flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-150 select-none">
          <div className="w-full h-full border-2 border-dashed border-teal-400/50 rounded-3xl flex flex-col items-center justify-center gap-4 bg-teal-50/40">
            <div className="h-16 w-16 rounded-full bg-white/80 border border-teal-200 flex items-center justify-center shadow-xl">
              <UploadCloud className="h-8 w-8 text-teal-500 animate-pulse" />
            </div>
            <p className="text-3xl font-medium text-teal-700 tracking-wide">Drag file here</p>
          </div>
        </div>
      )}
    </div>
  );
}
