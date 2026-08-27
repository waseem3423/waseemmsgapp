
"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageCheckboxProps {
    checked: boolean;
    isSender: boolean;
}

export default function MessageCheckbox({ checked, isSender }: MessageCheckboxProps) {
  return (
    <div className={cn(
        "absolute top-1/2 -translate-y-1/2 h-full w-10 flex items-center justify-center z-10",
        isSender ? "left-[-40px]" : "right-[-40px]"
    )}>
        <div className={cn(
            "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
            checked 
                ? "bg-blue-500 border-blue-500" 
                : "bg-background/50 border-gray-400 group-hover:border-gray-500"
        )}>
            {checked && <Check className="h-4 w-4 text-white" />}
        </div>
    </div>
  );
}

    