import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatInputProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}

export function ChatInput({ input, handleInputChange, handleSubmit, isLoading }: ChatInputProps) {
  return (
    <div className="p-4 border-t">
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-3"
      >
        <Input
          value={input}
          onChange={handleInputChange}
          placeholder="Describe the React component you want to create..."
          className="flex-1"
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Generating..." : "Generate Component"}
        </Button>
      </form>
    </div>
  );
}