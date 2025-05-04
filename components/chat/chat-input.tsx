import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImagePreview } from "@/components/ui/image-preview";
import { cn } from "@/lib/utils";
import { Loader2, SendHorizontal, FilePlus2 } from "lucide-react";
import { uploadImageToTOS } from "@/lib/tos-upload";
import { TOSUploadButton } from "@/components/ui/vercel-upload-button";

interface ChatInputProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  selectedImage?: string | null;
  onImageChange?: (imageUrl: string | null) => void;
  onClearChat?: () => void;
}

export function ChatInput({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  selectedImage,
  onImageChange,
  onClearChat
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  useEffect(() => {
    if (selectedImage === null) {
      setUploadStatus(null);
    }
  }, [selectedImage]);

  const handleUpload = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      setUploadStatus("Only image files are supported");
      return null;
    }

    setIsUploading(true);
    setUploadStatus("Uploading...");

    const uploadedUrl = await uploadImageToTOS(file);

    if (uploadedUrl) {
      setUploadStatus("Upload successful!");
    } else {
      setUploadStatus("Upload failed, please try again");
    }

    setIsUploading(false);
    return uploadedUrl;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !onImageChange) {
      return;
    }
    
    const file = e.target.files[0];
    if (file.type.startsWith('image/')) {
      const localImageUrl = URL.createObjectURL(file);
      onImageChange(localImageUrl);
      
      const uploadedUrl = await handleUpload(file);
      if (uploadedUrl) {
        onImageChange(uploadedUrl);
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onImageChange) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const localImageUrl = URL.createObjectURL(file);
        onImageChange(localImageUrl);
        
        const uploadedUrl = await handleUpload(file);
        if (uploadedUrl) {
          onImageChange(uploadedUrl);
        }
      }
    }
  };

  return (
    <div 
      className="p-4 border-t relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <p className="text-xl font-medium">Drop image here</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2"
      >
        {uploadStatus && (
          <div className={`text-center p-2 text-xs rounded mb-2 ${
            uploadStatus.includes("success") 
              ? "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400" 
              : uploadStatus.includes("failed") || uploadStatus.includes("Only") 
                ? "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400" 
                : "bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-400"
          }`}>
            {uploadStatus}
          </div>
        )}
        
        {selectedImage && (
          <div className="flex justify-end mb-2">
            <ImagePreview 
              src={selectedImage}
              width={100} 
              height={100}
              onRemove={() => {
                if (onImageChange) {
                  onImageChange(null);
                  setUploadStatus(null);
                }
              }}
              className="rounded-md overflow-hidden border border-border"
            />
          </div>
        )}
        
        <div className="flex items-center gap-3">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Describe the React component you want to create..."
            className={cn(
              "flex-1",
              isDragging && "border-primary border-dashed bg-secondary/30"
            )}
            disabled={isLoading || isUploading}
          />
          
          <div className="flex items-center gap-2">
            <TOSUploadButton
              disabled={isLoading || isUploading}
              size="icon"
              variant="outline"
              className="h-10 w-10 transition-colors"
              onUploadStart={() => {
                setIsUploading(true);
                setUploadStatus("Uploading...");
              }}
              onUploadComplete={(url) => {
                setIsUploading(false);
                setUploadStatus("Upload successful!");
                if (onImageChange) {
                  onImageChange(url);
                }
              }}
              onUploadError={(error) => {
                setIsUploading(false);
                setUploadStatus(`Upload failed: ${error}`);
              }}
            />
            
            <Button
              type="button"
              variant="outline"
              onClick={onClearChat}
              disabled={isLoading || isUploading}
              title="New Chat"
              size="icon"
              className="h-10 w-10"
            >
              <FilePlus2 className="h-5 w-5" />
            </Button>
            
            <Button 
              type="submit" 
              disabled={isLoading || isUploading || (!input.trim() && !selectedImage)}
              className="gap-1 h-10"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" /> 
                  Generating...
                </>
              ) : (
                <>
                  <SendHorizontal className="h-4 w-4 mr-1" /> 
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground text-center">
          You can drag & drop, paste images
        </p>

        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          disabled={isLoading || isUploading}
        />
      </form>
    </div>
  );
}