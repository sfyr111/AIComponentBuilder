import React, { useRef, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface FileInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "value"> {
  className?: string;
  value?: File | null;
  onChange?: (file: File | null) => void;
  onPreview?: (url: string) => void;
  previewUrl?: string;
  buttonText?: string;
}

const FileInput = forwardRef<HTMLInputElement, FileInputProps>(
  (
    {
      className,
      value,
      onChange,
      onPreview,
      previewUrl,
      buttonText = "Select File",
      disabled,
      ...props
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = ref || inputRef;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      if (onChange) {
        onChange(file);
      }

      if (file && onPreview) {
        const url = URL.createObjectURL(file);
        onPreview(url);
      }
    };

    const handleClear = () => {
      if (fileInputRef && 'current' in fileInputRef && fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (onChange) {
        onChange(null);
      }
    };

    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (fileInputRef && 'current' in fileInputRef && fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
            disabled={disabled}
          >
            {buttonText}
          </Button>
          {value && (
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              disabled={disabled}
              size="sm"
            >
              Clear
            </Button>
          )}
          {value && (
            <span className="text-sm text-muted-foreground">
              {value.name} ({Math.round(value.size / 1024)} KB)
            </span>
          )}
        </div>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled}
          {...props}
        />
      </div>
    );
  }
);

FileInput.displayName = "FileInput";

export { FileInput }; 