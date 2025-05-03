"use client";

import React, { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import { useEsbuild } from "../esbuild-provider";
import { useDebounce } from "@/hooks/use-debounce";

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
  const { transformCode, isInitializing, hasError } = useEsbuild();
  const debouncedCode = useDebounce(jsxCode, 500);

  useEffect(() => {
    if (!debouncedCode || !iframeRef.current) return;
    if (isInitializing) {
      console.log("ESBuild is still initializing...");
      return;
    }
    
    if (hasError) {
      console.error("ESBuild initialization error");
      onError?.(new Error("Failed to initialize code compiler"));
      return;
    }

    // Reset states
    setIsLoading(true);
    setResourceError(null);
    
    const compileAndRender = async () => {
      try {
        console.log("Transforming code with esbuild...");
        const { code: compiledCode, error } = await transformCode(debouncedCode);
        
        if (error) {
          console.error("Compilation error:", error);
          onError?.(new Error(error));
          return;
        }
        
        console.log("Compilation successful:", compiledCode.substring(0, 100) + "...");
        
        // Create a complete HTML document with React and ReactDOM
        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>React Sandbox</title>
              <script>
                // Track resource loading errors
                window.addEventListener('error', function(e) {
                  if (e.target && (e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK')) {
                    const msg = 'Resource loading error: ' + (e.target.src || e.target.href);
                    window.parent.postMessage({ type: 'resourceError', error: msg }, '*');
                    e.preventDefault();
                  }
                }, true);
              </script>
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
                // Make React hooks available in global scope
                const { 
                  useState, 
                  useEffect, 
                  useRef, 
                  useContext, 
                  useReducer, 
                  useCallback, 
                  useMemo, 
                  useLayoutEffect 
                } = React;
                
                // Mark resources as loaded
                window.parent.postMessage({ type: 'loaded' }, '*');
                
                // Error handling function
                window.onerror = function(message, source, lineno, colno, error) {
                  const rootEl = document.getElementById('root');
                  rootEl.innerHTML = \`
                    <div id="sandbox-error">
                      <p style="font-weight: 500;">Runtime Error</p>
                      <pre style="margin-top: 0.5rem; font-size: 0.875rem; overflow: auto; white-space: pre-wrap;">
                        \${message}
                        At: \${source} (\${lineno}:\${colno})
                      </pre>
                    </div>
                  \`;
                  window.parent.postMessage({ type: 'error', error: message }, '*');
                  return true;
                };

                try {
                  ${compiledCode}
                  
                  // Render component with ReactDOM
                  try {
                    const root = ReactDOM.createRoot(document.getElementById('root'));
                    root.render(React.createElement(Component));
                  } catch (renderError) {
                    window.parent.postMessage({ 
                      type: 'error', 
                      error: 'Rendering error: ' + renderError.message,
                      stack: renderError.stack
                    }, '*');
                    throw renderError;
                  }
                } catch (error) {
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
          </html>
        `;
        
        // Update the HTML content
        setHtmlContent(html);
      } catch (err) {
        console.error("Error compiling code:", err);
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    };

    compileAndRender();

    // Setup message listener
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

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [debouncedCode, transformCode, isInitializing, hasError, onError]);

  return (
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
        sandbox="allow-scripts allow-popups allow-same-origin"
        srcDoc={htmlContent}
        title="React Preview"
      />
    </div>
  );
}