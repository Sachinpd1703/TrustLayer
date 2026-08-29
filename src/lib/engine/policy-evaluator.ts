import { PolicyEvaluationBreakdown, DecisionResult, ApprovalTier } from "@/lib/types";
import { VelocityTracker } from "./velocity-tracker";
import { RiskScorer } from "./risk-scorer";

export interface MultiTierPolicyRuleset {
  tier1MaxOrderPaise: number;
  tier2ThresholdPaise: number;
  tier3ThresholdPaise: number;
  hardCeilingPaise: number;
  dailySpendLimitPaise: number;
  allowedCurrencies: string[];
  allowedMccs: string[];
  blockedMccs: string[];
  allowedMerchants: string[];
  enforceWorkingHours: boolean;
  workingDays: string[];
  startHourUtc: number;
  endHourUtc: number;
  riskScoreThreshold: number;
}

export class PolicyEvaluator {
  /**
   * Deterministically evaluates an inbound transaction proposal against multi-tier policy rules.
   */
  static evaluate(params: {
    agentId: string;
    amountPaise: number;
    currency: string;
    merchantId: string;
    mccCode?: string;
    intent: string;
    reasoningText?: string;
    timestamp?: Date;
    policy: MultiTierPolicyRuleset;
  }): DecisionResult {
    const {
      agentId,
      amountPaise,
      currency,
      merchantId,
      mccCode = "5734",
      intent,
      reasoningText,
      timestamp = new Date(),
      policy,
    } = params;

    // 1. Calculate Velocity & Risk Score
    const rolling24hSpendPaise = VelocityTracker.getRollingSpendPaise(agentId);
    const riskScore = RiskScorer.evaluate({ intent, reasoningText, amountPaise, merchantId });

    // 2. Initial Breakdown Matrix
    const breakdown: PolicyEvaluationBreakdown = {
      spendCapCheck: "PASSED",
      merchantWhitelistCheck: "PASSED",
      mccCheck: "PASSED",
      temporalCheck: "PASSED",
      velocityCheck: "PASSED",
      currencyCheck: "PASSED",
      riskScoreCheck: "PASSED",
      details: {
        requestedAmountPaise: amountPaise,
        tier1MaxOrderPaise: policy.tier1MaxOrderPaise,
        tier2ThresholdPaise: policy.tier2ThresholdPaise,
        tier3ThresholdPaise: policy.tier3ThresholdPaise,
        hardCeilingPaise: policy.hardCeilingPaise,
        rolling24hSpendPaise,
        dailySpendLimitPaise: policy.dailySpendLimitPaise,
        merchantId,
        mccCode,
        riskScore,
        approvalTier: "TIER_AUTONOMOUS",
      },
    };

    const violations: string[] = [];

    // --- Hard Safety Rule 1: Currency Check ---
    if (!policy.allowedCurrencies.includes(currency.toUpperCase())) {
      breakdown.currencyCheck = "FAILED_UNSUPPORTED_CURRENCY";
      violations.push(`Currency '${currency}' is not in allowed list [${policy.allowedCurrencies.join(", ")}]`);
    }

    // --- Hard Safety Rule 2: Merchant Allowlist Check ---
    const isMerchantAllowed = policy.allowedMerchants.some((m) =>
      merchantId.toLowerCase().includes(m.toLowerCase())
    );
    if (!isMerchantAllowed) {
      breakdown.merchantWhitelistCheck = "FAILED_UNAUTHORIZED_MERCHANT";
      violations.push(`Merchant ID '${merchantId}' is not authorized on the approved vendor whitelist.`);
    }

    // --- Hard Safety Rule 3: Blocked MCC Check ---
    if (policy.blockedMccs.includes(mccCode)) {
      breakdown.mccCheck = "FAILED_BLOCKED_MCC";
      violations.push(`MCC code '${mccCode}' is strictly blocked by enterprise policy.`);
    }

    // --- Hard Safety Rule 4: Absolute Hard Ceiling ---
    if (amountPaise > policy.hardCeilingPaise) {
      breakdown.spendCapCheck = "EXCEEDED_HARD_CEILING";
      violations.push(`Amount ₹${(amountPaise / 100).toLocaleString()} exceeds absolute safety ceiling of ₹${(policy.hardCeilingPaise / 100).toLocaleString()}`);
    }

    // --- Hard Safety Rule 5: Critical Prompt Injection ---
    if (riskScore >= 0.70) {
      breakdown.riskScoreCheck = "FLAGGED_HIGH_RISK";
      violations.push(`Critical prompt-injection / anomaly risk detected (Risk Score: ${riskScore})`);
    }

    // Check Daily Rolling Spend Cap
    if (rolling24hSpendPaise + amountPaise > policy.dailySpendLimitPaise) {
      breakdown.velocityCheck = "FAILED_VELOCITY_CAP_EXCEEDED";
    }

    // Check Temporal Working Hours
    if (policy.enforceWorkingHours) {
      const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
      const currentDay = days[timestamp.getUTCDay()];
      const currentHour = timestamp.getUTCHours();

      const isDayAllowed = policy.workingDays.includes(currentDay);
      const isHourAllowed = currentHour >= policy.startHourUtc && currentHour < policy.endHourUtc;

      if (!isDayAllowed || !isHourAllowed) {
        breakdown.temporalCheck = "FLAGGED_AFTER_HOURS";
      }
    }

    // -------------------------------------------------------------
    // DECISION ROUTER LOGIC
    // -------------------------------------------------------------

    // 1. Hard DENY (Security violations or exceeding hard ceiling)
    if (
      breakdown.merchantWhitelistCheck !== "PASSED" ||
      breakdown.currencyCheck !== "PASSED" ||
      breakdown.mccCheck !== "PASSED" ||
      breakdown.spendCapCheck === "EXCEEDED_HARD_CEILING" ||
      riskScore >= 0.70
    ) {
      breakdown.details.approvalTier = "TIER_DENY";
      return {
        decision: "DENY",
        approvalTier: "TIER_DENY",
        reason: violations.join(" | ") || "Hard policy violation.",
        violations,
        evaluation: breakdown,
      };
    }

    // 2. Tier 3: Dual-Custody Multi-Signatory (> tier2Threshold & <= tier3Threshold)
    if (amountPaise > policy.tier2ThresholdPaise) {
      breakdown.details.approvalTier = "TIER_DUAL_CUSTODY";
      return {
        decision: "REQUIRE_APPROVAL",
        approvalTier: "TIER_DUAL_CUSTODY",
        reason: `Amount ₹${(amountPaise / 100).toLocaleString()} requires Dual-Custody Multi-Signatory Approval (Department Lead + Finance Lead).`,
        violations: [],
        evaluation: breakdown,
      };
    }

    // 3. Tier 2: Single Manager Approval (Tier 1 Cap exceeded, Velocity overflow, or After-hours)
    if (
      amountPaise > policy.tier1MaxOrderPaise ||
      breakdown.velocityCheck === "FAILED_VELOCITY_CAP_EXCEEDED" ||
      breakdown.temporalCheck === "FLAGGED_AFTER_HOURS" ||
      riskScore >= policy.riskScoreThreshold
    ) {
      breakdown.spendCapCheck = "EXCEEDED_REQUIRES_APPROVAL";
      breakdown.details.approvalTier = "TIER_SINGLE_MANAGER";

      const reasons: string[] = [];
      if (amountPaise > policy.tier1MaxOrderPaise) {
        reasons.push(`Amount ₹${(amountPaise / 100).toLocaleString()} exceeds autonomous limit of ₹${(policy.tier1MaxOrderPaise / 100).toLocaleString()}`);
      }
      if (breakdown.velocityCheck === "FAILED_VELOCITY_CAP_EXCEEDED") {
        reasons.push(`Cumulative 24h spend (₹${((rolling24hSpendPaise + amountPaise) / 100).toLocaleString()}) exceeds daily limit of ₹${(policy.dailySpendLimitPaise / 100).toLocaleString()}`);
      }
      if (breakdown.temporalCheck === "FLAGGED_AFTER_HOURS") {
        reasons.push("After-hours transaction outside scheduled working hours");
      }
      if (riskScore >= policy.riskScoreThreshold) {
        reasons.push(`Moderate risk score (${riskScore})`);
      }

      return {
        decision: "REQUIRE_APPROVAL",
        approvalTier: "TIER_SINGLE_MANAGER",
        reason: `${reasons.join(" & ")}. Step-up manager approval required.`,
        violations: [],
        evaluation: breakdown,
      };
    }

    // 4. Tier 1: 100% Autonomous Auto-Approval
    breakdown.details.approvalTier = "TIER_AUTONOMOUS";
    return {
      decision: "ALLOW",
      approvalTier: "TIER_AUTONOMOUS",
      reason: `Auto-approved: Within ₹${(policy.tier1MaxOrderPaise / 100).toLocaleString()} spend cap & verified vendor whitelist.`,
      violations: [],
      evaluation: breakdown,
    };
  }
}
