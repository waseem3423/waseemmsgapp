
"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "../ui/button";
import { X } from "lucide-react";
import Image from 'next/image';

import CustomVideoPlayer from "./custom-video-player";

interface ImageModalProps {
    imageUrl: string;
    onClose: () => void;
}

import { useState } from "react";
import { ZoomIn, ZoomOut, Download, RotateCcw } from "lucide-react";

export default function ImageModal({ imageUrl, onClose }: ImageModalProps) {
    const isVideo = imageUrl.includes('.mp4') || imageUrl.includes('.webm') || imageUrl.includes('.mov') || imageUrl.includes('.mkv') || imageUrl.includes('video');
    const [zoom, setZoom] = useState(1);

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
    const handleResetZoom = () => setZoom(1);

    const handleDownload = () => {
        const a = document.createElement('a');
        a.href = imageUrl;
        a.download = `media_${Date.now()}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="p-0 m-0 bg-background/95 backdrop-blur-md border-none w-screen h-screen max-w-full rounded-none flex flex-col items-center justify-center">
                 <DialogTitle className="sr-only">Full screen media preview</DialogTitle>
                
                {/* WhatsApp Style Top Toolbar */}
                <div className="absolute top-4 right-4 flex items-center gap-2 z-50 bg-black/60 backdrop-blur-md p-1.5 rounded-full border border-white/10 shadow-2xl">
                    {!isVideo && (
                      <>
                        <Button variant="ghost" size="icon" onClick={handleZoomOut} className="h-8 w-8 text-white hover:bg-white/20 rounded-full" title="Zoom Out">
                          <ZoomOut className="h-4 w-4" />
                        </Button>
                        <span className="text-xs font-mono text-white/80 px-1">{Math.round(zoom * 100)}%</span>
                        <Button variant="ghost" size="icon" onClick={handleZoomIn} className="h-8 w-8 text-white hover:bg-white/20 rounded-full" title="Zoom In">
                          <ZoomIn className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleResetZoom} className="h-8 w-8 text-white hover:bg-white/20 rounded-full" title="Reset Zoom">
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <div className="w-px h-4 bg-white/20 my-auto mx-0.5" />
                      </>
                    )}
                    <Button variant="ghost" size="icon" onClick={handleDownload} className="h-8 w-8 text-white hover:bg-white/20 rounded-full" title="Download Original">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-white hover:bg-red-500/80 rounded-full" title="Close">
                      <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="relative w-full h-full max-w-5xl max-h-[85vh] flex items-center justify-center p-4 overflow-hidden">
                     {isVideo ? (
                        <CustomVideoPlayer src={imageUrl} autoPlay className="w-full h-full max-h-[80vh] shadow-2xl" />
                     ) : (
                        <img 
                            src={imageUrl} 
                            alt="Full screen media preview"
                            style={{ transform: `scale(${zoom})`, transition: 'transform 0.15s ease-out' }}
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl cursor-grab active:cursor-grabbing select-none"
                        />
                     )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

