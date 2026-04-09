// ─── Token Usage Tracking ──────────────────────────────────────────
// In-memory token usage tracker for monitoring Claude API costs during development.

export interface TokenUsageEntry {
  operation: string;
  input_tokens: number;
  output_tokens: number;
  timestamp: number; // Date.now()
}

export interface TokenUsageSummary {
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  today_input_tokens: number;
  today_output_tokens: number;
  today_total_tokens: number;
  today_estimated_cost_usd: number;
  by_operation: Record<
    string,
    {
      call_count: number;
      input_tokens: number;
      output_tokens: number;
      total_tokens: number;
      estimated_cost_usd: number;
    }
  >;
  entry_count: number;
}

// Sonnet pricing (per token)
const INPUT_COST_PER_TOKEN = 3.0 / 1_000_000; // $3.00 per 1M input tokens
const OUTPUT_COST_PER_TOKEN = 15.0 / 1_000_000; // $15.00 per 1M output tokens

const usageEntries: TokenUsageEntry[] = [];

export function trackTokenUsage(
  operation: string,
  usage: { input_tokens: number; output_tokens: number }
): void {
  usageEntries.push({
    operation,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    timestamp: Date.now(),
  });
}

function estimateCost(inputTokens: number, outputTokens: number): number {
  return inputTokens * INPUT_COST_PER_TOKEN + outputTokens * OUTPUT_COST_PER_TOKEN;
}

function startOfTodayMs(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

export function getTokenUsage(): TokenUsageSummary {
  const todayStart = startOfTodayMs();

  let totalInput = 0;
  let totalOutput = 0;
  let todayInput = 0;
  let todayOutput = 0;
  const byOp: TokenUsageSummary['by_operation'] = {};

  for (const entry of usageEntries) {
    totalInput += entry.input_tokens;
    totalOutput += entry.output_tokens;

    if (entry.timestamp >= todayStart) {
      todayInput += entry.input_tokens;
      todayOutput += entry.output_tokens;
    }

    const op = byOp[entry.operation] ?? {
      call_count: 0,
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      estimated_cost_usd: 0,
    };
    op.call_count += 1;
    op.input_tokens += entry.input_tokens;
    op.output_tokens += entry.output_tokens;
    op.total_tokens += entry.input_tokens + entry.output_tokens;
    op.estimated_cost_usd = estimateCost(op.input_tokens, op.output_tokens);
    byOp[entry.operation] = op;
  }

  return {
    total_input_tokens: totalInput,
    total_output_tokens: totalOutput,
    total_tokens: totalInput + totalOutput,
    estimated_cost_usd: estimateCost(totalInput, totalOutput),
    today_input_tokens: todayInput,
    today_output_tokens: todayOutput,
    today_total_tokens: todayInput + todayOutput,
    today_estimated_cost_usd: estimateCost(todayInput, todayOutput),
    by_operation: byOp,
    entry_count: usageEntries.length,
  };
}
