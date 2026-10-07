'use client';

import React, { useState } from 'react';
import { User, Bot, Copy, Check } from 'lucide-react';
import { ToolCallCard } from './ToolCallCard';
import { ThinkingCard } from './ThinkingCard';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatMessageProps {
  message: {
    id: string;
    role: string;
    content?: string;
    parts?: any[];
  };
  isLastAssistant?: boolean;
  isStreaming?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isLastAssistant,
  isStreaming,
}) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const parts = message.parts || (message.content ? [{ type: 'text', text: message.content }] : []);

  const handleCopy = () => {
    let fullText = '';
    for (const part of parts) {
      if (part.type === 'text') fullText += part.text + '\n';
    }
    if (!fullText && message.content) fullText = message.content;
    navigator.clipboard.writeText(fullText.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`group flex w-full gap-3 py-3 sm:gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Assistant Avatar */}
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 via-violet-500/20 to-sky-500/20 border border-indigo-500/30 text-indigo-400">
          <Bot className="h-4 w-4" />
        </div>
      )}

      {/* Message Content Container */}
      <div className={`flex flex-col max-w-[88%] sm:max-w-[80%] ${isUser ? 'items-end' : 'items-start w-full'}`}>
        {/* User Bubble */}
        {isUser ? (
          <div className="rounded-2xl rounded-tr-sm bg-indigo-600/90 px-4 py-2.5 text-sm text-white shadow-lg backdrop-blur-sm border border-indigo-500/30">
            <p className="whitespace-pre-wrap leading-relaxed">{message.content || parts.map(p => p.text).join('')}</p>
          </div>
        ) : (
          /* Assistant Box */
          <div className="w-full rounded-2xl rounded-tl-sm border border-zinc-800/80 bg-zinc-900/40 p-4 shadow-xl backdrop-blur-md">
            {/* Parts Stream */}
            <div className="space-y-3">
              {parts.map((part, index) => {
                // Reasoning / Thinking part
                if (part.type === 'reasoning') {
                  return (
                    <ThinkingCard
                      key={`reasoning-${index}`}
                      thinkingText={part.text || part.reasoning || ''}
                      isStreaming={isLastAssistant && isStreaming}
                    />
                  );
                }

                // Dynamic Tool Call Part
                if (part.type === 'dynamic-tool') {
                  return (
                    <ToolCallCard
                      key={`tool-${part.toolCallId || index}`}
                      toolName={part.toolName}
                      toolCallId={part.toolCallId}
                      state={part.state}
                      input={part.input}
                      output={part.output}
                      errorText={part.errorText}
                    />
                  );
                }

                // Static Tool Call Part (`tool-${name}`)
                if (typeof part.type === 'string' && part.type.startsWith('tool-')) {
                  const toolName = part.type.replace(/^tool-/, '');
                  return (
                    <ToolCallCard
                      key={`tool-${part.toolCallId || index}`}
                      toolName={toolName}
                      toolCallId={part.toolCallId}
                      state={part.state}
                      input={part.input}
                      output={part.output}
                      errorText={part.errorText}
                    />
                  );
                }

                // Text Part
                if (part.type === 'text' && part.text) {
                  return (
                    <div key={`text-${index}`} className="text-zinc-200">
                      <MarkdownRenderer content={part.text} />
                    </div>
                  );
                }

                return null;
              })}
            </div>

            {/* Message Action Footer */}
            <div className="mt-3 flex items-center justify-between border-t border-zinc-800/50 pt-2 text-xs text-zinc-500">
              <span className="text-[11px]">
                {parts.filter(p => p.type === 'dynamic-tool' || (typeof p.type === 'string' && p.type.startsWith('tool-'))).length > 0 &&
                  `${parts.filter(p => p.type === 'dynamic-tool' || (typeof p.type === 'string' && p.type.startsWith('tool-'))).length} tool actions executed`}
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
                title="Copy response"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
};
