'use client';

import React, { useState } from 'react';
import {
  Globe,
  Terminal,
  Calculator,
  CloudSun,
  TrendingUp,
  Cpu,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Code,
  RotateCw,
} from 'lucide-react';

interface ToolCallCardProps {
  toolName: string;
  toolCallId: string;
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error' | string;
  input?: any;
  output?: any;
  errorText?: string;
}

export const ToolCallCard: React.FC<ToolCallCardProps> = ({
  toolName,
  state,
  input,
  output,
  errorText,
}) => {
  const isCompleted = state === 'output-available';
  const isError = state === 'output-error' || !!errorText;
  const isRecovered = isCompleted && (output?.status === 'recovered' || output?.fallbackUsed === true);
  const isRunning = !isCompleted && !isError;

  // Track user manual toggle; if null, auto-open while running and auto-close when completed
  const [userToggled, setUserToggled] = useState<boolean | null>(null);
  const isOpen = userToggled !== null ? userToggled : isRunning;

  const getToolMeta = (name: string) => {
    switch (name.toLowerCase()) {
      case 'websearch':
        return {
          label: 'Web Search',
          icon: Globe,
          color: 'text-sky-400',
          borderColor: 'border-sky-500/30',
          badgeBg: 'bg-sky-500/10 text-sky-400',
        };
      case 'codeexecution':
        return {
          label: 'Code Sandbox',
          icon: Terminal,
          color: 'text-emerald-400',
          borderColor: 'border-emerald-500/30',
          badgeBg: 'bg-emerald-500/10 text-emerald-400',
        };
      case 'calculator':
        return {
          label: 'Math & Units',
          icon: Calculator,
          color: 'text-amber-400',
          borderColor: 'border-amber-500/30',
          badgeBg: 'bg-amber-500/10 text-amber-400',
        };
      case 'weatherintel':
        return {
          label: 'Weather Intel',
          icon: CloudSun,
          color: 'text-cyan-400',
          borderColor: 'border-cyan-500/30',
          badgeBg: 'bg-cyan-500/10 text-cyan-400',
        };
      case 'cryptomarket':
        return {
          label: 'Market Ticker',
          icon: TrendingUp,
          color: 'text-violet-400',
          borderColor: 'border-violet-500/30',
          badgeBg: 'bg-violet-500/10 text-violet-400',
        };
      case 'scratchpad':
        return {
          label: 'Scratchpad Memory',
          icon: Cpu,
          color: 'text-purple-400',
          borderColor: 'border-purple-500/30',
          badgeBg: 'bg-purple-500/10 text-purple-400',
        };
      default:
        return {
          label: toolName,
          icon: Wrench,
          color: 'text-zinc-400',
          borderColor: 'border-zinc-700/50',
          badgeBg: 'bg-zinc-800 text-zinc-300',
        };
    }
  };

  const meta = getToolMeta(toolName);
  const Icon = meta.icon;

  const handleToggle = () => {
    setUserToggled(!isOpen);
  };

  return (
    <div className={`my-2 overflow-hidden rounded-xl border ${meta.borderColor} bg-zinc-900/70 text-xs backdrop-blur-sm transition`}>
      {/* Tool Header Bar */}
      <button
        onClick={handleToggle}
        className="flex w-full items-center justify-between px-3.5 py-2.5 hover:bg-zinc-800/50 transition text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className={`flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-800/90 ${meta.color}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="font-semibold tracking-wide text-zinc-200">
            {meta.label}
          </span>
          <span className="text-[11px] text-zinc-500 font-mono">
            {toolName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isRunning && (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Executing
            </span>
          )}
          {isCompleted && !isRecovered && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Completed
            </span>
          )}
          {isRecovered && (
            <span className="flex items-center gap-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-[10px] font-medium text-cyan-300">
              <RotateCw className="h-2.5 w-2.5" />
              Backup Recovered
            </span>
          )}
          {isError && (
            <span className="flex items-center gap-1 rounded-full bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[10px] font-medium text-rose-400">
              <AlertCircle className="h-3 w-3" />
              Failed
            </span>
          )}
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-zinc-500" />
          )}
        </div>
      </button>

      {/* Expanded Details: open while running, auto-closes when completed */}
      {isOpen && (
        <div className="border-t border-zinc-800/80 bg-zinc-950/60 p-3 space-y-2.5 font-mono">
          {/* Input Parameters */}
          {input !== undefined && (
            <div>
              <div className="mb-1 flex items-center gap-1 text-[11px] font-medium text-zinc-400">
                <Code className="h-3 w-3 text-zinc-500" />
                Parameters
              </div>
              <pre className="max-h-48 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950/80 p-2 text-[11px] leading-relaxed text-zinc-300">
                {typeof input === 'object' ? JSON.stringify(input, null, 2) : String(input)}
              </pre>
            </div>
          )}

          {/* Output / Result */}
          {isCompleted && output !== undefined && (
            <div>
              <div className="mb-1 flex items-center gap-1 text-[11px] font-medium text-emerald-400/90">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                Tool Output
              </div>
              <pre className="max-h-56 overflow-auto rounded-lg border border-emerald-950/50 bg-zinc-950/90 p-2 text-[11px] leading-relaxed text-zinc-200">
                {typeof output === 'object' ? JSON.stringify(output, null, 2) : String(output)}
              </pre>
            </div>
          )}

          {/* Error Message */}
          {isError && (
            <div className="rounded-lg border border-rose-900/50 bg-rose-950/20 p-2 text-rose-400">
              <span className="font-semibold">Error: </span>
              {errorText || 'Tool execution encountered an issue.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
