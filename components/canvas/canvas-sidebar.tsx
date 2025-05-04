"use client";

import React, { useEffect, useRef, useState } from "react";
import { CodeEditor } from "./code-editor";
import { CodePreview } from "./code-preview";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsClient } from "@/hooks/use-client";
import { Copy, Check, Undo2, Redo2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CanvasSidebarProps {
  code: string;
  onChange: (value: string) => void;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

export function CanvasSidebar({ 
  code, 
  onChange, 
  isOpen: propIsOpen,
}: CanvasSidebarProps) {
  const isClient = useIsClient();
  const [activeTab, setActiveTab] = React.useState("code");
  const prevActiveTabRef = useRef(activeTab);
  const [isCopied, setIsCopied] = useState(false);
  const [codeHistory, setCodeHistory] = useState<string[]>([code]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [renderError, setRenderError] = useState<string | null>(null);
  
  const isOpen = propIsOpen !== undefined ? propIsOpen : false;

  // Track code changes for undo/redo
  useEffect(() => {
    if (code !== codeHistory[historyIndex]) {
      const newHistory = codeHistory.slice(0, historyIndex + 1);
      newHistory.push(code);
      setCodeHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [code, codeHistory, historyIndex]);

  useEffect(() => {
    if (prevActiveTabRef.current === "preview" && activeTab === "code") {
      window.dispatchEvent(new CustomEvent("cleanup-preview"));
    }
    prevActiveTabRef.current = activeTab;
  }, [activeTab]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code: ", err);
      alert("Failed to copy code to clipboard");
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      onChange(codeHistory[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < codeHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      onChange(codeHistory[newIndex]);
    }
  };

  useEffect(() => {
    setRenderError(null);
  }, [code, activeTab]);

  const handlePreviewError = (error: Error) => {
    console.log("Preview error:", error.message);
    setRenderError(error.message || "Unknown rendering error");
    if (activeTab !== "preview") {
      setActiveTab("preview");
    }
  };

  if (!isClient || !isOpen) return null;

  return (
    <div className="w-1/2 md:w-3/5 xl:w-3/5 2xl:w-3/5 border-l h-full flex flex-col">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-col h-full"
      >
        <div className="p-3 border-b flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="code">Code</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            {activeTab === "code" && (
              <>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  title="Undo"
                  className="h-8 w-8"
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleRedo}
                  disabled={historyIndex >= codeHistory.length - 1}
                  title="Redo"
                  className="h-8 w-8"
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={copyCode}
                  className="h-8 gap-1"
                >
                  {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {isCopied ? "Copied" : "Copy"}
                </Button>
              </>
            )}
          </div>
        </div>

        <TabsContent value="code" className="flex-1 overflow-hidden">
          <CodeEditor code={code} onChange={onChange} />
        </TabsContent>
        <TabsContent value="preview" className="flex-1 overflow-hidden relative">
          {renderError ? (
            <div className="p-4 border rounded m-4 bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200">
              <h3 className="font-semibold mb-2">Render Error:</h3>
              <pre className="whitespace-pre-wrap text-sm font-mono overflow-auto max-h-[500px]">
                {renderError}
              </pre>
            </div>
          ) : (
            <div className="h-full">
              <CodePreview 
                jsxCode={code} 
                onError={handlePreviewError}
                key={code}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}