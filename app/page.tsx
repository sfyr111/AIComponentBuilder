"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatMessages, Message } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import { CanvasSidebar } from "@/components/canvas/canvas-sidebar";
import { uploadImageToTOS } from "@/lib/tos-upload";

// Default example code with function call examples
const DEFAULT_COMPONENT = ``;

const IMAGE_PROMPT = `
You are an expert React developer who creates beautiful, responsive UI components.

I'm showing you a UI design image. Please:

1. Describe what you see in this image, focusing on UI elements, layout, and design.

2. Provide a detailed analysis for implementing this as a React component:
   - Component hierarchy and structure needed
   - State management requirements
   - Props that would be needed
   - CSS approach recommendation (Tailwind, styled-components, etc.)
   - Interactive elements and event handlers
   - Responsiveness considerations
   - Accessibility recommendations

3. Highlight any potential implementation challenges.

Your detailed analysis will be used for React code generation, so be specific and thorough in your descriptions.
`;

export default function HomePage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [code, setCode] = useState(DEFAULT_COMPONENT);
  const [isLoading, setIsLoading] = useState(false);
  const [isCanvasOpen, setIsCanvasOpen] = useState(!!DEFAULT_COMPONENT.trim());
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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

  const handleImageChange = useCallback((imageUrl: string | null) => {
    console.log("Image URL:", imageUrl);
    setSelectedImage(imageUrl);
  }, []);
  
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (isLoading) return;
      
      let imageFile: File | null = null;

      if (e.clipboardData && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith('image/')) {
          imageFile = file;
        }
      } else if (e.clipboardData && e.clipboardData.items) {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
              imageFile = file;
              break;
            }
          }
        }
      }

      if (imageFile) {
        const localImageUrl = URL.createObjectURL(imageFile);
        setSelectedImage(localImageUrl);
        
        const uploadedUrl = await uploadImageToTOS(imageFile);
        if (uploadedUrl) {
          setSelectedImage(uploadedUrl);
        } else {
          console.error("Paste upload failed");
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [isLoading]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMessage: Message = { 
      role: "user", 
      content: input,
      ...(selectedImage ? { imageUrl: selectedImage } : {})
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setSelectedImage(null);
    setIsLoading(true);

    let analysisContent = '';
    
    // Step 1: If an image is present, call image analysis API first
    if (selectedImage) {
      try {
        const analysisResponse = await fetch("/api/image-analyze", {
          method: "POST",
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl: selectedImage,
            prompt: IMAGE_PROMPT
          }),
        });
        
        if (!analysisResponse.ok) {
          throw new Error(`Image analysis failed: ${analysisResponse.status}`);
        }
        
        const analysisData = await analysisResponse.json();
        analysisContent = analysisData.description || '';
      } catch (error) {
        console.error("Image analysis error:", error);
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: "Sorry, image analysis failed. Please try again." },
        ]);
        setIsLoading(false);
        return;
      }
    }

    // Step 2: Generate code based on text input + analysis
    let receivedNewCode = false;
    let accumulatedResponse = '';
    let assistantMessage: Message = { role: 'assistant', content: '' };
    
    setMessages(prev => [...prev, assistantMessage]);

    try {
      let systemPrompt = 'You are an expert React developer assistant. Help users create beautiful and functional React components using Tailwind CSS.';
      
      if (analysisContent) {
        systemPrompt += '\n\nBased on the following component analysis, implement a React component that matches the description:\n\n' + analysisContent;
      }
      
      systemPrompt += '\n\nWhen creating a component, provide working code wrapped in ```jsx[COMPONENT]...``` blocks.';

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: input || 'Generate the component based on the analysis.' }],
          systemPrompt: systemPrompt,
          model: 'deepseek-v3-250324',
          provider: 'ark',
        }),
      });

      if (!response.body) {
        throw new Error("No response body");
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let done = false;
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        
        if (value) {
          const decodedChunk = decoder.decode(value, { stream: true });
          
          const lines = decodedChunk.split('\n\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = line.substring(6);
                if (data === '[DONE]') continue;
                
                const parsed = JSON.parse(data);
                const text = parsed.text || '';
                
                accumulatedResponse += text;
                
                assistantMessage = { ...assistantMessage, content: accumulatedResponse };
                setMessages(prev => [...prev.slice(0, -1), assistantMessage]);
                
                const extractedCode = extractCodeFromResponse(accumulatedResponse);
                if (extractedCode) {
                  receivedNewCode = true;
                  setCode(extractedCode);
                  setIsCanvasOpen(true);
                  
                  const metadata = extractComponentMetadata(accumulatedResponse);
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

      if (analysisContent) {
        assistantMessage = { ...assistantMessage, analysisDetails: analysisContent };
        setMessages(prev => [...prev.slice(0, -1), assistantMessage]);
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
      setSelectedImage(null);
    }
  }, [input, messages, isLoading, selectedImage, extractCodeFromResponse, extractComponentMetadata]);

  const handleCodeChange = useCallback((val: string) => setCode(val), []);

  const handleCanvasOpenChange = useCallback((isOpen: boolean) => {
    setIsCanvasOpen(isOpen);
  }, []);

  const handleClearChat = useCallback(() => {
    setMessages([]);
    setSelectedImage(null);
    setCode(DEFAULT_COMPONENT);
    setInput("");
    setIsCanvasOpen(false);
    // No need to manually clear uploadStatus here, handled in ChatInput effect
  }, [DEFAULT_COMPONENT]);

  const memoizedCanvas = useMemo(() => (
    <CanvasSidebar 
      code={code} 
      onChange={handleCodeChange} 
      isOpen={isCanvasOpen}
      onOpenChange={handleCanvasOpenChange}
    />
  ), [code, handleCodeChange, isCanvasOpen, handleCanvasOpenChange]);

  return (
    <div className="flex flex-col h-dvh">
      <div className="flex justify-between items-center px-4 py-2 border-b">
        <ChatHeader 
          title="AI React Component Generator"
          isCanvasOpen={isCanvasOpen}
          onCanvasOpenChange={handleCanvasOpenChange}
        />
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className={`flex-1 min-w-[25%] flex flex-col overflow-hidden ${isCanvasOpen ? 'max-w-[50%] md:max-w-[50%] xl:max-w-[50%] 2xl:max-w-[50%]' : ''}`}>
          <ChatMessages messages={messages} isLoading={isLoading} />
          <ChatInput 
            input={input} 
            handleInputChange={handleInputChange} 
            handleSubmit={handleSubmit}
            isLoading={isLoading}
            selectedImage={selectedImage}
            onImageChange={handleImageChange}
            onClearChat={handleClearChat}
          />
        </div>
        {memoizedCanvas}
      </div>
    </div>
  );
}