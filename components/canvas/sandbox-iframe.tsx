"use client";

import React, { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import { useEsbuild, bundleAndTransform } from "../esbuild-provider";
import { useDebounce } from "@/hooks/use-debounce";

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode, onError?: (error: Error) => void },
  { hasError: boolean, error: Error | null }
> {
  constructor(props: { children: React.ReactNode, onError?: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Sandbox error:", error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <h3 className="text-red-700 font-medium">Component Rendering Error</h3>
          <pre className="mt-2 text-sm text-red-600 overflow-auto">
            {this.state.error?.message}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

interface SandboxIframeProps {
  jsxCode: string;
  className?: string;
  onError?: (error: Error) => void;
}

export function SandboxIframe({ jsxCode, className, onError }: SandboxIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resourceError, setResourceError] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState("");
  const { isInitializing, hasError } = useEsbuild();
  const debouncedCode = useDebounce(jsxCode, 500);
  const esbuildReadyRef = useRef(false);

  useEffect(() => {
    if (!debouncedCode || !iframeRef.current) return;
    
    setIsLoading(true);
    setResourceError(null);
    
    if (isInitializing || hasError) {
      console.log("ESBuild is initializing, waiting...");
      return;
    }

    if (!esbuildReadyRef.current) {
      esbuildReadyRef.current = true;
      console.log("ESBuild initialization complete");
    }

    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;
      const { type, error } = event.data;
      
      if (type === "error" || type === "resourceError") {
        onError?.(new Error(error));
        if (type === "resourceError") setResourceError(error);
      } else if (type === "loaded") {
        console.log("Preview reported loaded");
        setIsLoading(false);
      }
    };

    const handleCleanup = () => {
      if (iframeRef.current) {
        iframeRef.current.srcdoc = "";
        setHtmlContent("");
      }
    };

    window.addEventListener("message", handleMessage);
    window.addEventListener("cleanup-preview", handleCleanup);

    let isMounted = true;

    const bundleAndRender = async () => {
      try {
        console.log("ESBuild ready, processing code:", debouncedCode.slice(0, 50) + "...");
        const iife = await bundleAndTransform(debouncedCode);
        if (!isMounted) return;
        
        console.log("Bundle complete, rendering iframe");
        
        const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview</title>
    <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4" crossorigin></script>
    <style>
      body { margin: 0; padding: 1rem; font-family: system-ui, sans-serif; }
      #sandbox-error {
        background-color: #fee2e2;
        border: 1px solid #fecaca;
        border-radius: 0.375rem;
        padding: 1rem;
        color: #dc2626;
        margin-top: 1rem;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script>
      window.parent.postMessage({ type: 'loaded' }, '*');
      window.addEventListener('error', (e) => {
        if (['SCRIPT', 'LINK'].includes(e.target?.tagName)) {
          const msg = 'Resource load error: ' + (e.target.src || e.target.href);
          window.parent.postMessage({ type: 'resourceError', error: msg }, '*');
          e.preventDefault();
        }
      }, true);
      window.onerror = (msg, src, line, col, err) => {
        window.parent.postMessage({ type: 'error', error: msg }, '*');
        return true;
      };
      try {
        ${iife}
        const Component = window.Sandbox?.default || Object.values(window.Sandbox).find(f => typeof f === 'function');
        if (!Component) throw new Error('No valid export found');
        ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Component));
      } catch (err) {
        const root = document.getElementById('root');
        root.innerHTML = '<div id="sandbox-error"><strong>Render error:</strong><pre>' + err.message + '</pre></div>';
        window.parent.postMessage({ type: 'error', error: err.message }, '*');
      }
    </script>
  </body>
</html>`;
        
        setHtmlContent(html);
        if (iframeRef.current) {
          console.log("Updating iframe srcdoc");
          iframeRef.current.srcdoc = html;
          
          // Fallback loading timeout (enable if needed for long previews)
          // setTimeout(() => {
          //   if (isMounted) {
          //     console.log("Timeout - force ending loading state");
          //     setIsLoading(false);
          //   }
          // }, 5000);
        }
      } catch (err) {
        console.error("Bundle error:", err);
        if (isMounted) {
          setIsLoading(false);
          onError?.(err instanceof Error ? err : new Error(String(err)));
        }
      }
    };

    bundleAndRender();

    return () => {
      isMounted = false;
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("cleanup-preview", handleCleanup);
      if (iframeRef.current) iframeRef.current.srcdoc = "";
    };
  }, [debouncedCode, isInitializing, hasError]);

  return (
    <ErrorBoundary onError={onError}>
      <div className="relative w-full h-full">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/30 z-10">
            <div className="text-sm text-muted-foreground">Loading preview...</div>
          </div>
        )}
        {resourceError && (
          <div className="absolute top-0 left-0 right-0 bg-amber-50 border-b border-amber-200 p-2 text-amber-800 text-sm flex items-center gap-2 z-20">
            <AlertTriangle className="h-4 w-4" />
            <span>{resourceError}</span>
          </div>
        )}
        <iframe
          ref={iframeRef}
          className={cn("w-full h-full border-0", className)}
          sandbox="allow-scripts"
          srcDoc={htmlContent}
          title="Component Preview"
          onLoad={() => {
            console.log("iframe onLoad triggered");
            setIsLoading(false);
          }}
        />
      </div>
    </ErrorBoundary>
  );
}