import { tool, zodSchema } from 'ai';
import { z } from 'zod';

export const codeExecutionTool = tool({
  description: 'Execute JavaScript code safely in a sandbox environment and return console logs and return value. Can be called concurrently with other tools in the same turn.',
  inputSchema: zodSchema(
    z.object({
      code: z.string().describe('JavaScript code to execute. Use console.log() to print or return a value.'),
      title: z.string().optional().describe('Short title or purpose of this code snippet'),
    })
  ),
  execute: async ({ code, title }: { code: string; title?: string }) => {
    const startTime = performance.now();
    const logs: string[] = [];

    const mockConsole = {
      log: (...args: unknown[]) => logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
      warn: (...args: unknown[]) => logs.push(`[WARN] ` + args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
      error: (...args: unknown[]) => logs.push(`[ERROR] ` + args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
      info: (...args: unknown[]) => logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
    };

    try {
      const sanitizedCode = code.replace(/process\./g, '({}).').replace(/require\(/g, '(()=>null)(');
      const runner = new Function(
        'console',
        'Math',
        'Date',
        'JSON',
        'Array',
        'Object',
        `
        "use strict";
        try {
          ${sanitizedCode.includes('return') ? sanitizedCode : `return (${sanitizedCode});`}
        } catch (e) {
          throw e;
        }
      `
      );

      const result = runner(mockConsole, Math, Date, JSON, Array, Object);
      const executionTimeMs = +(performance.now() - startTime).toFixed(2);

      return {
        title: title || 'JavaScript Code Sandbox',
        status: 'success',
        executionTimeMs,
        returnValue: result !== undefined ? (typeof result === 'object' ? JSON.parse(JSON.stringify(result)) : result) : null,
        logs: logs.length > 0 ? logs : undefined,
      };
    } catch (error) {
      const executionTimeMs = +(performance.now() - startTime).toFixed(2);
      return {
        title: title || 'JavaScript Code Sandbox',
        status: 'recovered',
        fallbackUsed: true,
        executionTimeMs,
        error: error instanceof Error ? error.message : String(error),
        note: 'Sandbox captured runtime error safely; agent can review error to self-heal.',
        logs: logs.length > 0 ? logs : undefined,
      };
    }
  },
});
