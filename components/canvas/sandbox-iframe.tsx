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

  useEffect(() => {
    if (!debouncedCode || !iframeRef.current) return;
    
    if (isInitializing) {
      console.log("ESBuild initializing...");
      return;
    }
    
    if (hasError) {
      console.error("ESBuild initialization failed");
      onError?.(new Error("Code compiler initialization failed"));
      return;
    }

    // Reset states
    setIsLoading(true);
    setResourceError(null);
    
    // Message handler
    const handleMessage = (event: MessageEvent) => {
      if (event.data) {
        if (event.data.type === 'error') {
          onError?.(new Error(event.data.error));
        } else if (event.data.type === 'resourceError') {
          setResourceError(event.data.error);
          onError?.(new Error(event.data.error));
        } else if (event.data.type === 'loaded') {
          setIsLoading(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    
    const bundleAndRender = async () => {
      try {
        // Use bundleAndTransform to process code
        const iife = await bundleAndTransform(debouncedCode);
        
        // Create HTML template
        const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React Sandbox</title>
    <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4" crossorigin></script>
    <style>
      body { 
        margin: 0; 
        padding: 16px; 
        font-family: system-ui, sans-serif; 
      }
      
      #sandbox-error {
        background-color: #fee2e2;
        border: 1px solid #fecaca;
        border-radius: 0.375rem;
        padding: 1rem;
        margin: 1rem;
        color: #dc2626;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script>
      // Mark resources as loaded
      window.parent.postMessage({ type: 'loaded' }, '*');
      
      // Resource error handling
      window.addEventListener('error', function(e) {
        if (e.target && (e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK')) {
          const msg = 'Resource loading error: ' + (e.target.src || e.target.href);
          window.parent.postMessage({ type: 'resourceError', error: msg }, '*');
          e.preventDefault();
        }
      }, true);
      
      // Global error handling
      window.onerror = function(message, source, lineno, colno, error) {
        window.parent.postMessage({ 
          type: 'error', 
          error: message,
          details: error ? error.stack : null
        }, '*');
        return true;
      };
      
      try {
        // Execute bundled code
        ${iife}
        
        // Check for valid exports
        if (!window.Sandbox || typeof window.Sandbox !== 'object') {
          throw new Error('No valid export object found');
        }
        
        // Find component
        let Component;
        
        // Try to get default export
        if (typeof window.Sandbox.default === 'function') {
          Component = window.Sandbox.default;
          console.log('Using default export as component');
        } else {
          // Try to find first function in exports
          for (const key in window.Sandbox) {
            if (typeof window.Sandbox[key] === 'function') {
              Component = window.Sandbox[key];
              console.log('Using export ' + key + ' as component');
              break;
            }
          }
        }
        
        if (!Component) {
          throw new Error('Cannot find valid React component');
        }
        
        // Use empty props
        const componentProps = {};
        
        // Render component
        console.log('Mounting component');
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(Component, componentProps));
        
        console.log('Component mounted successfully');
      } catch (error) {
        console.error("Rendering error:", error);
        
        const rootEl = document.getElementById('root');
        rootEl.innerHTML = \`
          <div id="sandbox-error">
            <p style="font-weight: 500;">Rendering Error</p>
            <pre style="margin-top: 0.5rem; font-size: 0.875rem; overflow: auto; white-space: pre-wrap;">
              \${error.message}
            </pre>
          </div>
        \`;
        window.parent.postMessage({ type: 'error', error: error.message }, '*');
      }
    </script>
  </body>
</html>`;
        
        // Update iframe content
        setHtmlContent(html);
      } catch (err) {
        console.error("Code compilation error:", err);
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    };

    // Execute bundle and render
    bundleAndRender();

    // Cleanup function
    return () => {
      window.removeEventListener('message', handleMessage);
      if (iframeRef.current) {
        iframeRef.current.srcdoc = '';
      }
    };
  }, [debouncedCode, isInitializing, hasError, onError]);

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
            <span>Resource loading error: {resourceError}</span>
          </div>
        )}
        
        <iframe
          ref={iframeRef}
          className={cn("w-full h-full border-0", className)}
          sandbox="allow-scripts"
          srcDoc={htmlContent}
          title="React Preview"
        />
      </div>
    </ErrorBoundary>
  );
}