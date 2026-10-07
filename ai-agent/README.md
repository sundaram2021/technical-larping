# Nexus AI Agent

An autonomous research, computation, and intelligence AI agent built with **Next.js 16**, **React 19**, and the **Vercel AI SDK**. Nexus Agent features parallel multi-tool calling, autonomous multi-step reasoning, dynamic thinking visualization, and automatic error recovery.

---

## ✨ Features

- **Autonomous Multi-Step Reasoning**: Capable of chaining thoughts and actions across multiple turns to solve complex tasks.
- **Parallel Tool Execution**: Concurrently dispatches same-type and multi-type tool queries (e.g., comparing weather across multiple cities or fetching search and crypto data simultaneously) in a single step.
- **6 Specialized Operational Tools**:
  1. 🌐 **Web Search**: Live search queries and information retrieval.
  2. 💻 **Code Sandbox**: Safe JavaScript/TypeScript execution for computing and data processing.
  3. 🧮 **Scientific Calculator & Unit Converter**: Math, trigonometry, logarithms, and unit conversions.
  4. 🌤️ **Weather Intel**: Global real-time weather and forecast lookups.
  5. 📈 **Crypto Markets**: Live token prices, 24h market trends, market cap, and volume metrics.
  6. 🧠 **Scratchpad Memory**: Inter-step agent memory for recording findings, hypotheses, and scratch notes.
- **Rich Interactive UI**:
  - Live collapsible thinking process cards
  - Real-time tool execution cards with formatted inputs and JSON/tabular outputs
  - Markdown message rendering with syntax highlighting
  - Auto-recovery countdown with retry mechanism
  - Pause, continue, and regenerate controls
- **Resilient AI Gateway Integration**: Uses Vercel AI Gateway with a robust fallback model pool (`openai/gpt-4o`, `openai/gpt-4o-mini`, `openai/gpt-3.5-turbo`).

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+) or [Bun](https://bun.sh/)
- A [Vercel AI Gateway](https://vercel.com/docs/ai/ai-gateway) API Key

### 1. Installation

```bash
cd ai-agent
npm install
# or
bun install
```

### 2. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` to configure your API key:

```env
VERCEL_AI_API_KEY=your_vercel_ai_gateway_api_key_here
VERCEL_AI_GATEWAY_MODEL_NAME=openai/gpt-4o
```

### 3. Run the Development Server

```bash
npm run dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI & Styling**: React 19, Tailwind CSS v4, Lucide React
- **AI SDK**: `@ai-sdk/react`, `ai` (Vercel AI SDK Core)
- **Runtime**: Node.js
