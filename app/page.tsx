"use client";

import React, { useState, useCallback, useMemo } from "react";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatMessages, Message } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import { CanvasSidebar } from "@/components/canvas/canvas-sidebar";

export default function HomePage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const extractCodeFromResponse = useCallback((text: string): string | null => {
    const match = text.match(/```(?:jsx|tsx|javascript|js|react)?(?:\[COMPONENT.*?\])\n([\s\S]+?)```/);
    return match?.[1]?.trim() || null;
  }, []);

  const extractComponentMetadata = useCallback((text: string): Record<string, unknown> | null => {
    try {
      const match = text.match(/```(?:jsx|tsx|js)?(?:\[COMPONENT:(\{.*?\})\])/);
      return match ? JSON.parse(match[1]) : null;
    } catch (err) {
      console.error("Failed to parse metadata:", err);
      return null;
    }
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    let receivedNewCode = false;
    let accumulated = '';
    let assistantMessage: Message = { role: 'assistant', content: '' };
    
    // Add placeholder for assistant message
    setMessages(prev => [...prev, assistantMessage]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(({ role, content }) => ({ role, content })),
          systemPrompt: 'You are an expert React developer assistant. Help users create beautiful and functional React components. When asked to create a component, provide working code wrapped in ```jsx[COMPONENT]...``` blocks using Tailwind CSS.',
          model: 'deepseek-v3-250324',
          provider: 'ark',
        }),
      });

      if (!response.body) {
        throw new Error("No response body");
      }
      
      // Process streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let done = false;
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        
        if (value) {
          const decodedChunk = decoder.decode(value, { stream: true });
          
          // Process SSE format
          const lines = decodedChunk.split('\n\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = line.substring(6);
                if (data === '[DONE]') continue;
                
                const parsed = JSON.parse(data);
                const text = parsed.text || '';
                
                // Update accumulated response
                accumulated += text;
                
                // Update the assistant message with accumulated response
                assistantMessage = { ...assistantMessage, content: accumulated };
                setMessages(prev => [...prev.slice(0, -1), assistantMessage]);
                
                // Check if we've received code and update the editor
                const extractedCode = extractCodeFromResponse(accumulated);
                if (extractedCode) {
                  receivedNewCode = true;
                  setCode(extractedCode);
                  
                  const metadata = extractComponentMetadata(accumulated);
                  if (metadata) {
                    console.log("Component metadata:", metadata);
                  }
                }
              } catch {
                // Ignore parsing errors
              }
            }
          }
        }
      }

      if (!receivedNewCode) {
        console.log("No code block detected - clearing canvas");
        setCode("");
      }
    } catch (err) {
      console.error("Submission error:", err);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, isLoading, extractCodeFromResponse, extractComponentMetadata]);

  const handleCodeChange = useCallback((val: string) => setCode(val), []);

  const memoizedCanvas = useMemo(() => (
    <CanvasSidebar code={code} onChange={handleCodeChange} />
  ), [code, handleCodeChange]);

  return (
    <div className="flex flex-col h-dvh">
      <div className="flex justify-between items-center px-4 py-2 border-b">
        <ChatHeader title="AI React Component Generator" />
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <ChatMessages messages={messages} isLoading={isLoading} />
          <ChatInput 
            input={input} 
            handleInputChange={handleInputChange} 
            handleSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </div>
        {memoizedCanvas}
      </div>
    </div>
  );
}