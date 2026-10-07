'use client';

import React from 'react';
import {
  Globe,
  Terminal,
  Calculator,
  CloudSun,
  TrendingUp,
  Cpu,
  X,
  CheckCircle2,
  Sliders,
} from 'lucide-react';

interface ToolboxModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ToolboxModal: React.FC<ToolboxModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const tools = [
    {
      id: 'webSearch',
      name: 'Web Intelligence & Fact Search',
      icon: Globe,
      color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
      description: 'Performs live multi-index queries across Wikipedia and DuckDuckGo for up-to-date facts, biographies, news, and technical documentations.',
      parameters: ['query: string'],
      status: 'Ready',
    },
    {
      id: 'codeExecution',
      name: 'JavaScript Sandbox Executor',
      icon: Terminal,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      description: 'Executes mathematical algorithms, array transformations, string algorithms, and simulations in a secured isolated runtime with console logs.',
      parameters: ['code: string', 'title?: string'],
      status: 'Ready',
    },
    {
      id: 'calculator',
      name: 'Scientific Math & Unit Converter',
      icon: Calculator,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      description: 'Evaluates trigonometry, logarithms, statistical expressions, exponents, and performs two-way unit conversions (metric, imperial, temperatures, bytes).',
      parameters: ['expression: string', 'unitConversion?: object'],
      status: 'Ready',
    },
    {
      id: 'weatherIntel',
      name: 'Global Weather & Meteorological Intel',
      icon: CloudSun,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      description: 'Retrieves live weather conditions, wind speed, relative humidity, apparent temperatures, and multi-day forecasts for any city across the globe via Open-Meteo.',
      parameters: ['location: string', 'includeDailyForecast?: boolean'],
      status: 'Ready',
    },
    {
      id: 'cryptoMarket',
      name: 'Crypto & Financial Market Ticker',
      icon: TrendingUp,
      color: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
      description: 'Provides live market prices in USD, 24-hour price variations, total market capitalization, and daily trading volumes for cryptocurrencies.',
      parameters: ['tokens: string[]'],
      status: 'Ready',
    },
    {
      id: 'scratchpad',
      name: 'Dynamic Scratchpad Working Memory',
      icon: Cpu,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      description: 'Maintains cross-step persistent working memory during deep reasoning loops, allowing the agent to write, recall, list, and delete scratchpad notes.',
      parameters: ['action: write | read | list | delete | clear', 'key?: string', 'content?: string'],
      status: 'Ready',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 sm:text-base">
                Agent Capability Matrix
              </h2>
              <p className="text-xs text-zinc-400">
                6 Autonomous Tools Activated and Connected
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="max-h-[70vh] overflow-y-auto p-5 space-y-3">
          {tools.map(tool => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.id}
                className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3.5 transition hover:border-zinc-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${tool.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-semibold text-zinc-200 sm:text-sm">
                          {tool.name}
                        </h3>
                        <span className="font-mono text-[10px] text-zinc-500">
                          ({tool.id})
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                        {tool.description}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {tool.parameters.map((param, pIdx) => (
                          <span
                            key={pIdx}
                            className="rounded bg-zinc-900 border border-zinc-800 px-2 py-0.5 font-mono text-[10px] text-indigo-300"
                          >
                            {param}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    {tool.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 bg-zinc-950/40 px-5 py-3 text-right">
          <button
            onClick={onClose}
            className="rounded-lg bg-zinc-800 px-4 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition"
          >
            Close Matrix
          </button>
        </div>
      </div>
    </div>
  );
};
