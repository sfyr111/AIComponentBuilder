"use client";

import React, { useState, useCallback } from "react";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatMessages, Message } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import { CanvasSidebar } from "@/components/canvas/canvas-sidebar";

// Default code sample for the editor
const DEFAULT_CODE = `
import React, { useState, useEffect } from 'react';

const CountdownTimer = ({ initialHours = 0, initialMinutes = 0, initialSeconds = 0 }) => {
  const [timeLeft, setTimeLeft] = useState({
    hours: initialHours,
    minutes: initialMinutes,
    seconds: initialSeconds
  });

  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval = null;

    if (isActive) {
      interval = setInterval(() => {
        setTimeLeft(prevTime => {
          const { hours, minutes, seconds } = prevTime;
          
          if (hours === 0 && minutes === 0 && seconds === 0) {
            clearInterval(interval);
            setIsActive(false);
            return prevTime;
          }

          if (seconds > 0) {
            return { ...prevTime, seconds: seconds - 1 };
          } else if (minutes > 0) {
            return { hours, minutes: minutes - 1, seconds: 59 };
          } else {
            return { hours: hours - 1, minutes: 59, seconds: 59 };
          }
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive]);

  const startTimer = () => {
    setIsActive(true);
  };

  const pauseTimer = () => {
    setIsActive(false);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft({
      hours: initialHours,
      minutes: initialMinutes,
      seconds: initialSeconds
    });
  };

  const formatTime = (time) => {
    return time < 10 ? \`0\${time}\` : time;
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gray-100 rounded-lg shadow-md">
      <div className="flex space-x-4 mb-6">
        <div className="flex flex-col items-center">
          <span className="text-5xl font-bold text-gray-800">
            {formatTime(timeLeft.hours)}
          </span>
          <span className="text-sm text-gray-500">Hours</span>
        </div>
        <span className="text-5xl font-bold text-gray-800">:</span>
        <div className="flex flex-col items-center">
          <span className="text-5xl font-bold text-gray-800">
            {formatTime(timeLeft.minutes)}
          </span>
          <span className="text-sm text-gray-500">Minutes</span>
        </div>
        <span className="text-5xl font-bold text-gray-800">:</span>
        <div className="flex flex-col items-center">
          <span className="text-5xl font-bold text-gray-800">
            {formatTime(timeLeft.seconds)}
          </span>
          <span className="text-sm text-gray-500">Seconds</span>
        </div>
      </div>

      <div className="flex space-x-4">
        {!isActive ? (
          <button
            onClick={startTimer}
            className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
          >
            Start
          </button>
        ) : (
          <button
            onClick={pauseTimer}
            className="px-6 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
          >
            Pause
          </button>
        )}
        <button
          onClick={resetTimer}
          className="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default CountdownTimer;
`;

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [code, setCode] = useState(DEFAULT_CODE);
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
        <CanvasSidebar code={code} onChange={setCode} />
      </div>
    </div>
  );
}