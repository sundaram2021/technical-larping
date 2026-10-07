'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Header } from './components/Header';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import {
  Bot,
  Terminal,
  Globe,
  Calculator,
  CloudSun,
  TrendingUp,
  Cpu,
  AlertCircle,
  Sparkles,
  Loader2,
  RotateCw,
  Play,
  X,
} from 'lucide-react';

export default function Home() {
  const [input, setInput] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [dismissedError, setDismissedError] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const transport = React.useMemo(() => {
    return new DefaultChatTransport({
      api: '/api/chat',
    });
  }, []);

  const {
    messages,
    sendMessage,
    stop,
    status,
    error,
    regenerate,
    clearError,
    setMessages,
  } = useChat({
    transport,
  });

  const isStreaming = status === 'submitted' || status === 'streaming';
  const hasMessages = messages.length > 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // When an error happens, initiate autonomous auto-recovery countdown
  useEffect(() => {
    if (error && !dismissedError) {
      setRetryCountdown(4);
    } else {
      setRetryCountdown(null);
    }
  }, [error, dismissedError]);

  // Autonomous countdown effect
  useEffect(() => {
    if (retryCountdown === null || retryCountdown <= 0) return;

    const timer = setTimeout(() => {
      if (retryCountdown === 1) {
        setRetryCountdown(null);
        handleRetry();
      } else {
        setRetryCountdown(retryCountdown - 1);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [retryCountdown]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    setIsPaused(false);
    setDismissedError(false);
    setRetryCountdown(null);
    if (error) clearError();
    setInput('');
    sendMessage({ text: trimmed });
  };

  const handlePause = () => {
    setIsPaused(true);
    setRetryCountdown(null);
    stop();
  };

  const handleContinue = () => {
    if (isStreaming) return;
    setIsPaused(false);
    setDismissedError(false);
    setRetryCountdown(null);
    if (error) clearError();
    sendMessage({ text: 'Please continue directly from where you left off.' });
  };

  const handleRetry = () => {
    setDismissedError(false);
    setRetryCountdown(null);
    clearError();
    regenerate();
  };

  const handleDismissNotice = () => {
    setRetryCountdown(null);
    setDismissedError(true);
  };

  const handleNewChat = () => {
    if (isStreaming) {
      stop();
    }
    setIsPaused(false);
    setDismissedError(false);
    setRetryCountdown(null);
    clearError();
    setMessages([]);
    setInput('');
  };

  return (
    <div className="flex h-screen w-full flex-col bg-zinc-950 text-zinc-100 antialiased overflow-hidden font-sans">
      {/* Header Bar */}
      <Header
        status={status}
        onNewChat={handleNewChat}
        isStreaming={isStreaming}
      />

      {/* Main Chat Scroll Area */}
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-4xl min-h-full flex flex-col justify-between">
          {/* Welcome Screen when Empty */}
          {!hasMessages ? (
            <div className="my-auto flex flex-col items-center justify-center text-center py-12 px-4">
              <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 via-violet-500/20 to-sky-500/20 border border-indigo-500/30 text-indigo-400 shadow-2xl">
                <Bot className="h-8 w-8" />
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] text-black font-bold">
                  <Sparkles className="h-2.5 w-2.5" />
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
                Nexus Autonomous Agent
              </h2>
              <p className="mt-2 max-w-md text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Empowered with 6 specialized tools to search the web, execute code in sandboxes, evaluate scientific mathematics, stream weather forecasts, track live market assets, and maintain reasoning scratchpad memory. Supports parallel multi-tool execution with automatic fault recovery.
              </p>

              {/* Tool Badges Grid */}
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full max-w-lg">
                {[
                  { name: 'Web Search', icon: Globe, color: 'text-sky-400 border-sky-500/20' },
                  { name: 'Code Sandbox', icon: Terminal, color: 'text-emerald-400 border-emerald-500/20' },
                  { name: 'Math & Units', icon: Calculator, color: 'text-amber-400 border-amber-500/20' },
                  { name: 'Weather Intel', icon: CloudSun, color: 'text-cyan-400 border-cyan-500/20' },
                  { name: 'Crypto Markets', icon: TrendingUp, color: 'text-violet-400 border-violet-500/20' },
                  { name: 'Scratchpad Memory', icon: Cpu, color: 'text-purple-400 border-purple-500/20' },
                ].map((t, idx) => {
                  const Icon = t.icon;
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 rounded-xl border ${t.color} bg-zinc-900/60 p-2.5 text-xs text-zinc-300 backdrop-blur-sm`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="font-medium truncate">{t.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Active Message List */
            <div className="space-y-4 pb-4">
              {messages.map((message, idx) => (
                <ChatMessage
                  key={message.id || idx}
                  message={message}
                  isLastAssistant={!isStreaming && idx === messages.length - 1 && message.role === 'assistant'}
                  isStreaming={isStreaming && idx === messages.length - 1 && message.role === 'assistant'}
                />
              ))}

              {/* Active Thinking Indicator with Spinner */}
              {isStreaming && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex items-center gap-3 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-xs text-zinc-300">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400 shrink-0" />
                    <span>Nexus Agent is executing tools in parallel and synthesizing...</span>
                  </div>
                </div>
              )}

              {/* Autonomous Resilient Recovery Banner */}
              {error && !dismissedError && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 my-2 shadow-lg backdrop-blur-sm">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
                    <div>
                      <span className="font-semibold text-zinc-100">Resilient Recovery Mode: </span>
                      <span className="text-zinc-300">
                        {retryCountdown !== null
                          ? `Auto-recovering session in ${retryCountdown}s...`
                          : 'Gateway response interrupted. Auto-recovery system ready.'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={handleRetry}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-600/40 hover:bg-indigo-600/60 border border-indigo-500/40 px-2.5 py-1 text-xs font-medium text-indigo-200 transition"
                      title="Retry immediately"
                    >
                      <RotateCw className="h-3 w-3" />
                      <span>Retry Now</span>
                    </button>
                    <button
                      onClick={handleContinue}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 px-2.5 py-1 text-xs font-medium text-emerald-200 transition"
                      title="Continue from current state"
                    >
                      <Play className="h-3 w-3" />
                      <span>Continue</span>
                    </button>
                    <button
                      onClick={handleDismissNotice}
                      className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
                      title="Dismiss notice"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* Fixed Bottom Input Area */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950/90 pt-3">
        <ChatInput
          input={input}
          setInput={setInput}
          onSubmit={handleSubmit}
          onPause={handlePause}
          onContinue={handleContinue}
          isStreaming={isStreaming}
          isPaused={isPaused}
        />
      </footer>
    </div>
  );
}
