"use client";

import { useState, useRef, useEffect } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Code, Eye } from "lucide-react";
import { CodeEditor } from "@/components/canvas/code-editor";
import { CodePreview } from "@/components/canvas/code-preview";

interface CanvasSidebarProps {
  code: string;
  onChange: (code: string) => void;
}

export function CanvasSidebar({ code, onChange }: CanvasSidebarProps) {
  const [open, setOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("code");
  const prevActiveTabRef = useRef(activeTab);
  
  // Listen for tab changes, clean up resources when switching from Preview to Code
  useEffect(() => {
    if (prevActiveTabRef.current === "preview" && activeTab === "code") {
      // When switching from preview to code, trigger a cleanup event
      const event = new CustomEvent('cleanup-preview');
      window.dispatchEvent(event);
    }
    prevActiveTabRef.current = activeTab;
  }, [activeTab]);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="border-l transition-all duration-300 shrink-0 h-full"
      style={{ width: open ? "50%" : "40px" }}
    >
      <div className="flex h-full">
        <CollapsibleTrigger asChild>
          <div className="flex items-center h-full border-r">
            <Button variant="ghost" size="icon" className="h-full rounded-none w-10">
              {open ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent
          className="flex-1 h-full data-[state=open]:animate-none"
          forceMount
          style={{ 
            visibility: open ? "visible" : "hidden", 
            width: open ? "calc(100% - 40px)" : "0",
            height: "100%",
            display: "flex",
            flexDirection: "column"
          }}
        >
          <Tabs defaultValue="code" className="flex flex-col h-full" onValueChange={setActiveTab} style={{ height: "100%" }}>
            <div className="p-3 border-b flex items-center">
              <TabsList>
                <TabsTrigger value="code">
                  <Code className="h-4 w-4 mr-2" />
                  Code
                </TabsTrigger>
                <TabsTrigger value="preview">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent 
              value="code" 
              className="flex-1 p-0 m-0 flex flex-col" 
              style={{ height: "calc(100% - 48px)" }}
            >
              <div className="flex-1 flex flex-col" style={{ height: "100%" }}>
                <div className="flex-1 p-4" style={{ height: "100%" }}>
                  <CodeEditor code={code} onChange={onChange} />
                </div>
              </div>
            </TabsContent>

            <TabsContent 
              value="preview" 
              className="flex-1 p-0 m-0" 
              style={{ height: "calc(100% - 48px)" }}
            >
              <div className="p-4 h-full">
                <div className="h-full rounded-md p-4 overflow-auto bg-[#1e1e1e]">
                  <CodePreview jsxCode={code} />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}