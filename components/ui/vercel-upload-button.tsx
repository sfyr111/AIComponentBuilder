import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadImageToTOS } from "@/lib/tos-upload";
import { toast } from "sonner";

interface TOSUploadButtonProps {
  onUploadComplete?: (url: string) => void;
  onUploadStart?: () => void;
  onUploadError?: (error: string) => void;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "link" | "destructive" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  disabled?: boolean;
  accept?: string;
  buttonText?: string;
  children?: React.ReactNode;
}

export function TOSUploadButton({
  onUploadComplete,
  onUploadStart,
  onUploadError,
  className,
  variant = "outline",
  size = "icon",
  disabled = false,
  accept = "image/*",
  buttonText,
  children
}: TOSUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      const errorMessage = "Only image files are supported";
      toast.error(errorMessage);
      onUploadError?.(errorMessage);
      return;
    }

    setIsUploading(true);
    onUploadStart?.();

    try {
      const uploadedUrl = await uploadImageToTOS(file);

      if (uploadedUrl) {
        toast.success("Upload successful!");
        onUploadComplete?.(uploadedUrl);
      } else {
        const errorMessage = "Upload failed, please try again";
        toast.error(errorMessage);
        onUploadError?.(errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Upload failed";
      toast.error(errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    
    const file = e.target.files[0];
    await handleUpload(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isUploading}
        className={cn(className)}
        title={buttonText || "Upload image"}
      >
        {isUploading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : children || (
          <>
            <Upload className="h-5 w-5" />
            {buttonText && <span className="ml-2">{buttonText}</span>}
          </>
        )}
      </Button>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept={accept}
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />
    </>
  );
} 