

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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { User, MessageSquare, BellOff, Timer, Star, XCircle, AlertTriangle, ShieldAlert, Trash2, Users, LogOut } from 'lucide-react';
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
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [isForwardDialogOpen, setIsForwardDialogOpen] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const [selectedSound, setSelectedSound] = useState(notificationSounds[0].src);
  const notificationSoundRef = useRef<HTMLAudioElement>(null);
  const messagesRef = useRef<Message[]>([]);
  const [imagePreview, setImagePreview] = useState<{file: File, url: string} | null>(null);
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
      if(!user) return;
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


  return (
    <div className="flex flex-col h-full bg-background">
        {selectedSound && <audio ref={notificationSoundRef} src={selectedSound} />}
        <ContextMenu>
            <ContextMenuTrigger className="flex flex-col h-full">
                <ChatHeader 
                    chat={chat} 
                    onBack={onBack} 
                    onOpenInfo={() => setIsInfoSidebarOpen(true)}
                    onInitiateCall={onInitiateCall}
                    onClearChat={onClearChat}
                    onExitGroup={onExitGroup}
                />
                <div className="flex-1 overflow-y-auto">
                    <MessageList 
                        chat={chat}
                        messages={messages} 
                        currentUserId={user!.id}
                        isSelectMode={isSelectMode}
                        selectedMessages={selectedMessages}
                        onToggleMessageSelection={handleToggleMessageSelection}
                        onImageClick={setImageModalUrl}
                        onMessageReaction={handleReaction}
                        onReplyToMessage={(msg) => setReplyingToMessage(msg)}
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
    </div>
  );
}
