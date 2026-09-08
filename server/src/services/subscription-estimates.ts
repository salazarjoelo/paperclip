// Estimated (non-cash) cost for subscription-billed claude_local runs (EDU-92).
//
// The Z.AI GLM Coding Plan is served through the Anthropic-compatible endpoint
// (`ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic`), so the Claude CLI runs
// without `ANTHROPIC_API_KEY`, the adapter reports `billingType=subscription`,
// and `normalizeBilledCostCents` correctly books $0 in the cash ledger. Tokens
// are still recorded, so the list-price equivalent can be computed as an
// ESTIMATE for burn visibility (per agent/model/day) without touching any real
// billing. Rates are estimates at Z.AI list prices, not invoiced amounts.

/** USD per 1M tokens at Z.AI list prices. */
export interface SubscriptionModelRates {
  inputPerMTokens: number;
  cachedInputPerMTokens: number;
  outputPerMTokens: number;
}

export interface SubscriptionTokenUsage {
  /** Uncached input tokens plus cache-creation tokens (both billed as input). */
  inputTokens: number;
  /** Cache-read tokens. */
  cachedInputTokens: number;
  outputTokens: number;
}

const FREE_RATES: SubscriptionModelRates = {
  inputPerMTokens: 0,
  cachedInputPerMTokens: 0,
  outputPerMTokens: 0,
};

// glm-5.3: $1.40 in / $4.40 out / $0.26 cached (plan primary model).
// glm-5.3-flash: $0.15 in / $0.50 out; cached billed at $0.03 — the plan does
// not publish a flash cache-read rate, so the 5.3 ratio (0.26/1.40 ≈ 18.6%) is
// applied. glm-4.7-flash is free on the plan. Models without a declared entry
// (e.g. glm-4.5-flash, seen only in old runs) resolve to null and keep today's
// $0/unpriced ledger behavior — no rate is ever invented.
export const ZAI_SUBSCRIPTION_MODEL_RATES: Record<string, SubscriptionModelRates> = {
  "glm-5.3": { inputPerMTokens: 1.4, cachedInputPerMTokens: 0.26, outputPerMTokens: 4.4 },
  "glm-5.3-flash": { inputPerMTokens: 0.15, cachedInputPerMTokens: 0.03, outputPerMTokens: 0.5 },
  "glm-4.7-flash": FREE_RATES,
};

// The Z.AI Anthropic-compatible endpoint serves claude-* model ids transparently:
// sonnet/opus/fable-class requests run on the plan's primary model, haiku-class
// on the flash tier. Covers any versioned spelling (claude-sonnet-4-6,
// claude-3-5-haiku-20241022, ...).
const CLAUDE_ALIAS_FAMILY_RE = /claude-(?:[0-9][0-9a-z.-]*-)?(sonnet|opus|fable|haiku)\b/i;

const CLAUDE_ALIAS_FAMILY_TARGET: Record<string, string> = {
  sonnet: "glm-5.3",
  opus: "glm-5.3",
  fable: "glm-5.3",
  haiku: "glm-5.3-flash",
};

export function resolveSubscriptionModelRates(model: string | null | undefined): SubscriptionModelRates | null {
  const normalized = (model ?? "").trim().toLowerCase();
  if (!normalized) return null;
  if (Object.prototype.hasOwnProperty.call(ZAI_SUBSCRIPTION_MODEL_RATES, normalized)) {
    return ZAI_SUBSCRIPTION_MODEL_RATES[normalized];
  }
  const aliasMatch = CLAUDE_ALIAS_FAMILY_RE.exec(normalized);
  if (aliasMatch) {
    const target = CLAUDE_ALIAS_FAMILY_TARGET[(aliasMatch[1] ?? "").toLowerCase()];
    if (target) return ZAI_SUBSCRIPTION_MODEL_RATES[target] ?? null;
  }
  return null;
}

export function estimateSubscriptionCostCents(
  usage: SubscriptionTokenUsage,
  rates: SubscriptionModelRates,
): number {
  const usd =
    (usage.inputTokens / 1_000_000) * rates.inputPerMTokens +
    (usage.cachedInputTokens / 1_000_000) * rates.cachedInputPerMTokens +
    (usage.outputTokens / 1_000_000) * rates.outputPerMTokens;
  return Math.max(0, Math.round(usd * 100));
}

/**
 * Estimated list-price cost in cents for the Z.AI subscription lane of
 * claude_local, or null when the run must keep its current ledger behavior.
 * Only subscription-included anthropic runs with a model in the rate table are
 * estimated; metered/API runs keep their real reported cost and unknown models
 * stay $0/unpriced.
 */
export function resolveSubscriptionEstimatedCostCents(input: {
  adapterType: string | null | undefined;
  provider: string | null | undefined;
  billingType: string | null | undefined;
  model: string | null | undefined;
  usage: SubscriptionTokenUsage;
}): number | null {
  if ((input.adapterType ?? "") !== "claude_local") return null;
  if ((input.billingType ?? "") !== "subscription_included") return null;
  if ((input.provider ?? "") !== "anthropic") return null;
  if (
    input.usage.inputTokens <= 0 &&
    input.usage.cachedInputTokens <= 0 &&
    input.usage.outputTokens <= 0
  ) {
    return null;
  }
  const rates = resolveSubscriptionModelRates(input.model);
  if (!rates) return null;
  return estimateSubscriptionCostCents(input.usage, rates);
}
