"use client";

import { useState } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/types";
import { FileText, FileArchive, Image as ImageIcon, Video, Download, ExternalLink, X, ChevronDown, ChevronRight, Copy, Link as LinkIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SharedMediaSidebarProps {
  messages: Message[];
  onClose: () => void;
  onImageClick: (url: string) => void;
}

export default function SharedMediaSidebar({ messages, onClose, onImageClick }: SharedMediaSidebarProps) {
  const [activeTab, setActiveTab] = useState<'media' | 'docs' | 'links'>('media');

  // Filter messages by type
  const mediaMessages = messages.filter(m => m.type === 'image' || m.type === 'video' || m.type === 'gif');
  const docMessages = messages.filter(m => m.type === 'document');
  const linkMessages = messages.filter(m => m.type === 'text' && m.content && (m.content.includes('http://') || m.content.includes('https://')));

  const handleDownload = (url: string, fileName?: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || `download_${Date.now()}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="w-80 bg-card border-l border-border/80 flex flex-col h-full z-30 select-none animate-in slide-in-from-right duration-200 shadow-xl">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-border/80 flex items-center justify-between bg-card">
        <h3 className="font-semibold text-sm text-foreground tracking-wide">Shared Media & Files</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground">
          <X className="h-4.5 w-4.5" />
        </Button>
      </div>

      {/* Navigation Tabs (Ported from Chatvia AttachedFiles UI) */}
      <div className="flex items-center border-b border-border/60 bg-muted/30 p-1">
        <button
          onClick={() => setActiveTab('media')}
          className={cn(
            "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors text-center",
            activeTab === 'media' ? "bg-card text-emerald-400 shadow-sm border border-border/40" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Media ({mediaMessages.length})
        </button>
        <button
          onClick={() => setActiveTab('docs')}
          className={cn(
            "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors text-center",
            activeTab === 'docs' ? "bg-card text-emerald-400 shadow-sm border border-border/40" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Docs ({docMessages.length})
        </button>
        <button
          onClick={() => setActiveTab('links')}
          className={cn(
            "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors text-center",
            activeTab === 'links' ? "bg-card text-emerald-400 shadow-sm border border-border/40" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Links ({linkMessages.length})
        </button>
      </div>

      {/* Tab Contents */}
      <ScrollArea className="flex-1 p-3">
        {activeTab === 'media' && (
          mediaMessages.length === 0 ? (
            <div className="text-center py-10 text-xs text-muted-foreground">No shared photos or videos yet.</div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {mediaMessages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => onImageClick(msg.content)}
                  className="relative aspect-square rounded-lg overflow-hidden border border-border/40 bg-muted cursor-pointer hover:opacity-95 hover:scale-105 transition-all group"
                >
                  {msg.type === 'video' ? (
                    <div className="w-full h-full flex items-center justify-center bg-black/40">
                      <Video className="h-6 w-6 text-white" />
                    </div>
                  ) : (
                    <img src={msg.content} alt="Media" className="w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ExternalLink className="h-4 w-4 text-white" />
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'docs' && (
          docMessages.length === 0 ? (
            <div className="text-center py-10 text-xs text-muted-foreground">No shared documents yet.</div>
          ) : (
            <div className="space-y-2">
              {docMessages.map((msg) => {
                const ext = (msg.fileName || msg.content).split('.').pop()?.toLowerCase() || '';
                const isZip = ['zip', 'rar', '7z'].includes(ext);

                return (
                  <div
                    key={msg.id}
                    className="p-2.5 rounded-xl border border-border/60 bg-muted/40 hover:bg-muted/70 transition-colors flex items-center gap-3 group"
                  >
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 border",
                      isZip ? "bg-amber-500/15 text-amber-500 border-amber-500/30" : "bg-red-500/15 text-red-500 border-red-500/30"
                    )}>
                      {isZip ? <FileArchive className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                    </div>

                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-semibold text-foreground truncate">{msg.fileName || "Document"}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-mono mt-0.5">{ext} File</p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleDownload(msg.content, msg.fileName)}
                        className="p-1.5 hover:bg-card rounded-full text-muted-foreground hover:text-foreground transition-colors"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {activeTab === 'links' && (
          linkMessages.length === 0 ? (
            <div className="text-center py-10 text-xs text-muted-foreground">No shared links yet.</div>
          ) : (
            <div className="space-y-2">
              {linkMessages.map((msg) => {
                const urlMatch = msg.content.match(/https?:\/\/[^\s]+/);
                const url = urlMatch ? urlMatch[0] : msg.content;

                return (
                  <div
                    key={msg.id}
                    className="p-2.5 rounded-xl border border-border/60 bg-muted/40 hover:bg-muted/70 transition-colors flex items-center gap-3"
                  >
                    <div className="h-9 w-9 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <LinkIcon className="h-4 w-4" />
                    </div>

                    <div className="flex-1 overflow-hidden">
                      <a href={url} target="_blank" rel="noreferrer" className="text-xs font-mono text-emerald-400 hover:underline truncate block">
                        {url}
                      </a>
                    </div>

                    <button
                      onClick={() => navigator.clipboard.writeText(url)}
                      className="p-1.5 hover:bg-card rounded-full text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      title="Copy Link"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )
        )}
      </ScrollArea>
    </div>
  );
}
