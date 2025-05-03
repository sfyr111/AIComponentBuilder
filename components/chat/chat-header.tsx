import React from "react";

interface ChatHeaderProps {
  title?: string;
}

export function ChatHeader({ title = "Chat With Canvas" }: ChatHeaderProps) {
  return <h1 className="text-xl font-medium">{title}</h1>;
}