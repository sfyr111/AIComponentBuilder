"use client";

import React, { useEffect, useState } from "react";
import { useEsbuild } from "../esbuild-provider";
import { useDebounce } from "@/hooks/use-debounce";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Define error types
type ErrorKind = "init" | "compile" | "runtime";
interface ErrorState {
  kind: ErrorKind;
  msg: string;
}

// Get all React hook function names
const REACT_HOOKS = Object.keys(React).filter(k => k.startsWith("use"));
// Other common React APIs
const OTHER_REACT_APIS = ["createContext", "createRef", "forwardRef", "memo", "Fragment"];

export function ReactRenderer({
  jsxCode,
  height = "100%",
}: {
  jsxCode: string;
  height?: string | number;
}) {
  const { transformCode, esbuildService, isInitializing, hasError, retryInitialization } = useEsbuild();
  const debouncedCode = useDebounce(jsxCode, 600);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [UserComponent, setUserComponent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    if (isInitializing || hasError) return;

    let cancelled = false;
    const run = async () => {
      setError(null);
      setLoading(true);
      setUserComponent(null);

      if (!esbuildService) {
        setError({ kind: "init", msg: "Compilation service not initialized" });
        setLoading(false);
        return;
      }

      // Initial validation of user code
      const trimmedCode = debouncedCode.trim();
      if (!trimmedCode.includes("function Component")) {
        setError({ 
          kind: "compile", 
          msg: "Code must include a function named 'Component'" 
        });
        setLoading(false);
        return;
      }

      try {
        // Transform JSX using esbuild
        const { code: jsCode, error: compileErr } = await transformCode(debouncedCode);
        
        if (compileErr) {
          setError({ kind: "compile", msg: compileErr });
          setLoading(false);
          return;
        }

        try {
          // Build parameter names array (React object and all hooks/APIs)
          const paramNames = ["React", ...REACT_HOOKS, ...OTHER_REACT_APIS];
          // Build parameter values array
          const paramValues = [
            React, 
            ...REACT_HOOKS.map(hook => React[hook as keyof typeof React]), 
            ...OTHER_REACT_APIS.map(api => React[api as keyof typeof React])
          ];
          
          // Use Function constructor to evaluate code
          const createComponent = new Function(
            ...paramNames,
            `
              "use strict";
              // User code starts
              ${jsCode}
              // User code ends
              
              // Validate component exists
              if (typeof Component !== 'function') {
                throw new Error("Could not find a function named 'Component'");
              }
              
              return Component;
            `
          );
          
          // Call function with our imported React
          const ComponentFn = createComponent(...paramValues) as React.ComponentType;
          
          if (!cancelled) {
            setUserComponent(() => ComponentFn);
          }
        } catch (evalError: unknown) {
          console.error("Component evaluation error:", evalError);
          setError({ kind: "runtime", msg: `Evaluation error: ${evalError instanceof Error ? evalError.message : String(evalError)}` });
        }
      } catch (e: unknown) {
        console.error("Compilation/evaluation error:", e);
        setError({ kind: "runtime", msg: e instanceof Error ? e.message : String(e) });
      } finally {
        setLoading(false);
      }
    };

    run();
    
    // Cleanup function
    return () => {
      cancelled = true;
      setUserComponent(null);
      setError(null);
      setLoading(false);
    };
  }, [debouncedCode, esbuildService, isInitializing, hasError, transformCode]);

  // --- UI state rendering ---
  if (isInitializing) {
    return <StateBox height={height} icon={Loader2} spinning text="Initializing compilation environment..." />;
  }
  if (hasError) {
    return <ErrorBox height={height} text="Failed to initialize compilation environment" onRetry={retryInitialization} />;
  }
  if (loading) {
    return <StateBox height={height} icon={Loader2} spinning text="Compiling / loading..." />;
  }
  if (error) {
    return (
      <ErrorBox
        height={height}
        text={error.msg}
        onRetry={() => {
          if (error.kind === "init") retryInitialization();
          else setError(null);
        }}
      />
    );
  }
  if (!UserComponent) {
    return (
      <div className="flex flex-col items-center justify-center bg-background rounded-md border" style={{ height }}>
        <Code2 className="h-10 w-10 text-muted-foreground opacity-50 mb-2" />
        <p className="text-sm text-muted-foreground text-center">
          Enter React component code<br />to preview here
        </p>
      </div>
    );
  }

  // Success: render React component
  try {
    return (
      <div className="bg-background rounded-md border p-4 overflow-auto" style={{ height }}>
        <UserComponent />
      </div>
    );
  } catch (renderError: unknown) {
    console.error("Render error:", renderError);
    return (
      <ErrorBox
        height={height}
        text={`Render error: ${renderError instanceof Error ? renderError.message : String(renderError)}`}
        onRetry={() => setError(null)}
      />
    );
  }
}

function StateBox({
  height,
  icon: Icon,
  spinning,
  text,
}: {
  height: string | number;
  icon: React.ElementType;
  spinning?: boolean;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center bg-background rounded-md border" style={{ height }}>
      <Icon className={cn("h-7 w-7 text-muted-foreground", spinning && "animate-spin")} />
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function ErrorBox({
  height,
  text,
  onRetry,
}: {
  height: string | number;
  text: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-4 bg-background rounded-md border" style={{ height }}>
      <Alert variant="destructive" className="mb-3 w-full max-w-xs">
        <AlertTitle>{text}</AlertTitle>
      </Alert>
      <Button variant="outline" onClick={onRetry} className="flex items-center gap-2">
        <RefreshCw className="h-4 w-4" />
        Retry
      </Button>
    </div>
  );
}