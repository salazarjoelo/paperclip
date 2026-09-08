import { describe, expect, it } from "vitest";
import {
  estimateSubscriptionCostCents,
  resolveSubscriptionEstimatedCostCents,
  resolveSubscriptionModelRates,
} from "./subscription-estimates.js";

// Measured 30-day cost_events totals (2026-08 → 2026-09) for the Z.AI
// subscription lane, used as a regression anchor: the whole lane should land
// near the ~$43/mo equivalent burn cited in EDU-92.
const MEASURED_30D = {
  "glm-5.3": { inputTokens: 3_445_018, cachedInputTokens: 108_560_704, outputTokens: 1_599_787 },
  "glm-5.3-flash": { inputTokens: 790_359, cachedInputTokens: 14_856_960, outputTokens: 225_446 },
  "glm-4.7-flash": { inputTokens: 123_583_144, cachedInputTokens: 415_729_605, outputTokens: 5_901_155 },
  "claude-sonnet-4-6": { inputTokens: 1_135_864, cachedInputTokens: 29_259_328, outputTokens: 228_244 },
};

describe("resolveSubscriptionModelRates", () => {
  it("resolves exact glm model ids case-insensitively", () => {
    expect(resolveSubscriptionModelRates("glm-5.3")).toEqual({
      inputPerMTokens: 1.4,
      cachedInputPerMTokens: 0.26,
      outputPerMTokens: 4.4,
    });
    expect(resolveSubscriptionModelRates("GLM-5.3-Flash")).toEqual(resolveSubscriptionModelRates("glm-5.3-flash"));
    expect(resolveSubscriptionModelRates(" glm-4.7-flash ")).toEqual({
      inputPerMTokens: 0,
      cachedInputPerMTokens: 0,
      outputPerMTokens: 0,
    });
  });

  it("maps claude aliases onto plan tiers", () => {
    const primary = resolveSubscriptionModelRates("glm-5.3");
    const flash = resolveSubscriptionModelRates("glm-5.3-flash");
    expect(resolveSubscriptionModelRates("claude-sonnet-4-6")).toEqual(primary);
    expect(resolveSubscriptionModelRates("claude-opus-5")).toEqual(primary);
    expect(resolveSubscriptionModelRates("claude-fable-5-20260101")).toEqual(primary);
    expect(resolveSubscriptionModelRates("claude-haiku-4-5")).toEqual(flash);
    expect(resolveSubscriptionModelRates("claude-3-5-haiku-20241022")).toEqual(flash);
  });

  it("returns null for models without declared rates", () => {
    expect(resolveSubscriptionModelRates("glm-4.5-flash")).toBeNull();
    expect(resolveSubscriptionModelRates("openai/gpt-oss-120b")).toBeNull();
    expect(resolveSubscriptionModelRates("groq/compound")).toBeNull();
    expect(resolveSubscriptionModelRates("")).toBeNull();
    expect(resolveSubscriptionModelRates(null)).toBeNull();
  });
});

describe("estimateSubscriptionCostCents", () => {
  it("prices input, cached input, and output at list rates", () => {
    // 1M in / 2M cached / 3M out on glm-5.3 → $1.40 + $0.52 + $13.20 = $15.12
    expect(
      estimateSubscriptionCostCents(
        { inputTokens: 1_000_000, cachedInputTokens: 2_000_000, outputTokens: 3_000_000 },
        { inputPerMTokens: 1.4, cachedInputPerMTokens: 0.26, outputPerMTokens: 4.4 },
      ),
    ).toBe(1512);
  });

  it("never returns negative cents", () => {
    expect(
      estimateSubscriptionCostCents(
        { inputTokens: -5, cachedInputTokens: 0, outputTokens: 0 },
        { inputPerMTokens: 1.4, cachedInputPerMTokens: 0.26, outputPerMTokens: 4.4 },
      ),
    ).toBe(0);
  });
});

describe("resolveSubscriptionEstimatedCostCents", () => {
  const lane = {
    adapterType: "claude_local",
    provider: "anthropic",
    billingType: "subscription_included",
    model: "glm-5.3",
  };

  it("estimates the measured 30-day lane near the ~$43 equivalent burn", () => {
    const totalCents = Object.entries(MEASURED_30D).reduce((sum, [model, usage]) => {
      const cents = resolveSubscriptionEstimatedCostCents({ ...lane, model, usage });
      expect(cents).not.toBeNull();
      return sum + (cents ?? 0);
    }, 0);
    // glm-5.3 ≈ $40.09 dominates; sonnet (primary-tier alias) ≈ $10.20,
    // flash ≈ $0.68, free 4.7-flash ≈ $0.
    expect(totalCents).toBeGreaterThan(5000);
    expect(totalCents).toBeLessThan(5200);
  });

  it("estimates free plan models at zero, not null", () => {
    expect(
      resolveSubscriptionEstimatedCostCents({
        ...lane,
        model: "glm-4.7-flash",
        usage: MEASURED_30D["glm-4.7-flash"],
      }),
    ).toBe(0);
  });

  it("keeps non-claude_local adapters out of the estimate lane", () => {
    expect(
      resolveSubscriptionEstimatedCostCents({
        ...lane,
        adapterType: "codex_local",
        usage: MEASURED_30D["glm-5.3"],
      }),
    ).toBeNull();
  });

  it("keeps metered/api runs on their real reported cost", () => {
    expect(
      resolveSubscriptionEstimatedCostCents({
        ...lane,
        billingType: "metered_api",
        usage: MEASURED_30D["glm-5.3"],
      }),
    ).toBeNull();
    expect(
      resolveSubscriptionEstimatedCostCents({
        ...lane,
        billingType: "api",
        usage: MEASURED_30D["glm-5.3"],
      }),
    ).toBeNull();
  });

  it("keeps other providers and unknown models at null", () => {
    expect(
      resolveSubscriptionEstimatedCostCents({
        ...lane,
        provider: "groq",
        usage: MEASURED_30D["glm-5.3"],
      }),
    ).toBeNull();
    expect(
      resolveSubscriptionEstimatedCostCents({
        ...lane,
        model: "glm-4.5-flash",
        usage: MEASURED_30D["glm-5.3"],
      }),
    ).toBeNull();
  });

  it("does not estimate runs without token usage", () => {
    expect(
      resolveSubscriptionEstimatedCostCents({
        ...lane,
        usage: { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 },
      }),
    ).toBeNull();
  });
});
