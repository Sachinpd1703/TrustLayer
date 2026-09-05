import { PolicyEvaluationBreakdown, DecisionResult, ApprovalTier } from "@/lib/types";
import { VelocityTracker } from "./velocity-tracker";
import { RiskScorer } from "./risk-scorer";

export interface AgentFinancialProfile {
  totalSpentPaise: number;
  monthlyBudgetCap: number;
  dailySpendCap: number;
  maxPerOrderCap: number;
}

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
   * Deterministically evaluates an inbound transaction proposal against multi-tier policy rules and agent budgets.
   */
  static async evaluate(params: {
    agentId: string;
    amountPaise: number;
    currency: string;
    merchantId: string;
    mccCode?: string;
    intent: string;
    reasoningText?: string;
    timestamp?: Date;
    agentProfile?: AgentFinancialProfile;
    policy: MultiTierPolicyRuleset;
  }): Promise<DecisionResult> {
    const {
      agentId,
      amountPaise,
      currency,
      merchantId,
      mccCode = "5734",
      intent,
      reasoningText,
      timestamp = new Date(),
      agentProfile = {
        totalSpentPaise: 0,
        monthlyBudgetCap: 10000000,
        dailySpendCap: 2000000,
        maxPerOrderCap: 500000,
      },
      policy,
    } = params;

    // 1. Calculate Velocity & Risk Score
    const rolling24hSpendPaise = await VelocityTracker.getRollingSpendPaise(agentId);
    const riskScore = RiskScorer.evaluate({ intent, reasoningText, amountPaise, merchantId });


    // Effective limits (Strictest between Agent Profile and Global Policy)
    const effectiveTier1Cap = Math.min(policy.tier1MaxOrderPaise, agentProfile.maxPerOrderCap);
    const effectiveDailyLimit = Math.min(policy.dailySpendLimitPaise, agentProfile.dailySpendCap);

    // 2. Initial Breakdown Matrix
    const breakdown: PolicyEvaluationBreakdown = {
      spendCapCheck: "PASSED",
      merchantWhitelistCheck: "PASSED",
      mccCheck: "PASSED",
      temporalCheck: "PASSED",
      velocityCheck: "PASSED",
      budgetCheck: "PASSED",
      currencyCheck: "PASSED",
      riskScoreCheck: "PASSED",
      details: {
        requestedAmountPaise: amountPaise,
        tier1MaxOrderPaise: effectiveTier1Cap,
        tier2ThresholdPaise: policy.tier2ThresholdPaise,
        tier3ThresholdPaise: policy.tier3ThresholdPaise,
        hardCeilingPaise: policy.hardCeilingPaise,
        rolling24hSpendPaise,
        dailySpendLimitPaise: effectiveDailyLimit,
        agentTotalSpentPaise: agentProfile.totalSpentPaise,
        agentMonthlyBudgetCap: agentProfile.monthlyBudgetCap,
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

    // --- Agent Monthly Budget Cap Check ---
    if (agentProfile.totalSpentPaise + amountPaise > agentProfile.monthlyBudgetCap) {
      breakdown.budgetCheck = "EXCEEDED_MONTHLY_BUDGET";
    }

    // --- Check Daily Rolling Spend Cap ---
    if (rolling24hSpendPaise + amountPaise > effectiveDailyLimit) {
      breakdown.velocityCheck = "FAILED_VELOCITY_CAP_EXCEEDED";
    }

    // --- Check Temporal Working Hours ---
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

    // 1. Hard DENY (Security violations, blacklisted MCC, unlisted merchants, or hard ceiling)
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

    // 3. Tier 2: Single Manager Step-Up Approval
    // Triggered if:
    // - Agent Monthly Budget is Exceeded!
    // - Order exceeds per-order auto-cap
    // - Daily velocity cap is exceeded
    // - After-hours transaction
    // - Moderate risk score
    if (
      breakdown.budgetCheck === "EXCEEDED_MONTHLY_BUDGET" ||
      amountPaise > effectiveTier1Cap ||
      breakdown.velocityCheck === "FAILED_VELOCITY_CAP_EXCEEDED" ||
      breakdown.temporalCheck === "FLAGGED_AFTER_HOURS" ||
      riskScore >= policy.riskScoreThreshold
    ) {
      breakdown.spendCapCheck = "EXCEEDED_REQUIRES_APPROVAL";
      breakdown.details.approvalTier = "TIER_SINGLE_MANAGER";

      const reasons: string[] = [];
      if (breakdown.budgetCheck === "EXCEEDED_MONTHLY_BUDGET") {
        reasons.push(
          `Agent monthly budget (₹${(agentProfile.monthlyBudgetCap / 100).toLocaleString()}) exceeded (Current Total Spent: ₹${(
            agentProfile.totalSpentPaise / 100
          ).toLocaleString()})`
        );
      }
      if (amountPaise > effectiveTier1Cap) {
        reasons.push(`Amount ₹${(amountPaise / 100).toLocaleString()} exceeds autonomous limit of ₹${(effectiveTier1Cap / 100).toLocaleString()}`);
      }
      if (breakdown.velocityCheck === "FAILED_VELOCITY_CAP_EXCEEDED") {
        reasons.push(`Cumulative 24h spend (₹${((rolling24hSpendPaise + amountPaise) / 100).toLocaleString()}) exceeds daily limit of ₹${(effectiveDailyLimit / 100).toLocaleString()}`);
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

    // 4. Tier 1: 100% Autonomous Auto-Approval (Budget & Velocity & Single-Order all within limits)
    breakdown.details.approvalTier = "TIER_AUTONOMOUS";
    return {
      decision: "ALLOW",
      approvalTier: "TIER_AUTONOMOUS",
      reason: `Auto-approved: Within ₹${(effectiveTier1Cap / 100).toLocaleString()} spend cap, monthly budget & verified vendor whitelist.`,
      violations: [],
      evaluation: breakdown,
    };
  }
}
