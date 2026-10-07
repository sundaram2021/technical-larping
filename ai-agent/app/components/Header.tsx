'use client';

import React from 'react';
import { Bot, Plus } from 'lucide-react';

interface HeaderProps {
  status: 'ready' | 'submitted' | 'streaming' | 'error';
  onNewChat: () => void;
  isStreaming: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  onNewChat,
  isStreaming,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        {/* Left: Branding */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 via-violet-500/20 to-sky-500/20 border border-indigo-500/30 text-indigo-400">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-tight text-zinc-100 sm:text-base">
                Nexus Agent
              </h1>
              <span className="rounded-full bg-zinc-800/80 border border-zinc-700/60 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                Muse Spark 1.3
              </span>
            </div>
            <p className="text-xs text-zinc-500 hidden sm:block">
              Autonomous Systems & Research Intelligence
            </p>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* New Chat Button with Plus Icon */}
          <button
            onClick={onNewChat}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800 hover:text-white transition"
            title="Start New Chat"
          >
            <Plus className="h-3.5 w-3.5 text-indigo-400" />
            <span>New Chat</span>
          </button>
        </div>
      </div>
    </header>
  );
};
