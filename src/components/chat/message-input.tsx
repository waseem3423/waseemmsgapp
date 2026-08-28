"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, Send, Smile, Zap, Loader2, Mic, StopCircle, Image as ImageIcon, FileText, X } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import GifPicker from './gif-picker';

import type { Message, MessageType } from '@/lib/types';
import AppleFormattedText from './apple-emoji-text';

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  onFileSelected: (file: File, type: MessageType) => void;
  onSendGif: (gifUrl: string) => void;
  suggestions: string[];
  isLoadingSuggestions: boolean;
  replyingToMessage?: Message | null;
  onCancelReply?: () => void;
  onTypingStatusChange?: (isTyping: boolean) => void;
}

export default function MessageInput({ 
  onSendMessage, 
  onFileSelected, 
  onSendGif, 
  suggestions, 
  isLoadingSuggestions,
  replyingToMessage,
  onCancelReply,
  onTypingStatusChange
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [isRecording]);

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const handleMicClick = async () => {
    if (isRecording) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/webm';
        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          const customVoiceName = `voice_${Date.now()}.wzm`;
          const audioFile = new File([audioBlob], customVoiceName, { type: mimeType });
          onFileSelected(audioFile, 'audio');
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (error) {
        console.error("Error accessing microphone:", error);
        toast({
          title: "Microphone Access Denied",
          description: "Please allow microphone access in your browser settings to send voice messages.",
          variant: "destructive",
        });
      }
    }
  };

  const detectFileType = (file: File): MessageType => {
    const mime = file.type.toLowerCase();
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/') || ['mp4', 'webm', 'mkv', 'mov', 'avi', 'wmv', 'flv'].includes(ext)) return 'video';
    if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'opus', 'm4a', 'wzm', 'aac'].includes(ext)) return 'audio';
    return 'document';
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const detectedType = detectFileType(file);
      onFileSelected(file, detectedType);
    }
    event.target.value = '';
  };

  const handleTextChange = (value: string) => {
    setText(value);
    if (onTypingStatusChange) {
      onTypingStatusChange(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTypingStatusChange(false);
      }, 2500);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      if (onTypingStatusChange) {
        onTypingStatusChange(false);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      }
      onSendMessage(text.trim());
      setText('');
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onSendMessage(suggestion);
    setText('');
  };

  const handleEmojiSelect = (emoji: any) => {
    setText(prev => prev + emoji.native);
  };

  const handleGifSelect = (gifUrl: string) => {
    onSendGif(gifUrl);
  };

  return (
    <div className="p-3 border-t border-black/5 select-none liquid-glass-thin">
      <input 
        type="file" 
        ref={imageInputRef} 
        className="hidden" 
        accept="image/*,video/*" 
        onChange={handleFileSelect} 
      />
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="*" 
        onChange={handleFileSelect} 
      />

      {/* AI Smart Replies Pill Carousel */}
      {(isLoadingSuggestions || suggestions.length > 0) && (
        <div className="mb-2.5 px-1">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex items-center gap-2 pb-1.5">
              <div className="flex items-center gap-1 text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                <Zap className="h-3.5 w-3.5 fill-primary" />
                <span>AI Quick Reply</span>
              </div>
              {isLoadingSuggestions ? (
                 <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary"/>
                    <span>Analyzing message...</span>
                 </div>
              ) : (
                suggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="secondary"
                    size="sm"
                    className="rounded-full text-xs h-7 py-1 px-3 bg-white/70 hover:bg-teal-50 hover:text-teal-700 transition-colors border border-black/8 shadow-sm"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* WhatsApp Quoted Reply Preview Banner */}
      {replyingToMessage && (
        <div className="mb-2 rounded-xl p-2.5 flex items-center justify-between border-l-4 border-teal-400 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-150 bg-white/70 backdrop-blur">
          <div className="flex flex-col min-w-0 pr-2">
            <span className="text-xs font-bold text-teal-600">Replying to message</span>
            <p className="text-xs text-muted-foreground truncate mt-0.5 font-medium">
              <AppleFormattedText text={replyingToMessage.content || (replyingToMessage.type === 'image' ? '📷 Photo' : replyingToMessage.type === 'audio' ? '🎵 Voice message' : '📄 Document')} emojiSize="sm" />
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full text-muted-foreground hover:text-foreground shrink-0"
            onClick={onCancelReply}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Main WhatsApp Input Toolbar */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-slate-400 hover:text-teal-600 hover:bg-teal-50 shrink-0">
              <Smile className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 border-0 mb-2 shadow-2xl rounded-2xl overflow-hidden">
            <Tabs defaultValue="emoji" className="w-full">
              <TabsContent value="emoji" className="m-0">
                <Picker
                  data={data}
                  onEmojiSelect={handleEmojiSelect}
                  getImageURL={(unified: string) => `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.0.1/img/apple/64/${unified.toLowerCase()}.png`}
                  theme="auto"
                  previewPosition="none"
                />
              </TabsContent>
              <TabsContent value="gif" className="m-0 p-2">
                <GifPicker onSelect={handleGifSelect} />
              </TabsContent>
              <TabsList className="grid w-full grid-cols-2 bg-muted/60">
                <TabsTrigger value="emoji">Emoji</TabsTrigger>
                <TabsTrigger value="gif">GIFs</TabsTrigger>
              </TabsList>
            </Tabs>
          </PopoverContent>
        </Popover>

        {/* Attachment Options Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="rounded-full h-9 w-9 text-slate-400 hover:text-teal-600 hover:bg-teal-50 shrink-0">
              <Paperclip className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2 mb-2 shadow-xl border-border/80 rounded-xl">
            <div className="flex flex-col gap-1">
              <Button 
                variant="ghost" 
                className="justify-start gap-3 h-10 px-3 hover:bg-muted/80 rounded-lg"
                onClick={() => imageInputRef.current?.click()}
              >
                <ImageIcon className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium">Photos & Videos</span>
              </Button>
              <Button 
                variant="ghost" 
                className="justify-start gap-3 h-10 px-3 hover:bg-muted/80 rounded-lg"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileText className="h-4 w-4 text-indigo-500" />
                <span className="text-sm font-medium font-headline">Document</span>
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Input Bar or Voice Recording Live Waveform Indicator */}
        {isRecording ? (
          <div className="flex-1 flex items-center gap-3 bg-red-50 text-red-500 rounded-full px-4 py-1.5 border border-red-200 select-none shadow-sm">
            <span className="h-3 w-3 rounded-full bg-red-500 animate-ping shrink-0" />
            <span className="text-xs font-mono font-bold text-red-400 shrink-0">{formatSeconds(recordingSeconds)}</span>
            <div className="flex-1 flex items-center gap-1 overflow-hidden h-4">
              {[40, 70, 30, 90, 50, 100, 60, 30, 80, 50, 90, 40, 70, 100, 60, 40, 80].map((h, i) => (
                <span 
                  key={i} 
                  className="w-0.5 bg-emerald-500 rounded-full animate-pulse" 
                  style={{ height: `${h}%`, animationDuration: `${0.4 + (i % 5) * 0.2}s` }} 
                />
              ))}
            </div>
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
              onClick={() => {
                if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
                setIsRecording(false);
              }}
              title="Cancel Recording"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Input
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Type a message"
            autoComplete="off"
            className="flex-1 rounded-full px-4 py-2 text-sm focus-visible:ring-1 focus-visible:ring-teal-400/50 shadow-sm bg-white/75 border border-white/85 hover:bg-white/90"
          />
        )}

        {/* Action Button: Send or Mic */}
        {text.trim() ? (
          <Button type="submit" size="icon" className="rounded-full h-9 w-9 shrink-0 transition-transform active:scale-95 btn-liquid">
            <Send className="h-4.5 w-4.5" />
          </Button>
        ) : (
          <Button 
            type="button" 
            size="icon" 
            onClick={handleMicClick} 
            className={cn(
              "rounded-full h-9 w-9 shrink-0 shadow-md transition-all active:scale-95",
              isRecording ? "bg-red-500 hover:bg-red-600 text-white animate-bounce shadow-md" : "btn-liquid"
            )}
            title={isRecording ? "Stop & Send Voice Message" : "Record Voice Message"}
          >
            {isRecording ? <StopCircle className="h-5 w-5" /> : <Mic className="h-4.5 w-4.5" />}
          </Button>
        )}
      </form>
    </div>
  );
}
