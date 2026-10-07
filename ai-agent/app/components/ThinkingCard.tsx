'use client';

import React, { useState } from 'react';
import { Brain, Loader2, ChevronDown, ChevronRight } from 'lucide-react';

interface ThinkingCardProps {
  thinkingText: string;
  isStreaming?: boolean;
}

export const ThinkingCard: React.FC<ThinkingCardProps> = ({
  thinkingText,
  isStreaming = false,
}) => {
  const [userToggled, setUserToggled] = useState<boolean | null>(null);

  if (!thinkingText && !isStreaming) return null;

  // Automatically open while thinking, automatically collapse when done unless user toggled
  const isOpen = userToggled !== null ? userToggled : isStreaming;

  return (
    <div className="my-2.5 overflow-hidden rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-950/20 via-zinc-900/60 to-zinc-950/40 text-xs backdrop-blur-sm">
      <button
        onClick={() => setUserToggled(!isOpen)}
        className="flex w-full items-center justify-between px-3.5 py-2 hover:bg-violet-950/30 transition text-left"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-violet-500/20 text-violet-400">
            <Brain className="h-3.5 w-3.5" />
          </div>
          <span className="font-semibold text-violet-200">
            Chain of Thought Reasoning
          </span>
          {isStreaming && (
            <span className="flex items-center gap-1.5 text-[10px] text-violet-400">
              <Loader2 className="h-3 w-3 animate-spin text-violet-400" />
              <span>Thinking...</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-zinc-500">
          <span className="text-[10px] text-zinc-400">
            {thinkingText ? `${thinkingText.length} chars` : 'Processing'}
          </span>
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-violet-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-violet-400" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-violet-900/30 bg-zinc-950/70 p-3 text-zinc-300 font-mono text-[11px] leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
          {thinkingText || 'Analyzing user prompt and planning tool execution sequence...'}
        </div>
      )}
    </div>
  );
};
