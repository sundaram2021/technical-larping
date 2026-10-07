import { tool, zodSchema } from 'ai';
import { z } from 'zod';

const inMemoryScratchpad = new Map<string, { value: string; updatedAt: string }>();

export const scratchpadTool = tool({
  description: 'Manage the agent working memory and scratchpad notes to store findings, maintain multi-step plans, or recall notes. Can be called concurrently with other tools in the same turn.',
  inputSchema: zodSchema(
    z.object({
      action: z.enum(['write', 'read', 'list', 'delete', 'clear']).describe('Action to perform on memory'),
      key: z.string().optional().describe('Key or topic identifier for note entry'),
      content: z.string().optional().describe('Note text content when writing'),
    })
  ),
  execute: async ({
    action,
    key,
    content,
  }: {
    action: 'write' | 'read' | 'list' | 'delete' | 'clear';
    key?: string;
    content?: string;
  }) => {
    const timestamp = new Date().toLocaleTimeString();

    if (action === 'write') {
      if (!key || content === undefined) {
        return { status: 'recovered', message: 'Both "key" and "content" are recommended to record memory.' };
      }
      inMemoryScratchpad.set(key, { value: content, updatedAt: timestamp });
      return {
        status: 'success',
        action: 'write',
        key,
        message: `Saved entry for "${key}" to scratchpad memory.`,
      };
    }

    if (action === 'read') {
      if (!key) {
        return { status: 'recovered', message: '"key" parameter is needed to read from memory.' };
      }
      const entry = inMemoryScratchpad.get(key);
      if (!entry) {
        return { status: 'recovered', key, message: `No memory found for key "${key}".` };
      }
      return {
        status: 'success',
        action: 'read',
        key,
        content: entry.value,
        updatedAt: entry.updatedAt,
      };
    }

    if (action === 'list') {
      const entries: Array<{ key: string; excerpt: string; updatedAt: string }> = [];
      for (const [k, v] of inMemoryScratchpad.entries()) {
        entries.push({
          key: k,
          excerpt: v.value.length > 80 ? v.value.slice(0, 80) + '...' : v.value,
          updatedAt: v.updatedAt,
        });
      }
      return {
        status: 'success',
        action: 'list',
        totalEntries: entries.length,
        entries,
      };
    }

    if (action === 'delete') {
      if (!key) return { status: 'recovered', message: '"key" is required to delete.' };
      const existed = inMemoryScratchpad.delete(key);
      return {
        status: 'success',
        action: 'delete',
        key,
        message: existed ? `Deleted memory for "${key}".` : `Key "${key}" was not in memory.`,
      };
    }

    if (action === 'clear') {
      inMemoryScratchpad.clear();
      return { status: 'success', action: 'clear', message: 'Scratchpad memory cleared.' };
    }

    return { status: 'recovered', message: 'Unknown action processed gracefully.' };
  },
});
