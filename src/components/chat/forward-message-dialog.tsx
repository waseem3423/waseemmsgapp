
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowRight, Search } from "lucide-react";
import type { Chat } from "@/lib/types";

interface ForwardMessageDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onForward: (targetChatIds: string[]) => void;
  chats: Chat[];
}

export default function ForwardMessageDialog({
  isOpen,
  onOpenChange,
  onForward,
  chats,
}: ForwardMessageDialogProps) {
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const handleChatToggle = (chatId: string) => {
    setSelectedChats((prev) =>
      prev.includes(chatId)
        ? prev.filter((id) => id !== chatId)
        : [...prev, chatId]
    );
  };
  
  const handleForwardClick = () => {
    if (selectedChats.length > 0) {
      onForward(selectedChats);
      onOpenChange(false); // Close dialog after forwarding
    }
  };
  
  const filteredChats = chats.filter(chat => {
    const name = chat.isGroup ? chat.groupName : chat.contact?.name;
    return name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Reset state when dialog is closed
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedChats([]);
      setSearchQuery("");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md p-0 flex flex-col h-[600px]">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Forward message to...</DialogTitle>
        </DialogHeader>
        
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-10 bg-muted border-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-1">
            <p className="py-2 text-sm font-semibold text-primary">All Chats</p>
            {filteredChats.map((chat) => {
              const name = chat.isGroup ? chat.groupName : chat.contact?.name;
              const avatar = chat.isGroup ? chat.groupAvatar : chat.contact?.avatar;
              return (
                <Label
                  key={chat.id}
                  htmlFor={`chat-${chat.id}`}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                >
                  <Checkbox
                    id={`chat-${chat.id}`}
                    checked={selectedChats.includes(chat.id)}
                    onCheckedChange={() => handleChatToggle(chat.id)}
                  />
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={avatar} alt={name} />
                    <AvatarFallback>{name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="font-normal flex-1">{name}</span>
                </Label>
              );
            })}
          </div>
        </ScrollArea>
        
        <DialogFooter className="p-4 border-t mt-auto">
          <Button
            type="button"
            className="bg-primary hover:bg-primary/90 rounded-full h-12 w-12 p-0"
            disabled={selectedChats.length === 0}
            onClick={handleForwardClick}
          >
            <ArrowRight className="h-6 w-6" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
