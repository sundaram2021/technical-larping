'use client';

import React, { useRef, useEffect } from 'react';
import { Send, Square, Play, Sparkles } from 'lucide-react';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  onPause: () => void;
  onContinue: () => void;
  isStreaming: boolean;
  isPaused: boolean;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  onSubmit,
  onPause,
  onContinue,
  isStreaming,
  isPaused,
  disabled,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && input.trim()) {
        onSubmit();
      }
    }
  };

  const samplePrompts = [
    { label: 'Live Weather', prompt: 'What is the current weather in Tokyo and Paris? Compare them.' },
    { label: 'Market Prices', prompt: 'Get live crypto prices for BTC, ETH, and SOL with 24h change.' },
    { label: 'Run JS Sandbox', prompt: 'Execute JavaScript code to calculate the first 12 Fibonacci numbers and measure execution time.' },
    { label: 'Math & Units', prompt: 'Calculate sqrt(1048576) + 45 * 18, and convert 28 Celsius to Fahrenheit.' },
    { label: 'Web Search', prompt: 'Search the web for the latest advancements in quantum computing.' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4">
      {/* Suggestion Chips */}
      {!input && !isPaused && (
        <div className="mb-3 flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          <span className="flex items-center gap-1 text-[11px] font-medium text-zinc-500 shrink-0">
            <Sparkles className="h-3 w-3 text-indigo-400" />
            Quick Tasks:
          </span>
          {samplePrompts.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInput(item.prompt);
                textareaRef.current?.focus();
              }}
              className="shrink-0 rounded-full border border-zinc-800 bg-zinc-900/80 px-2.5 py-1 text-[11px] text-zinc-300 hover:border-indigo-500/40 hover:bg-zinc-800 hover:text-zinc-100 transition"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Input Box Card */}
      <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/90 shadow-2xl backdrop-blur-xl transition-all focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/30">
        <form onSubmit={onSubmit} className="flex flex-col p-2.5">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isStreaming
                ? 'Agent is executing tools and synthesizing...'
                : isPaused
                ? 'Agent is paused. Click Continue to resume or type a message...'
                : 'Ask Nexus Agent to search, compute, execute code, check weather or markets...'
            }
            disabled={disabled}
            className="w-full resize-none bg-transparent px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none max-h-44 font-sans leading-relaxed"
          />

          <div className="flex items-center justify-between border-t border-zinc-800/60 pt-2 px-1">
            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
              <span className="hidden sm:inline">Press Enter to send, Shift+Enter for new line</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Dynamic Action Button: Red Pause -> Green Continue -> Indigo Send */}
              {isStreaming ? (
                <button
                  type="button"
                  onClick={onPause}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-rose-500 transition shadow-md active:scale-95"
                  title="Pause response"
                >
                  <Square className="h-3 w-3 fill-white" />
                  <span>Pause</span>
                </button>
              ) : isPaused && !input.trim() ? (
                <button
                  type="button"
                  onClick={onContinue}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 transition shadow-md active:scale-95"
                  title="Continue response where it left off"
                >
                  <Play className="h-3 w-3 fill-white" />
                  <span>Continue</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isStreaming || !input.trim() || disabled}
                  className="flex items-center justify-center h-8 w-8 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 transition shadow-md active:scale-95"
                  title="Send message"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
