import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Image from 'next/image';
interface ImagePreviewProps {
  src: string;
  alt?: string;
  className?: string;
  onRemove?: () => void;
  width?: number;
  height?: number;
}

export function ImagePreview({
  src,
  alt = "Preview image",
  className,
  onRemove,
  width = 200,
  height = 200,
}: ImagePreviewProps) {
  return (
    <div 
      className={cn("relative inline-block group overflow-hidden rounded-md", className)}
      style={{ width, height }}
    >
      <Image
        src={src}
        alt={alt}
        layout="fill"
        objectFit="cover"
        className="transition-transform duration-300 group-hover:scale-105"
      />
      {onRemove && (
        <Button
          type="button"
          variant="destructive"
          className={cn(
            "absolute bottom-0 left-0 right-0 w-full h-4",
            "flex items-center justify-center gap-2",
            "opacity-0 group-hover:opacity-90 transition-opacity duration-300",
            "rounded-t-none rounded-b-md"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <span>Delete</span>
        </Button>
      )}
    </div>
  );
} 