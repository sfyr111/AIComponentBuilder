"use client";

import React, { useEffect, useRef, useState } from "react";
import { CodeEditor } from "./code-editor";
import { CodePreview } from "./code-preview";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsClient } from "@/hooks/use-client";

interface CanvasSidebarProps {
  code: string;
  onChange: (value: string) => void;
}

export function CanvasSidebar({ code, onChange }: CanvasSidebarProps) {
  const isClient = useIsClient();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("code");
  const prevActiveTabRef = useRef(activeTab);

  useEffect(() => {
    const hasCode = !!code.trim();
    setOpen(hasCode);
  }, [code]);

  useEffect(() => {
    if (prevActiveTabRef.current === "preview" && activeTab === "code") {
      window.dispatchEvent(new CustomEvent("cleanup-preview"));
    }
    prevActiveTabRef.current = activeTab;
  }, [activeTab]);

  if (!isClient || !open) return null;

  return (
    <div className="w-[min(50vw,640px)] border-l h-full flex flex-col">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-col h-full"
      >
        <div className="p-3 border-b flex items-center">
          <TabsList>
            <TabsTrigger value="code">Code</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="code" className="flex-1 overflow-hidden">
          <CodeEditor code={code} onChange={onChange} />
        </TabsContent>
        <TabsContent value="preview" className="flex-1 overflow-hidden">
          <CodePreview jsxCode={code} />
        </TabsContent>
      </Tabs>
    </div>
  );
}