import { webSearchTool } from './web-search';
import { codeExecutionTool } from './code-execution';
import { calculatorTool } from './calculator';
import { weatherIntelTool } from './weather';
import { cryptoMarketTool } from './crypto';
import { scratchpadTool } from './scratchpad';

export {
  webSearchTool,
  codeExecutionTool,
  calculatorTool,
  weatherIntelTool,
  cryptoMarketTool,
  scratchpadTool,
};

export const agentTools = {
  webSearch: webSearchTool,
  codeExecution: codeExecutionTool,
  calculator: calculatorTool,
  weatherIntel: weatherIntelTool,
  cryptoMarket: cryptoMarketTool,
  scratchpad: scratchpadTool,
};
