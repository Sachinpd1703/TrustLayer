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

    // Check Currency
    if (!policy.allowedCurrencies.includes(currency.toUpperCase())) {
      breakdown.currencyCheck = "FAILED_UNSUPPORTED_CURRENCY";
      violations.push(`Currency '${currency}' is not in allowed list [${policy.allowedCurrencies.join(", ")}]`);
    }

    // Check Merchant Allowlist
    const isMerchantAllowed = policy.allowedMerchants.some((m) =>
      merchantId.toLowerCase().includes(m.toLowerCase())
    );
    if (!isMerchantAllowed) {
      breakdown.merchantWhitelistCheck = "FAILED_UNAUTHORIZED_MERCHANT";
      violations.push(`Merchant ID '${merchantId}' is not authorized on the approved vendor whitelist.`);
    }

    // Check Daily Rolling Spend Cap
    if (rolling24hSpendPaise + amountPaise > policy.dailySpendLimitPaise) {
      breakdown.velocityCheck = "FAILED_VELOCITY_CAP_EXCEEDED";
      violations.push(
        `Cumulative 24h spend (₹${((rolling24hSpendPaise + amountPaise) / 100).toLocaleString()}) exceeds daily cap of ₹${(
          policy.dailySpendLimitPaise / 100
        ).toLocaleString()}`
      );
    }

    // Check Hard Ceiling vs Step-Up Approval
    if (amountPaise > policy.hardCeilingPaise) {
      breakdown.spendCapCheck = "EXCEEDED_HARD_CEILING";
      violations.push(`Amount ₹${(amountPaise / 100).toLocaleString()} exceeds absolute safety ceiling of ₹${(policy.hardCeilingPaise / 100).toLocaleString()}`);
    } else if (amountPaise > policy.maxOrderPaise) {
      breakdown.spendCapCheck = "EXCEEDED_REQUIRES_APPROVAL";
    }

    // Check Risk Score
    if (riskScore >= policy.riskScoreThreshold) {
      breakdown.riskScoreCheck = "FLAGGED_HIGH_RISK";
      if (riskScore >= 0.7) {
        violations.push(`High anomaly/prompt-injection risk detected (Risk Score: ${riskScore})`);
      }
    }

    // -------------------------------------------------------------
    // DECISION ROUTER LOGIC
    // -------------------------------------------------------------
    // 1. Hard DENY cases:
    if (
      breakdown.merchantWhitelistCheck !== "PASSED" ||
      breakdown.currencyCheck !== "PASSED" ||
      breakdown.spendCapCheck === "EXCEEDED_HARD_CEILING" ||
      breakdown.velocityCheck !== "PASSED" ||
      riskScore >= 0.7
    ) {
      return {
        decision: "DENY",
        reason: violations.join(" | ") || "Hard policy violation.",
        violations,
        evaluation: breakdown,
      };
    }

    // 2. REQUIRE_APPROVAL cases:
    if (
      breakdown.spendCapCheck === "EXCEEDED_REQUIRES_APPROVAL" ||
      breakdown.riskScoreCheck === "FLAGGED_HIGH_RISK"
    ) {
      const reason =
        breakdown.spendCapCheck === "EXCEEDED_REQUIRES_APPROVAL"
          ? `Amount ₹${(amountPaise / 100).toLocaleString()} exceeds autonomous limit of ₹${(
              policy.maxOrderPaise / 100
            ).toLocaleString()}. Step-up human approval required.`
          : `Moderate anomaly risk score (${riskScore}). Step-up human approval required.`;

      return {
        decision: "REQUIRE_APPROVAL",
        reason,
        violations: [],
        evaluation: breakdown,
      };
    }

    // 3. ALLOW case:
    return {
      decision: "ALLOW",
      reason: `Auto-approved: Within ₹${(policy.maxOrderPaise / 100).toLocaleString()} spend cap & verified vendor whitelist.`,
      violations: [],
      evaluation: breakdown,
    };
  }
}
