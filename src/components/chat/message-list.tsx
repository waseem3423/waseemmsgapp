"use client";

import { useEffect, useRef, useState } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Chat, Message, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { Check, CheckCheck, Play, Star, ArrowRight, Pause, Mic, FileText, Download, Smile, Reply, Loader2, Video, FileArchive, Eye, ChevronDown, Copy, Pin, Pencil, Trash2, Info, Share2 } from 'lucide-react';
import MessageCheckbox from './message-checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import AppleFormattedText, { getEmojiUnifiedHex } from './apple-emoji-text';
import CustomVideoPlayer from './custom-video-player';

interface MessageListProps {
  chat: Chat;
  messages: Message[];
  currentUserId: string;
  isSelectMode: boolean;
  selectedMessages: string[];
  onToggleMessageSelection: (messageId: string) => void;
  onImageClick: (url: string) => void;
  onMessageReaction: (messageId: string, emoji: string) => void;
  onReplyToMessage?: (message: Message) => void;
  onStarMessage?: (messageId: string, isStarred: boolean) => void;
  onPinMessage?: (messageId: string, isPinned: boolean) => void;
  onDeleteMessage?: (messageId: string) => void;
  onForwardMessage?: (message: Message) => void;
}

const formatFileSize = (bytes: number | undefined): string => {
  if (bytes === undefined) return '';
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

import { useCachedMedia } from '@/lib/media-cache';
import { getOrCacheMediaUrl } from '@/lib/indexeddb-cache';

const DocumentMessage = ({ message, isSender }: { message: Message; isSender: boolean; }) => {
  const { src: cachedDocUrl } = useCachedMedia(message.content);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDownloading(true);

    try {
      const finalUrl = cachedDocUrl.startsWith('blob:') ? cachedDocUrl : await getOrCacheMediaUrl(message.content);
      const a = document.createElement('a');
      a.href = finalUrl;
      a.download = message.fileName || `file_${Date.now()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Direct download failed:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!message.content || message.status === 'sending') {
    return (
      <div className="flex items-center gap-3 w-64 p-1">
        <div className="relative flex items-center justify-center h-11 w-11 bg-primary/20 rounded-lg shrink-0">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="absolute text-[9px] font-bold text-primary font-mono">{message.progress || 0}%</span>
        </div>
        <div className="flex-1 overflow-hidden bg-transparent">
          <p className="truncate font-medium text-sm text-foreground">{message.fileName || "Document"}</p>
          <p className="text-xs text-muted-foreground animate-pulse">Uploading... {message.progress || 0}%</p>
        </div>
      </div>
    );
  }

  const ext = (message.fileName || message.content).split('.').pop()?.toLowerCase() || '';
  const isZipOrArchive = ['zip', 'rar', '7z', 'tar', 'gz', 'iso'].includes(ext);
  const isPdf = ext === 'pdf';
  const isDoc = ['doc', 'docx', 'txt', 'rtf'].includes(ext);
  const isSheet = ['xls', 'xlsx', 'csv'].includes(ext);
  const isExe = ['exe', 'msi', 'apk', 'dmg'].includes(ext);

  let chipClass = "bg-primary/10 text-primary border-primary/20";
  if (isPdf) chipClass = "bg-red-500/15 text-red-500 border-red-500/30";
  else if (isZipOrArchive) chipClass = "bg-amber-500/15 text-amber-500 border-amber-500/30";
  else if (isDoc) chipClass = "bg-blue-500/15 text-blue-500 border-blue-500/30";
  else if (isSheet) chipClass = "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";
  else if (isExe) chipClass = "bg-purple-500/15 text-purple-500 border-purple-500/30";

  return (
    <div className="flex flex-col gap-1.5 w-64 p-1">
      <div className="flex items-center gap-3">
        <div className={cn(
          "flex items-center justify-center h-11 w-11 rounded-lg shrink-0 shadow-sm border",
          chipClass
        )}>
          {isZipOrArchive ? <FileArchive className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
        </div>
        <div className="flex-1 overflow-hidden bg-transparent">
          <p className="truncate font-medium text-sm text-foreground">{message.fileName || "Document"}</p>
          <div className="flex items-center gap-1.5">
            <span className={cn("text-[10px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider", chipClass)}>
              {ext.toUpperCase()}
            </span>
            <span className="text-xs text-muted-foreground">
              • {formatFileSize(message.fileSize)}
            </span>
          </div>
        </div>
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          title="Download File"
        >
          {isDownloading ? (
            <Loader2 className="h-4.5 w-4.5 animate-spin text-primary" />
          ) : (
            <Download className="h-4.5 w-4.5 shrink-0" />
          )}
        </button>
      </div>

      {isPdf && (
        <Link href={cachedDocUrl} target="_blank" className="flex items-center justify-center gap-1.5 py-1 px-3 bg-muted/60 hover:bg-muted rounded-md text-xs font-medium text-primary border border-border/40 transition-colors">
          <Eye className="h-3.5 w-3.5" />
          <span>Preview PDF Document</span>
        </Link>
      )}
    </div>
  );
};

const VideoMessage = ({ message, isSender, onClick }: { message: Message; isSender: boolean; onClick: () => void }) => {
  const { src: cachedVideoUrl } = useCachedMedia(message.content);
  if (!message.content || message.status === 'sending') {
    return (
      <div className="w-full max-w-xs relative overflow-hidden rounded-lg border border-border/40 aspect-video bg-muted flex flex-col items-center justify-center gap-1.5 text-white">
        <div className="relative flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
          <span className="absolute text-[10px] font-bold text-white font-mono">{message.progress || 0}%</span>
        </div>
        <span className="text-[11px] font-medium tracking-wide">Uploading video...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xs relative overflow-hidden rounded-lg border border-border/40">
      <CustomVideoPlayer src={cachedVideoUrl} className="w-full aspect-video" />
    </div>
  );
};

const AudioMessage = ({ message, isSender, sender }: { message: Message; isSender: boolean; sender?: User; }) => {
  const { src: cachedAudioUrl } = useCachedMedia(message.content);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [duration, setDuration] = useState('0:00');
  const [currentTime, setCurrentTime] = useState('0:00');
  const [progress, setProgress] = useState(0);

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.playbackRate = playbackSpeed;
        audioRef.current.play().catch(e => console.error("Audio play error:", e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleSpeed = () => {
    const nextSpeed = playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1;
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const handleSeek = (event: React.MouseEvent<HTMLDivElement>) => {
    if (progressBarRef.current && audioRef.current && !isNaN(audioRef.current.duration)) {
      const barWidth = progressBarRef.current.clientWidth;
      const clickPosition = event.nativeEvent.offsetX;
      const newTime = (clickPosition / barWidth) * audioRef.current.duration;
      if (!isNaN(newTime)) {
        audioRef.current.currentTime = newTime;
      }
    }
  };

  useEffect(() => {
    const audio = audioRef.current;

    const setAudioData = () => {
      if (audio) {
        setDuration(formatTime(audio.duration));
        setCurrentTime(formatTime(audio.currentTime));
      }
    };

    const setAudioTime = () => {
      if (audio) {
        const currTime = audio.currentTime;
        const dur = audio.duration;
        if (!isNaN(dur) && dur > 0) {
          setCurrentTime(formatTime(currTime));
          setProgress((currTime / dur) * 100);
        }
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      if (audio && !isNaN(audio.duration)) {
        setCurrentTime(formatTime(audio.duration));
      }
    };

    if (audio) {
      audio.addEventListener('loadedmetadata', setAudioData);
      audio.addEventListener('timeupdate', setAudioTime);
      audio.addEventListener('ended', handleEnded);

      if (audio.readyState >= 2) {
        setAudioData();
      }
    }

    return () => {
      if (audio) {
        audio.removeEventListener('loadedmetadata', setAudioData);
        audio.removeEventListener('timeupdate', setAudioTime);
        audio.removeEventListener('ended', handleEnded);
      }
    };
  }, [cachedAudioUrl]);

  if (!message.content || message.status === 'sending') {
    return (
      <div className="flex items-center gap-3 w-[270px] py-1 select-none">
        <div className="relative h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="absolute text-[9px] font-bold text-primary font-mono">{message.progress || 0}%</span>
        </div>
        <div className="flex-1 flex flex-col justify-center">
          <span className="text-xs font-medium text-foreground">Sending voice message...</span>
          <span className="text-[10px] text-muted-foreground animate-pulse">Uploading audio ({message.progress || 0}%)...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 w-[270px] py-1 select-none">
      <audio ref={audioRef} src={cachedAudioUrl} key={cachedAudioUrl} className="hidden" preload="metadata" />
      <div className="relative shrink-0">
        <Avatar className="h-10 w-10 border border-border/40">
          <AvatarImage src={isSender ? undefined : sender?.avatar} alt={sender?.name} />
          <AvatarFallback>{sender?.name?.charAt(0) || 'U'}</AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-primary text-primary-foreground">
          <Mic className="h-2.5 w-2.5" />
        </div>
      </div>

      <button
        onClick={handlePlayPause}
        className="flex items-center justify-center h-9 w-9 shrink-0 rounded-full bg-primary text-primary-foreground shadow-sm hover:opacity-95 transition-opacity"
      >
        {isPlaying ? <Pause className="h-4.5 w-4.5 fill-current" /> : <Play className="h-4.5 w-4.5 fill-current ml-0.5" />}
      </button>

      <div className="flex-1 flex flex-col justify-center gap-1">
        <div ref={progressBarRef} onClick={handleSeek} className="w-full h-1.5 bg-muted-foreground/20 rounded-full relative cursor-pointer overflow-hidden">
          <div
            className="absolute h-full bg-primary rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-[11px] text-muted-foreground flex justify-between items-center font-mono">
          <span>{isPlaying ? currentTime : duration}</span>
          <button
            onClick={toggleSpeed}
            className="px-1.5 py-0.2 rounded-full bg-secondary text-[10px] font-mono font-bold text-muted-foreground hover:text-foreground hover:bg-muted border border-border/40 transition-colors"
            title="Playback Speed"
          >
            {playbackSpeed}x
          </button>
        </div>
      </div>
    </div>
  );
};

const CachedImageMessage = ({ src, alt, isSending, progress, onClick }: { src: string; alt: string; isSending?: boolean; progress?: number; onClick: () => void }) => {
  const { src: cachedSrc } = useCachedMedia(src);
  return (
    <div className="w-full max-w-xs relative cursor-pointer overflow-hidden rounded-lg border border-border/40" onClick={onClick}>
      <div className="relative aspect-video overflow-hidden">
        {cachedSrc ? (
          <img src={cachedSrc} alt={alt} className={cn("w-full h-full object-cover hover:scale-105 transition-transform", isSending && "blur-[2px] opacity-70")} />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center" />
        )}
        {isSending && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center gap-1 text-white">
            <div className="relative flex items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
              <span className="absolute text-[10px] font-bold text-white font-mono">{progress || 0}%</span>
            </div>
            <span className="text-[11px] font-medium tracking-wide">Uploading...</span>
          </div>
        )}
      </div>
    </div>
  );
};

const MessageStatusIndicator = ({ status }: { status: Message['status'] }) => {
  if (status === 'sending') {
    return <Loader2 className="h-3 w-3 text-muted-foreground/70 animate-spin" />;
  }
  if (status === 'sent') {
    return <Check className="h-3.5 w-3.5 text-muted-foreground/70" />;
  }
  if (status === 'delivered') {
    return <CheckCheck className="h-3.5 w-3.5 text-muted-foreground/70" />;
  }
  if (status === 'read') {
    return <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb] font-bold" />;
  }
  return null;
};

const isOnlyEmojis = (text: string) => {
  const emojiRegex = /^(?:\p{Emoji}(?:\uFE0F|\u200d\p{Emoji})*)+$/u;
  return emojiRegex.test(text);
};

const MessageContent = ({ message, isSender, sender, onImageClick }: { message: Message; isSender: boolean; sender?: User; onImageClick: (url: string) => void; }) => {
  const isEmojiOnly = message.type === 'text' && isOnlyEmojis(message.content);

  const contentPart = () => {
    if (isEmojiOnly) {
      return <div className="py-1"><AppleFormattedText text={message.content} emojiSize="lg" /></div>;
    }
    switch (message.type) {
      case 'text':
        return <div className="text-sm leading-relaxed whitespace-pre-wrap break-words"><AppleFormattedText text={message.content} emojiSize="md" /></div>;
      case 'audio':
        return <AudioMessage message={message} isSender={isSender} sender={sender} />;
      case 'image':
        return <CachedImageMessage src={message.content} alt={message.caption || "Sent image"} isSending={message.status === 'sending'} progress={message.progress} onClick={() => onImageClick(message.content)} />;
      case 'video':
        return <VideoMessage message={message} isSender={isSender} onClick={() => onImageClick(message.content)} />;
      case 'gif':
        return (
          <div className="w-full max-w-xs relative cursor-pointer overflow-hidden rounded-lg border border-border/40" onClick={() => onImageClick(message.content)}>
            <div className="relative aspect-square overflow-hidden">
              <img src={message.content} alt={message.caption || "Sent GIF"} className="w-full h-full object-cover" />
            </div>
          </div>
        );
      case 'document':
        return <DocumentMessage message={message} isSender={isSender} />;
      default:
        return <p className="text-sm text-destructive">Unsupported message type</p>;
    }
  };

  return (
    <div className="flex flex-col">
      {contentPart()}
      {message.caption && (message.type === 'image' || message.type === 'document') && (
        <p className="text-sm whitespace-pre-wrap pt-1 text-foreground">
          {message.caption}
        </p>
      )}
    </div>
  );
};

const ReactionPicker = ({ onSelect }: { onSelect: (emoji: string) => void }) => {
  const emojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
  return (
    <div className="flex bg-card/95 backdrop-blur rounded-full shadow-xl border border-border/80 p-1.5 gap-1 animate-in fade-in zoom-in-95 duration-100">
      {emojis.map(emoji => {
        const hex = getEmojiUnifiedHex(emoji);
        const cdnUrl = `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.0.1/img/apple/64/${hex}.png`;
        return (
          <button
            key={emoji}
            type="button"
            className="rounded-full h-8 w-8 p-1 flex items-center justify-center hover:scale-125 transition-transform hover:bg-secondary shrink-0"
            onClick={() => onSelect(emoji)}
          >
            <img src={cdnUrl} alt={emoji} className="h-6 w-6 object-contain pointer-events-none" />
          </button>
        );
      })}
    </div>
  );
};

export default function MessageList({ chat, messages, currentUserId, isSelectMode, selectedMessages, onToggleMessageSelection, onImageClick, onMessageReaction, onReplyToMessage, onStarMessage, onPinMessage, onDeleteMessage, onForwardMessage }: MessageListProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [groupMembers, setGroupMembers] = useState<User[]>([]);
  const [openReactionPicker, setOpenReactionPicker] = useState<string | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
    }
  };

  useEffect(() => {
    if (chat?.id) {
      scrollToBottom('auto');
      const t1 = setTimeout(() => scrollToBottom('auto'), 50);
      const t2 = setTimeout(() => scrollToBottom('auto'), 200);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [chat?.id, messages?.length]);

  useEffect(() => {
    const fetchGroupMembers = async () => {
      if (chat && chat.isGroup && chat.userIds) {
        const membersData: User[] = [];
        for (let i = 0; i < chat.userIds.length; i += 30) {
          const chunk = chat.userIds.slice(i, i + 30);
          if (chunk.length === 0) continue;
          const usersQuery = query(collection(db, "users"), where('__name__', 'in', chunk));
          const querySnapshot = await getDocs(usersQuery);
          querySnapshot.forEach((doc) => {
            membersData.push({ id: doc.id, ...doc.data() } as User);
          });
        }
        setGroupMembers(membersData);
      }
    };
    fetchGroupMembers();
  }, [chat]);

  const allUsersInChat = [
    ...groupMembers,
    ...(chat.contact ? [chat.contact] : []),
    { id: currentUserId, name: 'You', avatar: '' }
  ];

  const getUserById = (id: string) => {
    return allUsersInChat.find(u => u.id === id);
  };

  if (!chat) {
    return null;
  }

  return (
    <ScrollArea className="flex-1 whatsapp-chat-pattern-dark dark:whatsapp-chat-pattern-dark" viewportRef={viewportRef}>
      <div className={cn(
        "p-4 md:px-8 space-y-2 min-h-full flex flex-col justify-end",
        isSelectMode && "px-10"
      )}>
        {messages.map((message) => {
          const isSender = message.senderId === currentUserId;

          let sender: User | undefined;
          if (chat.isGroup) {
            sender = groupMembers.find(member => member.id === message.senderId);
          } else if (!isSender) {
            sender = chat.contact;
          }

          const hasCaption = message.caption && (message.type === 'image' || message.type === 'document');
          const isEmojiOnly = message.type === 'text' && isOnlyEmojis(message.content);
          const reactions = message.reactions ? Object.entries(message.reactions).filter(([, userIds]) => userIds && userIds.length > 0) : [];

          return (
            <div
              key={message.id}
              id={`msg-${message.id}`}
              className={cn(
                "flex items-end gap-2 relative group py-0.5",
                {
                  "justify-end": isSender,
                  "justify-start": !isSender,
                  "bg-primary/10 rounded-lg": isSelectMode && selectedMessages.includes(message.id),
                }
              )}
              onClick={() => isSelectMode && onToggleMessageSelection(message.id)}
            >
              {!isSender && chat.isGroup && sender && (
                <Avatar className="h-7 w-7 mb-1 shrink-0">
                  <AvatarImage src={sender?.avatar} alt={sender?.name} />
                  <AvatarFallback>{sender?.name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
              )}

              {isSelectMode && (
                <MessageCheckbox
                  checked={selectedMessages.includes(message.id)}
                  isSender={isSender}
                />
              )}

              {/* Chatvia Style Message Bubble */}
              <div
                className={cn(
                  "max-w-[85%] sm:max-w-md lg:max-w-lg shadow-sm flex flex-col relative px-3.5 py-2 text-sm leading-relaxed transition-all cursor-pointer select-text font-sans",
                  isSender
                    ? "liquid-glass-teal text-teal-900 rounded-2xl rounded-br-none font-medium"
                    : "liquid-glass-bubble text-slate-800 rounded-2xl rounded-bl-none shadow-sm",
                  isEmojiOnly && "bg-transparent! border-none! shadow-none!",
                )}
                onDoubleClick={() => onReplyToMessage && onReplyToMessage(message)}
              >
                {/* Chatvia Corner Tail Nipple */}
                {isSender && !isEmojiOnly && (
                  <svg viewBox="0 0 8 13" height="13" width="8" className="absolute top-0 -right-2 text-teal-400/30 fill-current">
                    <path d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z" />
                  </svg>
                )}
                {!isSender && !isEmojiOnly && (
                  <svg viewBox="0 0 8 13" height="13" width="8" className="absolute top-0 -left-2 text-white/80 fill-current">
                    <path d="M2.812 1H8v11.193L1.533 3.568C.474 2.156 1.042 1 2.812 1z" />
                  </svg>
                )}

                {/* Authentic WhatsApp Chevron Dropdown Menu Button (Top Right on Hover) */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button 
                      className={cn(
                        "absolute top-1 right-1 p-0.5 rounded-full transition-opacity duration-150 shadow-md z-20 opacity-0 group-hover:opacity-100",
                        isSender ? "btn-liquid" : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                      )}
                      onClick={(e) => e.stopPropagation()}
                      title="Message options"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={isSender ? "end" : "start"} className="w-48 bg-white/90 border-black/8 text-slate-700 shadow-2xl rounded-xl p-1 font-sans select-none backdrop-blur z-50">
                    <DropdownMenuItem 
                      className="gap-3 px-3 py-2 text-xs font-medium cursor-pointer focus:bg-teal-50 focus:text-teal-700 rounded-lg text-slate-700"
                      onClick={() => alert(`Message Details:\nID: ${message.id}\nStatus: ${message.status || 'sent'}\nTime: ${message.timestamp ? format(new Date(message.timestamp), 'PPpp') : 'Just now'}`)}
                    >
                      <Info className="h-4 w-4 text-zinc-400" />
                      <span>Message info</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem 
                      className="gap-3 px-3 py-2 text-xs font-medium cursor-pointer focus:bg-teal-50 focus:text-teal-700 rounded-lg text-slate-700"
                      onClick={() => onReplyToMessage && onReplyToMessage(message)}
                    >
                      <Reply className="h-4 w-4 text-zinc-400" />
                      <span>Reply</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem 
                      className="gap-3 px-3 py-2 text-xs font-medium cursor-pointer focus:bg-teal-50 focus:text-teal-700 rounded-lg text-slate-700"
                      onClick={() => {
                        if (message.content) {
                          navigator.clipboard.writeText(message.content);
                        }
                      }}
                    >
                      <Copy className="h-4 w-4 text-zinc-400" />
                      <span>Copy</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem 
                      className="gap-3 px-3 py-2 text-xs font-medium cursor-pointer focus:bg-teal-50 focus:text-teal-700 rounded-lg text-slate-700"
                      onClick={() => setOpenReactionPicker(message.id)}
                    >
                      <Smile className="h-4 w-4 text-zinc-400" />
                      <span>React</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem 
                      className="gap-3 px-3 py-2 text-xs font-medium cursor-pointer focus:bg-teal-50 focus:text-teal-700 rounded-lg text-slate-700"
                      onClick={() => onForwardMessage && onForwardMessage(message)}
                    >
                      <Share2 className="h-4 w-4 text-zinc-400" />
                      <span>Forward</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem 
                      className="gap-3 px-3 py-2 text-xs font-medium cursor-pointer focus:bg-teal-50 focus:text-teal-700 rounded-lg text-slate-700"
                      onClick={() => onPinMessage && onPinMessage(message.id, !!message.isPinned)}
                    >
                      <Pin className="h-4 w-4 text-zinc-400" />
                      <span>{message.isPinned ? "Unpin" : "Pin"}</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem 
                      className="gap-3 px-3 py-2 text-xs font-medium cursor-pointer focus:bg-teal-50 focus:text-teal-700 rounded-lg text-slate-700"
                      onClick={() => onStarMessage && onStarMessage(message.id, !!message.isStarred)}
                    >
                      <Star className="h-4 w-4 text-zinc-400" />
                      <span>{message.isStarred ? "Unstar" : "Star"}</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="bg-zinc-700/60 my-1" />

                    <DropdownMenuItem 
                      className="gap-3 px-3 py-2 text-xs font-medium cursor-pointer text-red-400 focus:bg-red-500/10 focus:text-red-400 rounded-lg"
                      onClick={() => onDeleteMessage && onDeleteMessage(message.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Hover Action Buttons (Quick Reply & Reaction Picker) */}
                <div className={cn(
                  "absolute z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1",
                  "top-1/2 -translate-y-1/2",
                  isSender ? "left-0 -translate-x-full pr-1.5 flex-row-reverse" : "right-0 translate-x-full pl-1.5"
                )}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full bg-white/85 hover:bg-white border border-black/8 shadow-sm backdrop-blur"
                    title="Reply to message"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReplyToMessage && onReplyToMessage(message);
                    }}
                  >
                    <Reply className="h-3.5 w-3.5 text-muted-foreground hover:text-emerald-500" />
                  </Button>

                  <Popover open={openReactionPicker === message.id} onOpenChange={(isOpen) => setOpenReactionPicker(isOpen ? message.id : null)}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-white/85 hover:bg-white border border-black/8 shadow-sm backdrop-blur">
                        <Smile className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-auto bg-transparent border-none shadow-none">
                      <ReactionPicker onSelect={(emoji) => {
                        onMessageReaction(message.id, emoji);
                        setOpenReactionPicker(null);
                      }} />
                    </PopoverContent>
                  </Popover>
                </div>

                {chat.isGroup && !isSender && sender && (
                  <p className="text-xs font-semibold mb-1 text-teal-600">{sender.name}</p>
                )}

                {/* WhatsApp Authentic Quoted Message Card */}
                {message.replyTo && (
                  <div className={cn(
                    "mb-1.5 rounded-lg p-2 text-xs flex flex-col border-l-4 shadow-sm",
                    isSender
                      ? "bg-teal-50 border-teal-400"
                      : "bg-slate-50 border-slate-300"
                  )}>
                    <span className={cn(
                      "font-bold text-[11px] leading-tight mb-0.5 truncate",
                      (message.replyTo.senderName === 'You' || isSender) ? "text-teal-600" : "text-indigo-500"
                    )}>
                      {message.replyTo.senderName}
                    </span>
                    <div className="line-clamp-2 text-slate-500 text-[11px] leading-snug">
                      <AppleFormattedText text={message.replyTo.content || (message.replyTo.type === 'image' ? '📷 Photo' : message.replyTo.type === 'audio' ? '🎵 Voice message' : '📄 Document')} emojiSize="sm" />
                    </div>
                  </div>
                )}

                {message.isForwarded && (
                  <div className="flex items-center gap-1 text-[11px] opacity-75 mb-1 italic">
                    <ArrowRight className="h-3 w-3" />
                    <span>Forwarded</span>
                  </div>
                )}

                <MessageContent message={message} isSender={isSender} sender={sender} onImageClick={onImageClick} />

                {/* Message Timestamp & Status Indicator */}
                <div className={cn(
                  "text-[10px] mt-0.5 flex items-center justify-end gap-1 select-none font-mono opacity-80 self-end",
                  isSender ? "text-teal-800/60" : "text-slate-400"
                )}>
                  {message.isStarred && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                  <span className="text-[10px] tracking-tight">
                    {message.timestamp ? format(new Date(message.timestamp), 'h:mm a').toLowerCase() : ''}
                  </span>
                  {isSender && (
                    <MessageStatusIndicator status={message.status} />
                  )}
                </div>

                {/* Reactions Badge */}
                {reactions.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <div className={cn(
                        "absolute -bottom-2 flex gap-1 z-10 cursor-pointer shadow-md",
                        isSender ? "right-2" : "left-2"
                      )}>
                        {reactions.map(([emoji, userIds]) => (
                          <div
                            key={emoji}
                            className="flex items-center bg-white/85 border border-black/8 rounded-full px-1.5 py-0.5 text-xs hover:bg-white shadow-sm backdrop-blur"
                          >
                            <AppleFormattedText text={emoji} emojiSize="sm" />
                            {userIds.length > 0 && <span className="ml-1 text-[10px] font-semibold text-muted-foreground">{userIds.length}</span>}
                          </div>
                        ))}
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2">
                      <div className="text-xs font-semibold mb-2 text-muted-foreground">Reactions</div>
                      <div className="space-y-2">
                        {Object.entries(message.reactions || {}).flatMap(([emoji, userIds]) =>
                          userIds.map(userId => ({ emoji, user: getUserById(userId) }))
                        ).map(({ emoji, user }, index) => (
                          <div key={index} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={user?.avatar} />
                                <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-medium">{user?.id === currentUserId ? 'You' : user?.name}</span>
                            </div>
                            <span
                              className={cn("text-base", user?.id === currentUserId && "cursor-pointer")}
                              onClick={() => {
                                if (user?.id === currentUserId) {
                                  onMessageReaction(message.id, emoji);
                                }
                              }}
                            >
                              <AppleFormattedText text={emoji} emojiSize="sm" />
                            </span>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          )
        })}

        {/* WhatsApp Typing Bubble Indicator */}
        {Object.keys(chat.typingUsers || {}).some(id => id !== currentUserId && chat.typingUsers?.[id]) && (
          <div className="flex items-center gap-2 relative py-1 px-3 my-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="liquid-glass-bubble rounded-2xl rounded-tl-none px-4 py-2.5 flex items-center gap-1.5 shadow-sm">
              <span className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-px w-full shrink-0" />
      </div>
    </ScrollArea>
  );
}
