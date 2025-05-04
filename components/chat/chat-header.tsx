import React from "react";
import { Button } from "@/components/ui/button";
import { Code2, PanelLeftClose } from "lucide-react";

interface ChatHeaderProps {
  title?: string;
  isCanvasOpen?: boolean;
  onCanvasOpenChange?: (isOpen: boolean) => void;
}

export function ChatHeader({ 
  title = "Chat With Canvas", 
  isCanvasOpen = false,
  onCanvasOpenChange
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between w-full">
      <h1 className="text-xl font-medium">{title}</h1>
      {onCanvasOpenChange && (
        <Button 
          variant="outline" 
          size="default"
          onClick={() => onCanvasOpenChange(!isCanvasOpen)}
          className="flex items-center gap-2"
        >
          {isCanvasOpen ? (
            <>
              <PanelLeftClose size={18} />
              <span className="hidden sm:inline">Close Canvas</span>
            </>
          ) : (
            <>
              <Code2 size={18} />
              <span className="hidden sm:inline">View Canvas</span>
            </>
          )}
        </Button>
      )}
    </div>
  );
}