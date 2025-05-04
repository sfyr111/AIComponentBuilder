"use client";

import React, { useEffect, useRef } from "react";
import { CodeEditor } from "./code-editor";
import { CodePreview } from "./code-preview";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsClient } from "@/hooks/use-client";

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
  
  const isOpen = propIsOpen !== undefined ? propIsOpen : false;

  useEffect(() => {
    if (prevActiveTabRef.current === "preview" && activeTab === "code") {
      window.dispatchEvent(new CustomEvent("cleanup-preview"));
    }
    prevActiveTabRef.current = activeTab;
  }, [activeTab]);

  if (!isClient || !isOpen) return null;

  return (
    <div className="w-1/2 md:w-3/5 xl:w-2/3 2xl:w-3/4 border-l h-full flex flex-col">
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