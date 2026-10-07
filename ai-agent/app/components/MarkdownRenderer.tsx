'use client';

import React, { useState } from 'react';
import { Copy, Check, CheckSquare, Square } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);

  const copyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIdx(idx);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  // Helper to parse inline elements: bold, italic, strikethrough, inline code, links
  const renderInline = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    while (remaining.length > 0) {
      // Inline code: `code`
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        parts.push(
          <code
            key={keyIdx++}
            className="rounded bg-zinc-800/90 border border-zinc-700/60 px-1.5 py-0.5 text-xs font-mono text-indigo-300"
          >
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // Bold + Italic: ***text***
      const boldItalicMatch = remaining.match(/^(\*\*\*|___)(.+?)\1/);
      if (boldItalicMatch) {
        parts.push(
          <strong key={keyIdx++} className="font-bold italic text-zinc-100">
            {renderInline(boldItalicMatch[2])}
          </strong>
        );
        remaining = remaining.slice(boldItalicMatch[0].length);
        continue;
      }

      // Bold: **text** or __text__
      const boldMatch = remaining.match(/^(\*\*|__)(.+?)\1/);
      if (boldMatch) {
        parts.push(
          <strong key={keyIdx++} className="font-semibold text-zinc-100">
            {renderInline(boldMatch[2])}
          </strong>
        );
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      // Italic: *text* or _text_
      const italicMatch = remaining.match(/^(\*|_)(.+?)\1/);
      if (italicMatch && !italicMatch[2].startsWith(' ')) {
        parts.push(
          <em key={keyIdx++} className="italic text-zinc-200">
            {renderInline(italicMatch[2])}
          </em>
        );
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      // Strikethrough: ~~text~~
      const strikeMatch = remaining.match(/^~~(.+?)~~/);
      if (strikeMatch) {
        parts.push(
          <del key={keyIdx++} className="line-through text-zinc-400">
            {renderInline(strikeMatch[1])}
          </del>
        );
        remaining = remaining.slice(strikeMatch[0].length);
        continue;
      }

      // Link: [text](url)
      const linkMatch = remaining.match(/^\[(.*?)\]\((.*?)\)/);
      if (linkMatch) {
        parts.push(
          <a
            key={keyIdx++}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition"
          >
            {linkMatch[1]}
          </a>
        );
        remaining = remaining.slice(linkMatch[0].length);
        continue;
      }

      // Search for next delimiter
      const nextSpecial = remaining.search(/[`*_~\[]/);
      if (nextSpecial === -1) {
        parts.push(remaining);
        break;
      } else if (nextSpecial === 0) {
        parts.push(remaining[0]);
        remaining = remaining.slice(1);
      } else {
        parts.push(remaining.slice(0, nextSpecial));
        remaining = remaining.slice(nextSpecial);
      }
    }

    return parts;
  };

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let blockKey = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced Code Block: ```lang
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim() || 'plaintext';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].trim().startsWith('```')) {
        i++; // skip closing ```
      }
      const fullCode = codeLines.join('\n');
      const curIdx = blockKey++;

      elements.push(
        <div key={curIdx} className="my-3 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/90 shadow-lg">
          <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/60 px-3.5 py-1.5 text-xs text-zinc-400">
            <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">{lang}</span>
            <button
              onClick={() => copyCode(fullCode, curIdx)}
              className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
              title="Copy code"
            >
              {copiedCodeIdx === curIdx ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className="overflow-x-auto p-3.5 text-xs font-mono text-zinc-200 leading-relaxed">
            <code>{fullCode}</code>
          </pre>
        </div>
      );
      continue;
    }

    // Horizontal Rule: --- or *** or ___
    if (/^\s*([-*_]\s*){3,}$/.test(line.trim())) {
      elements.push(<hr key={blockKey++} className="my-5 border-zinc-800" />);
      i++;
      continue;
    }

    // Table: line containing |
    if (line.trim().startsWith('|') && line.includes('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].includes('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const parseRowCells = (rowText: string) => {
          let cleaned = rowText.trim();
          if (cleaned.startsWith('|')) cleaned = cleaned.slice(1);
          if (cleaned.endsWith('|')) cleaned = cleaned.slice(0, -1);
          return cleaned.split('|').map(c => c.trim());
        };

        const headerCells = parseRowCells(tableLines[0]);
        // Delimiter line check (row 1 is |---|---|)
        const isDelimiter = /^\|?\s*:?-+:?\s*(\|?\s*:?-+:?\s*)*\|?$/.test(tableLines[1]);
        const bodyLines = isDelimiter ? tableLines.slice(2) : tableLines.slice(1);

        elements.push(
          <div key={blockKey++} className="my-4 overflow-x-auto rounded-xl border border-zinc-800 shadow-md">
            <table className="min-w-full divide-y divide-zinc-800 text-left text-xs sm:text-sm">
              <thead className="bg-zinc-900/90">
                <tr>
                  {headerCells.map((col, cIdx) => (
                    <th key={cIdx} className="px-4 py-2.5 font-semibold text-zinc-200 border-b border-zinc-800 whitespace-nowrap">
                      {renderInline(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/50">
                {bodyLines.map((rowText, rIdx) => {
                  const cells = parseRowCells(rowText);
                  return (
                    <tr key={rIdx} className="hover:bg-zinc-900/40 transition">
                      {cells.map((cell, cIdx) => (
                        <td key={cIdx} className="px-4 py-2.5 text-zinc-300">
                          {renderInline(cell)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // Headings: # to ######
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('#')) {
      const match = trimmedLine.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2];
        i++;

        switch (level) {
          case 1:
            elements.push(
              <h1 key={blockKey++} className="mt-6 mb-3 text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 pb-2 border-b border-zinc-800">
                {renderInline(text)}
              </h1>
            );
            break;
          case 2:
            elements.push(
              <h2 key={blockKey++} className="mt-5 mb-2.5 text-lg sm:text-xl font-bold tracking-tight text-zinc-100 pb-1.5 border-b border-zinc-800/70">
                {renderInline(text)}
              </h2>
            );
            break;
          case 3:
            elements.push(
              <h3 key={blockKey++} className="mt-4 mb-2 text-base sm:text-lg font-semibold tracking-tight text-zinc-200">
                {renderInline(text)}
              </h3>
            );
            break;
          case 4:
            elements.push(
              <h4 key={blockKey++} className="mt-3 mb-1.5 text-sm sm:text-base font-semibold text-zinc-300">
                {renderInline(text)}
              </h4>
            );
            break;
          default:
            elements.push(
              <h5 key={blockKey++} className="mt-2.5 mb-1 text-xs sm:text-sm font-semibold text-zinc-400">
                {renderInline(text)}
              </h5>
            );
            break;
        }
        continue;
      }
    }

    // Blockquote: > text
    if (trimmedLine.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      elements.push(
        <blockquote key={blockKey++} className="my-3 border-l-4 border-indigo-500/80 bg-zinc-900/40 rounded-r-xl px-4 py-2 text-xs sm:text-sm text-zinc-300 italic leading-relaxed">
          {quoteLines.map((ql, qIdx) => (
            <p key={qIdx}>{renderInline(ql)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    // Task List item: - [ ] or - [x]
    if (/^[-*+]\s+\[([ xX])\]\s+(.*)$/.test(trimmedLine)) {
      const taskMatch = trimmedLine.match(/^[-*+]\s+\[([ xX])\]\s+(.*)$/)!;
      const isChecked = taskMatch[1].toLowerCase() === 'x';
      const text = taskMatch[2];
      elements.push(
        <div key={blockKey++} className="my-1.5 flex items-center gap-2 text-xs sm:text-sm text-zinc-200">
          {isChecked ? (
            <CheckSquare className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <Square className="h-4 w-4 text-zinc-500 shrink-0" />
          )}
          <span className={isChecked ? 'line-through text-zinc-400' : ''}>
            {renderInline(text)}
          </span>
        </div>
      );
      i++;
      continue;
    }

    // Unordered List item: - or * or +
    if (/^[-*+]\s+(.*)$/.test(trimmedLine)) {
      const listItems: string[] = [];
      while (i < lines.length && /^[-*+]\s+(.*)$/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^[-*+]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={blockKey++} className="my-2.5 list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-zinc-300 leading-relaxed">
          {listItems.map((item, lIdx) => (
            <li key={lIdx}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered List item: 1. 2. etc.
    if (/^\d+\.\s+(.*)$/.test(trimmedLine)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s+(.*)$/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={blockKey++} className="my-2.5 list-decimal pl-5 space-y-1.5 text-xs sm:text-sm text-zinc-300 leading-relaxed">
          {listItems.map((item, lIdx) => (
            <li key={lIdx}>{renderInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Empty line
    if (!trimmedLine) {
      elements.push(<div key={blockKey++} className="h-2" />);
      i++;
      continue;
    }

    // Regular paragraph line
    elements.push(
      <p key={blockKey++} className="my-1 text-xs sm:text-sm text-zinc-200 leading-relaxed">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-1 font-sans break-words">{elements}</div>;
};
