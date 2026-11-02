import type { Database } from './models.js';
import { kstDate } from './date.js';

function positiveNumber(value: string | undefined, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

export function monthlyCost(db: Database, now = new Date()) {
  const month = kstDate(now).slice(0, 7);
  const stats = db.dailyStats.filter(item => item.date.startsWith(month));
  const inputTokens = stats.reduce((sum, item) => sum + (item.anthropicInputTokens ?? 0), 0);
  const outputTokens = stats.reduce((sum, item) => sum + (item.anthropicOutputTokens ?? 0), 0);
  const sttRequests = stats.reduce((sum, item) => sum + (item.sttRequests ?? 0), 0);
  const usdKrw = positiveNumber(process.env.USD_KRW_RATE, 1500);
  const inputPerMillion = positiveNumber(process.env.ANTHROPIC_INPUT_USD_PER_M, 1);
  const outputPerMillion = positiveNumber(process.env.ANTHROPIC_OUTPUT_USD_PER_M, 5);
  const sttPerMinute = positiveNumber(process.env.OPENAI_STT_USD_PER_MIN, 0.003);
  const estimatedKrw = Math.ceil((inputTokens / 1_000_000 * inputPerMillion + outputTokens / 1_000_000 * outputPerMillion + sttRequests * 0.5 * sttPerMinute) * usdKrw);
  return { month, inputTokens, outputTokens, sttRequests, estimatedKrw, budgetKrw: positiveNumber(process.env.MONTHLY_AI_BUDGET_KRW, 4500) };
}
