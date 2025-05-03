"use client";

import React, { useState } from "react";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatMessages, Message } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import { CanvasSidebar } from "@/components/canvas/canvas-sidebar";

// Default code sample for the editor
const DEFAULT_CODE = `function Component() {
  const [count, setCount] = useState(0);
  const [text, setText] = useState("");
  
  // Show event handling and state updates
  const handleIncrement = () => {
    setCount(prev => prev + 1);
  };
  
  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-blue-600">
        Example Component
      </h1>
      
      <div className="mb-4 p-3 bg-gray-100 rounded-md">
        <p className="mb-2">Current count: <span className="font-bold">{count}</span></p>
        <button 
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md"
          onClick={handleIncrement}
        >
          Increment
        </button>
      </div>
      
      <div className="mb-4">
        <label className="block mb-1 text-sm">Input text:</label>
        <input 
          className="w-full border p-2 rounded-md" 
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type something..."
        />
        {text && (
          <p className="mt-2 text-sm text-gray-600">
            You typed: {text}
          </p>
        )}
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        {["Red", "Green", "Blue"].map((color, index) => (
          <div 
            key={index}
            className="p-2 text-center rounded-md"
            style={{ 
              backgroundColor: 
                color === "Red" ? "#fee2e2" : 
                color === "Green" ? "#dcfce7" : "#dbeafe"
            }}
          >
            {color}
          </div>
        ))}
      </div>
    </div>
  );
}`;

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [code, setCode] = useState(DEFAULT_CODE);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    
    // In a real implementation, you would call the AI API here
    // For now, just simulate a response
    setIsLoading(true);
    
    setTimeout(() => {
      const assistantMessage: Message = {
        role: "assistant",
        content: DEFAULT_CODE,
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
      setCode(DEFAULT_CODE);
      setInput("");
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-dvh">
      <ChatHeader />
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
        <CanvasSidebar code={code} onChange={setCode} />
      </div>
    </div>
  );
}