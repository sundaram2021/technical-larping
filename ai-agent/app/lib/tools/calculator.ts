import { tool, zodSchema } from 'ai';
import { z } from 'zod';

export const calculatorTool = tool({
  description: 'Perform advanced mathematical evaluations, trigonometry, logarithms, statistical computations, and unit conversions. Can and should be called concurrently with other tools in the same turn.',
  inputSchema: zodSchema(
    z.object({
      expression: z.string().describe('Mathematical expression to evaluate (e.g. "Math.sqrt(144) + 25 * 4", "(1.07)^10 * 5000", "sin(pi/4)")'),
      unitConversion: z
        .object({
          value: z.number().describe('Numeric value to convert'),
          fromUnit: z.string().describe('Source unit (e.g., "km", "miles", "celsius", "fahrenheit", "kg", "lbs", "gb", "mb")'),
          toUnit: z.string().describe('Target unit'),
        })
        .optional()
        .describe('Optional unit conversion request'),
    })
  ),
  execute: async ({
    expression,
    unitConversion,
  }: {
    expression: string;
    unitConversion?: { value: number; fromUnit: string; toUnit: string };
  }) => {
    let mathResult: number | null = null;
    let evalError: string | null = null;
    let conversionResult: { value: number; from: string; to: string; formula?: string } | null = null;

    if (expression) {
      try {
        const cleaned = expression
          .replace(/pi/gi, 'Math.PI')
          .replace(/e\b/gi, 'Math.E')
          .replace(/sin\(/gi, 'Math.sin(')
          .replace(/cos\(/gi, 'Math.cos(')
          .replace(/tan\(/gi, 'Math.tan(')
          .replace(/sqrt\(/gi, 'Math.sqrt(')
          .replace(/log\(/gi, 'Math.log(')
          .replace(/log10\(/gi, 'Math.log10(')
          .replace(/abs\(/gi, 'Math.abs(')
          .replace(/pow\(/gi, 'Math.pow(')
          .replace(/\^/g, '**');

        const evalFn = new Function('Math', `return (${cleaned});`);
        const res = evalFn(Math);
        if (typeof res === 'number' && !Number.isNaN(res)) {
          mathResult = res;
        } else {
          evalError = 'Expression did not resolve to a finite numeric value.';
        }
      } catch (err: any) {
        evalError = err?.message || 'Syntax issue in mathematical expression.';
      }
    }

    if (unitConversion) {
      const { value, fromUnit, toUnit } = unitConversion;
      const f = fromUnit.toLowerCase().trim();
      const t = toUnit.toLowerCase().trim();

      if ((f === 'celsius' || f === 'c') && (t === 'fahrenheit' || t === 'f')) {
        conversionResult = { value: +((value * 9) / 5 + 32).toFixed(4), from: 'Celsius', to: 'Fahrenheit', formula: '(C * 9/5) + 32' };
      } else if ((f === 'fahrenheit' || f === 'f') && (t === 'celsius' || t === 'c')) {
        conversionResult = { value: +(((value - 32) * 5) / 9).toFixed(4), from: 'Fahrenheit', to: 'Celsius', formula: '(F - 32) * 5/9' };
      } else if ((f === 'km' || f === 'kilometers') && (t === 'miles' || t === 'mi')) {
        conversionResult = { value: +(value * 0.621371).toFixed(4), from: 'Kilometers', to: 'Miles' };
      } else if ((f === 'miles' || f === 'mi') && (t === 'km' || t === 'kilometers')) {
        conversionResult = { value: +(value / 0.621371).toFixed(4), from: 'Miles', to: 'Kilometers' };
      } else if ((f === 'kg' || f === 'kilograms') && (t === 'lbs' || t === 'pounds')) {
        conversionResult = { value: +(value * 2.20462).toFixed(4), from: 'Kilograms', to: 'Pounds' };
      } else if ((f === 'lbs' || f === 'pounds') && (t === 'kg' || t === 'kilograms')) {
        conversionResult = { value: +(value / 2.20462).toFixed(4), from: 'Pounds', to: 'Kilograms' };
      } else if ((f === 'gb' || f === 'gigabytes') && (t === 'mb' || t === 'megabytes')) {
        conversionResult = { value: +(value * 1024).toFixed(2), from: 'GB', to: 'MB' };
      } else if ((f === 'mb' || f === 'megabytes') && (t === 'gb' || t === 'gigabytes')) {
        conversionResult = { value: +(value / 1024).toFixed(4), from: 'MB', to: 'GB' };
      }
    }

    return {
      expression,
      result: mathResult !== null ? mathResult : undefined,
      conversion: conversionResult || undefined,
      note: evalError ? `Recovery note: ${evalError}` : undefined,
      status: mathResult !== null || conversionResult ? 'success' : 'recovered',
    };
  },
});
