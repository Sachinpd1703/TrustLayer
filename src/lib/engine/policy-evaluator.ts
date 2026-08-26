import { PolicyEvaluationBreakdown, DecisionResult } from "@/lib/types";
import { VelocityTracker } from "./velocity-tracker";
import { RiskScorer } from "./risk-scorer";

export interface PolicyRuleset {
  maxOrderPaise: number;
  hardCeilingPaise: number;
  dailySpendLimitPaise: number;
  allowedCurrencies: string[];
  allowedMerchants: string[];
  riskScoreThreshold: number;
}

export class PolicyEvaluator {
  /**
   * Deterministically evaluates an inbound transaction proposal against active policy rules.
   */
  static evaluate(params: {
    agentId: string;
    amountPaise: number;
    currency: string;
    merchantId: string;
    intent: string;
    reasoningText?: string;
    policy: PolicyRuleset;
  }): DecisionResult {
    const { agentId, amountPaise, currency, merchantId, intent, reasoningText, policy } = params;

    // 1. Calculate Velocity & Risk Score
    const rolling24hSpendPaise = VelocityTracker.getRollingSpendPaise(agentId);
    const riskScore = RiskScorer.evaluate({ intent, reasoningText, amountPaise, merchantId });

    // 2. Breakdown Matrix
    const breakdown: PolicyEvaluationBreakdown = {
      spendCapCheck: "PASSED",
      merchantWhitelistCheck: "PASSED",
      velocityCheck: "PASSED",
      currencyCheck: "PASSED",
      riskScoreCheck: "PASSED",
      details: {
        requestedAmountPaise: amountPaise,
        maxOrderPaise: policy.maxOrderPaise,
        rolling24hSpendPaise,
        dailySpendLimitPaise: policy.dailySpendLimitPaise,
        merchantId,
        riskScore,
      },
    };

    const violations: string[] = [];

    // Check Currency (Hard Safety Rule)
    if (!policy.allowedCurrencies.includes(currency.toUpperCase())) {
      breakdown.currencyCheck = "FAILED_UNSUPPORTED_CURRENCY";
      violations.push(`Currency '${currency}' is not in allowed list [${policy.allowedCurrencies.join(", ")}]`);
    }

    // Check Merchant Allowlist (Hard Safety Rule)
    const isMerchantAllowed = policy.allowedMerchants.some((m) =>
      merchantId.toLowerCase().includes(m.toLowerCase())
    );
    if (!isMerchantAllowed) {
      breakdown.merchantWhitelistCheck = "FAILED_UNAUTHORIZED_MERCHANT";
      violations.push(`Merchant ID '${merchantId}' is not authorized on the approved vendor whitelist.`);
    }

    // Check Absolute Hard Ceiling (Hard Safety Rule)
    if (amountPaise > policy.hardCeilingPaise) {
      breakdown.spendCapCheck = "EXCEEDED_HARD_CEILING";
      violations.push(`Amount ₹${(amountPaise / 100).toLocaleString()} exceeds absolute safety ceiling of ₹${(policy.hardCeilingPaise / 100).toLocaleString()}`);
    } else if (amountPaise > policy.maxOrderPaise) {
      breakdown.spendCapCheck = "EXCEEDED_REQUIRES_APPROVAL";
    }

    // Check Daily Rolling Spend Cap
    if (rolling24hSpendPaise + amountPaise > policy.dailySpendLimitPaise) {
      breakdown.velocityCheck = "FAILED_VELOCITY_CAP_EXCEEDED";
    }

    // Check Risk Score
    if (riskScore >= policy.riskScoreThreshold) {
      breakdown.riskScoreCheck = "FLAGGED_HIGH_RISK";
      if (riskScore >= 0.7) {
        violations.push(`Critical anomaly/prompt-injection risk detected (Risk Score: ${riskScore})`);
      }
    }

    // -------------------------------------------------------------
    // DECISION ROUTER LOGIC
    // -------------------------------------------------------------
    // 1. Hard DENY cases (Security breaches, unlisted merchants, or exceeding hard ceiling)
    if (
      breakdown.merchantWhitelistCheck !== "PASSED" ||
      breakdown.currencyCheck !== "PASSED" ||
      breakdown.spendCapCheck === "EXCEEDED_HARD_CEILING" ||
      riskScore >= 0.7
    ) {
      return {
        decision: "DENY",
        reason: violations.join(" | ") || "Hard policy violation.",
        violations,
        evaluation: breakdown,
      };
    }

    // 2. REQUIRE_APPROVAL cases (High-value order, velocity overflow, or moderate risk score)
    if (
      breakdown.spendCapCheck === "EXCEEDED_REQUIRES_APPROVAL" ||
      breakdown.velocityCheck === "FAILED_VELOCITY_CAP_EXCEEDED" ||
      breakdown.riskScoreCheck === "FLAGGED_HIGH_RISK"
    ) {
      const reasons: string[] = [];
      if (breakdown.spendCapCheck === "EXCEEDED_REQUIRES_APPROVAL") {
        reasons.push(`Amount ₹${(amountPaise / 100).toLocaleString()} exceeds autonomous limit of ₹${(policy.maxOrderPaise / 100).toLocaleString()}`);
      }
      if (breakdown.velocityCheck === "FAILED_VELOCITY_CAP_EXCEEDED") {
        reasons.push(`Order puts cumulative spend at ₹${((rolling24hSpendPaise + amountPaise) / 100).toLocaleString()}, exceeding daily cap of ₹${(policy.dailySpendLimitPaise / 100).toLocaleString()}`);
      }
      if (breakdown.riskScoreCheck === "FLAGGED_HIGH_RISK") {
        reasons.push(`Moderate risk score (${riskScore})`);
      }

      return {
        decision: "REQUIRE_APPROVAL",
        reason: `${reasons.join(" & ")}. Step-up human approval required.`,
        violations: [],
        evaluation: breakdown,
      };
    }

    // 3. ALLOW case (Everything within limits)
    return {
      decision: "ALLOW",
      reason: `Auto-approved: Within ₹${(policy.maxOrderPaise / 100).toLocaleString()} spend cap & verified vendor whitelist.`,
      violations: [],
      evaluation: breakdown,
    };
  }
}
