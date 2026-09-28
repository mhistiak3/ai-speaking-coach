"use client";

import { cn, formatClock } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";

interface MessageBubbleProps {
  message: ChatMessage;
  /** Highlight when this is the newest assistant line. */
  active?: boolean;
  onSpeak?: (text: string) => void;
}

export function MessageBubble({ message, active, onSpeak }: MessageBubbleProps) {
  const isUser = message.role === "user";
  return (
    <div
      className={cn("flex w-full animate-fade-up", isUser ? "justify-end" : "justify-start")}
    >
      <div className={cn("max-w-[85%] sm:max-w-[70%]", isUser && "text-right")}>
        <div
          className={cn(
            "rounded-3xl px-4 py-2.5 text-[15px] leading-relaxed shadow-sm",
            isUser
              ? "btn-solid rounded-br-lg"
              : cn(
                  "glass rounded-bl-lg",
                  active && "ring-1 ring-brand/40",
                ),
          )}
        >
          <span className={isUser ? "text-white" : "text-ink"}>{message.text}</span>
        </div>
        <div
          className={cn(
            "mt-1 flex items-center gap-2 px-1 text-[10px] text-ink-faint",
            isUser ? "justify-end" : "justify-start",
          )}
        >
          <span>{formatClock(message.createdAt)}</span>
          {isUser && message.speechMs != null && message.speechMs > 0 && (
            <span aria-hidden>· {(message.speechMs / 1000).toFixed(1)}s of speech</span>
          )}
          {!isUser && onSpeak && (
            <button
              onClick={() => onSpeak(message.text)}
              className="font-semibold text-brand-2 hover:underline"
            >
              replay
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
