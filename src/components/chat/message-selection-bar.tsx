
"use client";

import { Star, Trash2, ArrowRight, X } from "lucide-react";
import { Button } from "../ui/button";

interface MessageSelectionBarProps {
  selectedCount: number;
  onStar: () => void;
  onDelete: () => void;
  onForward: () => void;
  onClear: () => void;
  onClose: () => void;
}

export default function MessageSelectionBar({
  selectedCount,
  onStar,
  onDelete,
  onForward,
  onClose,
}: MessageSelectionBarProps) {
  return (
    <div className="bg-card border-t p-2 px-4 flex items-center justify-between animate-in slide-in-from-bottom-full duration-300">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-6 w-6" />
        </Button>
        <span className="font-semibold text-lg">{selectedCount} selected</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onStar}>
          <Star className="h-6 w-6 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-6 w-6 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onForward}>
          <ArrowRight className="h-6 w-6 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}

    