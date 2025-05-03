"use client";

import React, { useState, useCallback } from "react";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatMessages, Message } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import { CanvasSidebar } from "@/components/canvas/canvas-sidebar";

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Extract code from AI response
  const extractCodeFromResponse = (text: string): string | null => {
    // Look for code blocks with ```jsx or ```javascript
    const codeBlockRegex = /```(?:jsx|javascript|react|js|tsx|ts)?\n([\s\S]*?)```/;
    const match = text.match(codeBlockRegex);
    
    if (match && match[1]) {
      return match[1].trim();
    }
    
    return null;
  };

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Add user message
    const userMessage: Message = {
      role: "user",
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    
    try {
      // Send request to API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          systemPrompt: 'You are an expert React developer assistant. Help users create beautiful and functional React components. When asked to create a component, provide working code wrapped in ```jsx code blocks that can be easily copied. Use modern React practices and Tailwind CSS for styling.',
          model: 'deepseek-v3-250324',
          provider: 'ark',
        }),
      });
      
      if (!response.body) {
        throw new Error('Response body is empty');
      }
      
      // Process streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let accumulatedResponse = '';
      let assistantMessage: Message = { role: 'assistant', content: '' };
      
      // Add placeholder for assistant message
      setMessages(prev => [...prev, assistantMessage]);
      
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
                accumulatedResponse += text;
                
                // Update the assistant message with accumulated response
                assistantMessage = { ...assistantMessage, content: accumulatedResponse };
                setMessages(prev => [...prev.slice(0, -1), assistantMessage]);
                
                // Check if we've received code and update the editor
                const extractedCode = extractCodeFromResponse(accumulatedResponse);
                if (extractedCode) {
                  setCode(extractedCode);
                }
              } catch {
                // Ignore parsing errors
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, there was an error generating the component. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, isLoading]);

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
        <CanvasSidebar 
          code={code} 
          onChange={setCode} 
        />
      </div>
    </div>
  );
}