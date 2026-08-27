
"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Crop, Smile, Type, Brush, Eraser, Send } from 'lucide-react';
import type { MessageType } from '@/lib/types';

interface ImagePreviewDialogProps {
  file: File;
  fileUrl: string;
  onClose: () => void;
  onSend: (file: File, type: MessageType, caption?: string) => void;
}

export default function ImagePreviewDialog({ file, fileUrl, onClose, onSend }: ImagePreviewDialogProps) {
  const [caption, setCaption] = useState('');

  const handleSend = () => {
    onSend(file, 'image', caption);
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[90vh] p-0 flex flex-col bg-background/80 backdrop-blur-sm">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-white">Edit and send</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-center p-2 gap-4">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white"><Crop /></Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white"><Smile /></Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white"><Type /></Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white"><Brush /></Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white"><Eraser /></Button>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-4 relative">
          <Image src={fileUrl} alt="Image preview" layout="fill" objectFit="contain" />
        </div>

        <DialogFooter className="p-4 bg-transparent flex-row">
            <div className="flex-1">
                <Input 
                    placeholder="Add a caption..." 
                    className="bg-card/80 border-none text-white placeholder:text-gray-300 rounded-full"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                />
            </div>
            <Button 
                size="icon" 
                className="rounded-full bg-primary h-12 w-12"
                onClick={handleSend}
            >
                <Send />
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
