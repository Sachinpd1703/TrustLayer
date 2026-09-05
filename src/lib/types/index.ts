export type DecisionType = "ALLOW" | "REQUIRE_APPROVAL" | "DENY";

export type ApprovalTier = "TIER_AUTONOMOUS" | "TIER_SINGLE_MANAGER" | "TIER_DUAL_CUSTODY" | "TIER_DENY";

export type TransactionStatus =
  | "EXECUTED"
  | "PENDING_APPROVAL"
  | "BLOCKED"
  | "FAILED"
  | "REJECTED";

export interface BeneficiaryPayload {
  employeeEmail: string;
  employeeName?: string;
  employeeId?: string;
  departmentCode?: string;
  workspaceId?: string;
  licenseType?: string;
}

export interface PolicyEvaluationBreakdown {
  spendCapCheck: "PASSED" | "EXCEEDED_REQUIRES_APPROVAL" | "EXCEEDED_HARD_CEILING";
  merchantWhitelistCheck: "PASSED" | "FAILED_UNAUTHORIZED_MERCHANT";
  mccCheck: "PASSED" | "FAILED_BLOCKED_MCC";
  temporalCheck: "PASSED" | "FLAGGED_AFTER_HOURS";
  velocityCheck: "PASSED" | "FAILED_VELOCITY_CAP_EXCEEDED";
  budgetCheck: "PASSED" | "EXCEEDED_MONTHLY_BUDGET";
  currencyCheck: "PASSED" | "FAILED_UNSUPPORTED_CURRENCY";
  riskScoreCheck: "PASSED" | "FLAGGED_HIGH_RISK";
  details: {
    requestedAmountPaise: number;
    tier1MaxOrderPaise: number;
    tier2ThresholdPaise: number;
    tier3ThresholdPaise: number;
    hardCeilingPaise: number;
    rolling24hSpendPaise: number;
    dailySpendLimitPaise: number;
    agentTotalSpentPaise: number;
    agentMonthlyBudgetCap: number;
    merchantId: string;
    mccCode: string;
    riskScore: number;
    approvalTier: ApprovalTier;
  };
}

export interface DecisionResult {
  decision: DecisionType;
  approvalTier: ApprovalTier;
  reason: string;
  violations: string[];
  evaluation: PolicyEvaluationBreakdown;
  approvalId?: string;
  razorpayOrderId?: string;
  virtualCardId?: string;
}

export interface LiveStreamEvent {
  id: string;
  type:
    | "TRANSACTION_PROPOSAL"
    | "APPROVAL_DECISION"
    | "KILL_SWITCH_TRIGGERED"
    | "AGENT_PROVISIONED"
    | "LICENSE_PROVISIONED"
    | "VIRTUAL_CARD_MINTED";
  timestamp: string;
  agentId: string;
  amountPaise: number;
  currency: string;
  merchantId: string;
  intent: string;
  decision: DecisionType;
  reason: string;
  razorpayOrderId?: string;
  riskScore: number;
}
