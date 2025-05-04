import React, { useState } from "react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import "github-markdown-css";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

export interface Message {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  analysisDetails?: string;
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading?: boolean;
}

function AnalysisDetails({ details }: { details: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-2 border-b pb-2">
      <Button 
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-xs h-7 mb-2"
      >
        {isOpen ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        {isOpen ? "Hide Analysis" : "Show Analysis"}
      </Button>
      {isOpen && (
        <div 
          className="p-2 rounded bg-secondary/80 dark:bg-secondary/40"
        >
          <MarkdownRenderer 
            content={details} 
            style={{
              fontSize: '12px',
              background: 'var(--bgColor-default)',
              padding: '4px',
            }}
          />
        </div>
      )}
    </div>
  );
}

function MarkdownRenderer({ content, style }: { content: string, style?: React.CSSProperties }) {
  const baseStyle: React.CSSProperties = {
    backgroundColor: 'transparent',
    color: 'inherit',
    fontFamily: 'inherit',
    fontSize: '14px',
  };
  
  const mergedStyle = { ...baseStyle, ...style };

  return (
    <div className="markdown-body" style={mergedStyle}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  
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
            "mb-4 flex text-sm",
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
            {message.imageUrl && (
              <div className="relative aspect-video w-full max-w-xs overflow-hidden rounded-md mb-2">
                <Image 
                  src={message.imageUrl} 
                  alt="Uploaded image" 
                  layout="fill"
                  objectFit="contain"
                  className="bg-muted"
                />
              </div>
            )}
            
            {message.role === "assistant" && message.analysisDetails && (
              <AnalysisDetails details={message.analysisDetails} />
            )}

            {message.role === "assistant" ? (
              <MarkdownRenderer content={message.content} />
            ) : (
              <span className="whitespace-pre-wrap">{message.content}</span>
            )}
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