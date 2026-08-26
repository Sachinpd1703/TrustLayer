export type DecisionType = "ALLOW" | "REQUIRE_APPROVAL" | "DENY";

export type TransactionStatus =
  | "EXECUTED"
  | "PENDING_APPROVAL"
  | "BLOCKED"
  | "FAILED"
  | "REJECTED";

export interface PolicyEvaluationBreakdown {
  spendCapCheck: "PASSED" | "EXCEEDED_REQUIRES_APPROVAL" | "EXCEEDED_HARD_CEILING";
  merchantWhitelistCheck: "PASSED" | "FAILED_UNAUTHORIZED_MERCHANT";
  velocityCheck: "PASSED" | "FAILED_VELOCITY_CAP_EXCEEDED";
  currencyCheck: "PASSED" | "FAILED_UNSUPPORTED_CURRENCY";
  riskScoreCheck: "PASSED" | "FLAGGED_HIGH_RISK";
  details: {
    requestedAmountPaise: number;
    maxOrderPaise: number;
    rolling24hSpendPaise: number;
    dailySpendLimitPaise: number;
    merchantId: string;
    riskScore: number;
  };
}

export interface DecisionResult {
  decision: DecisionType;
  reason: string;
  violations: string[];
  evaluation: PolicyEvaluationBreakdown;
  approvalId?: string;
  razorpayOrderId?: string;
}

export interface LiveStreamEvent {
  id: string;
  type: "TRANSACTION_PROPOSAL" | "APPROVAL_DECISION" | "KILL_SWITCH_TRIGGERED";
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
