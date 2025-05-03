"use client";

import React from "react";
import { Code2 } from "lucide-react";

interface CodePreviewProps {
  jsxCode: string;
}

export function CodePreview({ jsxCode }: CodePreviewProps) {
  // This is just a placeholder - you'll implement the actual code rendering later
  return (
    <div className="flex flex-col items-center justify-center bg-background rounded-md border h-full">
      <Code2 className="h-10 w-10 text-muted-foreground opacity-50 mb-2" />
      <p className="text-sm text-muted-foreground text-center">
        Preview will be implemented in the next phase.<br />
        This will render React components from the code editor.
      </p>
    </div>
  );
}