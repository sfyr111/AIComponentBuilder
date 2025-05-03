import React from "react";
import { cn } from "@/lib/utils";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading?: boolean;
}

// A simple function to convert code blocks to HTML
function formatMessageContent(content: string): React.ReactNode {
  // Split content to find code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);
  
  return (
    <>
      {parts.map((part, i) => {
        // Check if it's a code block
        if (part.startsWith('```') && part.endsWith('```')) {
          // Extract code and language (if any)
          const match = part.match(/```(?:([a-zA-Z0-9]+))?\n([\s\S]*?)```/);
          
          if (match) {
            const [, , code] = match;
            return (
              <pre key={i} className="bg-gray-800 text-gray-200 p-3 rounded-md my-2 overflow-x-auto">
                <code>{code}</code>
              </pre>
            );
          }
        }
        
        // Handle regular text (convert newlines to <br>)
        return (
          <span key={i} className="whitespace-pre-wrap">
            {part}
          </span>
        );
      })}
    </>
  );
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when messages change
  React.useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {messages.map((message, index) => (
        <div
          key={index}
          className={cn(
            "mb-4 flex",
            message.role === "user" ? "justify-end" : "justify-start"
          )}
        >
          <div
            className={cn(
              "max-w-[80%] rounded-lg p-3",
              message.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            )}
          >
            {formatMessageContent(message.content)}
          </div>
        </div>
      ))}
      {isLoading && (
        <div className="flex justify-start mb-4">
          <div className="bg-muted max-w-[80%] rounded-lg p-3">
            <div className="flex gap-2">
              <div className="h-2 w-2 bg-current rounded-full animate-bounce"></div>
              <div className="h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}