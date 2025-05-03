"use client";

import React from "react";
import { ReactRenderer } from "./react-renderer";
import { ErrorBoundary } from "react-error-boundary";
import { Alert, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import { RefreshCw } from "lucide-react";

interface CodePreviewProps {
  jsxCode: string;
}

function ErrorFallback({ error, resetErrorBoundary }: { 
  error: Error; 
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="w-full max-w-md p-4 text-center">
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Render Error</AlertTitle>
          <div className="text-sm mt-2 overflow-auto max-h-[200px]">
            {error.message}
          </div>
        </Alert>
        <Button 
          variant="outline" 
          onClick={resetErrorBoundary}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    </div>
  );
}

export function CodePreview({ jsxCode }: CodePreviewProps) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <ReactRenderer jsxCode={jsxCode} />
    </ErrorBoundary>
  );
}