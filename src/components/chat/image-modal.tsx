
"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "../ui/button";
import { X } from "lucide-react";
import Image from 'next/image';

interface ImageModalProps {
    imageUrl: string;
    onClose: () => void;
}

export default function ImageModal({ imageUrl, onClose }: ImageModalProps) {
    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="p-0 m-0 bg-background/80 backdrop-blur-sm border-none w-screen h-screen max-w-full rounded-none flex items-center justify-center">
                 <DialogTitle className="sr-only">Full screen image preview</DialogTitle>
                <div className="relative w-full h-full max-w-4xl max-h-[80vh]">
                     <Image 
                        src={imageUrl} 
                        alt="Full screen image preview"
                        layout="fill"
                        objectFit="contain"
                    />
                </div>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-white bg-black/30 hover:bg-black/50 hover:text-white rounded-full"
                >
                    <X className="h-6 w-6" />
                </Button>
            </DialogContent>
        </Dialog>
    );
}

