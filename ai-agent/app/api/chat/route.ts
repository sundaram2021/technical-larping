import { createGateway, streamText, convertToModelMessages, stepCountIs } from 'ai';
import { agentTools } from '@/app/lib/tools';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const getModelPool = () => {
  const envModel = (process.env.VERCEL_AI_GATEWAY_MODEL_NAME || '').replace(/^['"]|['"]$/g, '').trim();

  // If user specified an alternative working model (excluding restricted muse-spark on free tier), prioritize it
  if (envModel && !envModel.toLowerCase().includes('muse-spark')) {
    return [envModel, 'openai/gpt-4o', 'openai/gpt-4o-mini', 'openai/gpt-3.5-turbo'];
  }

  // Resilient model failover pool: primary gpt-4o (high capacity) -> gpt-4o-mini -> gpt-3.5-turbo
  return ['openai/gpt-4o', 'openai/gpt-4o-mini', 'openai/gpt-3.5-turbo'];
};

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const apiKey = process.env.VERCEL_AI_API_KEY || process.env.AI_GATEWAY_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing VERCEL_AI_API_KEY in environment variables.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const gateway = createGateway({ apiKey });
    const modelPool = getModelPool();

    // Normalize messages for convertToModelMessages
    const normalizedMessages = (messages || []).map((msg: any) => {
      if (msg.parts && Array.isArray(msg.parts)) {
        return msg;
      }
      return {
        ...msg,
        parts: [{ type: 'text', text: msg.content || '' }],
      };
    });

    const modelMessages = await convertToModelMessages(normalizedMessages);

    const systemPrompt = `You are Nexus Agent, an autonomous research, computation, and intelligence AI agent.
You have access to 6 specialized operational tools:
1. webSearch: Look up live facts, articles, documentation, current events.
2. codeExecution: Run JavaScript/TypeScript snippets safely in a sandbox environment to calculate or transform data.
3. calculator: Evaluate scientific math, logarithms, trigonometry, and unit conversions.
4. weatherIntel: Fetch real-time weather and forecasts for any city/region worldwide.
5. cryptoMarket: Check live financial token prices, 24h market trends, market cap, and volume.
6. scratchpad: Record temporary findings, maintain reasoning notes, or retrieve memory across steps.

CRITICAL PARALLEL TOOL EXECUTION RULES (MANDATORY):
1. PARALLEL SAME-TYPE TOOL CALLS:
   - When a request requires data for multiple entities of the same type (e.g. "What is the weather in Tokyo and Paris?", "Compare weather for Tokyo, London, and New York", "Search for React 19 features and Next.js 15 features"), you MUST emit ALL tool calls in PARALLEL in a SINGLE TURN.
   - Example: Emit both \`weatherIntel(location: "Tokyo")\` and \`weatherIntel(location: "Paris")\` concurrently in your very first step.
2. PARALLEL DIFFERENT-TYPE TOOL CALLS:
   - When a request requires multiple different capabilities (e.g. "Get weather in Tokyo, check Bitcoin price, and calculate 2^16", "Search for AI news and run a math calculation"), you MUST execute all different tools in PARALLEL in the SAME TURN.
   - Example: Emit \`weatherIntel\`, \`cryptoMarket\`, and \`calculator\` simultaneously in the same step.
3. NO SEQUENTIAL DELAYS:
   - Never call tools one after another sequentially across multiple steps when their parameters can be determined upfront.
   - Calling all tools in parallel executes them concurrently, minimizing gateway round trips and ensuring fast, resilient responses.

Operational Guidelines:
- Think step by step. When executing tasks that need facts, calculation, live data, or code validation, use your tools proactively.
- Never use emojis in your responses. Always use professional, structured formatting (markdown headings, tables, bullet points, clean code blocks).
- Format all final outputs cleanly in GitHub-flavored Markdown (README style) with clear headers, tables, task lists, and syntax-highlighted code blocks.
- When asked to continue, pick up seamlessly and directly from where you left off without repeating previously generated parts.
- Be concise, accurate, and direct.`;

    // Resilient model failover loop
    let lastError: any = null;

    for (const modelName of modelPool) {
      try {
        const selectedModel = gateway(modelName);

        const result = streamText({
          model: selectedModel,
          system: systemPrompt,
          messages: modelMessages,
          tools: agentTools,
          stopWhen: stepCountIs(5),
          maxRetries: 3,
        });

        return result.toUIMessageStreamResponse({
          onError: (streamErr: any) => {
            console.warn(`[Stream Notice] Model ${modelName} stream issue:`, streamErr?.message || streamErr);
            if (streamErr?.message?.includes('Rate limit') || streamErr?.message?.includes('429')) {
              return 'Gateway rate limit reached. Auto-recovery system active.';
            }
            return streamErr?.message || 'Agent gateway stream notice: Auto-recovery active.';
          },
        });
      } catch (err: any) {
        lastError = err;
        console.warn(`[Failover] Model ${modelName} initialization error:`, err?.message);
        // Fall back to next model in failover pool
      }
    }

    throw lastError || new Error('All models in failover pool failed.');
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Internal Agent Route Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
