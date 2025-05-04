"use client";

import React from "react";
import { SandboxIframe } from "./sandbox-iframe";
import { ErrorBoundary } from "react-error-boundary";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hashString } from "@/lib/utils";

interface CodePreviewProps {
  jsxCode: string;
  onError?: (error: Error) => void;
}

function ErrorFallback({ error, resetErrorBoundary }: { 
  error: Error; 
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="h-full flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-destructive/10 border border-destructive/30 rounded-md p-4">
        <div className="flex items-center gap-2 mb-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="font-medium">Rendering Error</h3>
        </div>
        <div className="text-sm mb-4 overflow-auto max-h-[200px] text-destructive/90 bg-background/80 p-2 rounded-sm">
          {error.message}
        </div>
        <Button 
          variant="outline" 
          onClick={resetErrorBoundary}
          className="flex items-center gap-2"
          size="sm"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </Button>
      </div>
    </div>
  );
}

export function CodePreview({ jsxCode, onError }: CodePreviewProps) {
  const handleError = (err: Error) => {
    console.error("Preview error:", err);
    onError?.(err);
  };

  const key = jsxCode ? hashString(jsxCode) : 'empty';

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      resetKeys={[jsxCode]}
      onError={handleError}
    >
      <div className="w-full h-full rounded-md overflow-hidden">
        <SandboxIframe 
          key={key}
          jsxCode={jsxCode} 
          className="w-full h-full"
          onError={handleError}
        />
      </div>
    </ErrorBoundary>
  );
}