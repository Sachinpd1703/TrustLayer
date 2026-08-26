import { z } from "zod";

// 1. Agent Payment Proposal Schema
export const ProposePaymentSchema = z.object({
  agentId: z.string().min(2, "Agent ID is required"),
  intent: z.string().min(3, "Declared intent is required"),
  reasoningText: z.string().optional(),
  reasoningHash: z.string().regex(/^sha256:[a-f0-9]{64}$/i, "Must be a valid SHA-256 hash formatted as sha256:..."),
  orderPayload: z.object({
    amountPaise: z.number().int().positive("Amount must be positive in paise"),
    currency: z.string().default("INR"),
    merchantId: z.string().min(2, "Target Merchant ID is required"),
    category: z.string().default("General_SaaS"),
    receipt: z.string().optional(),
    notes: z.record(z.string()).optional(),
  }),
});

export type ProposePaymentInput = z.infer<typeof ProposePaymentSchema>;

// 2. Human Approval Decision Schema
export const ApprovalDecisionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  approverEmail: z.string().email("Valid approver email required"),
  decisionNotes: z.string().optional(),
});

export type ApprovalDecisionInput = z.infer<typeof ApprovalDecisionSchema>;

// 3. Agent Registration & Update Schema
export const RegisterAgentSchema = z.object({
  agentId: z.string().min(3),
  name: z.string().min(2),
  description: z.string().optional(),
  publicKey: z.string().min(32),
  role: z.string().default("BUYER_AGENT"),
  ownerEmail: z.string().email(),
  maxPerOrderCap: z.number().int().positive().default(500000), // in paise
  dailySpendCap: z.number().int().positive().default(2000000), // in paise
});

export type RegisterAgentInput = z.infer<typeof RegisterAgentSchema>;

// 4. Policy Configuration Schema
export const PolicyRuleSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  maxOrderPaise: z.number().int().positive().default(500000),
  hardCeilingPaise: z.number().int().positive().default(5000000),
  dailySpendLimitPaise: z.number().int().positive().default(2000000),
  allowedCurrencies: z.array(z.string()).default(["INR"]),
  allowedMccs: z.array(z.string()).default(["5734", "7372"]),
  allowedMerchants: z.array(z.string()).default(["mid_slack_01", "mid_figma_01", "mid_aws_01"]),
  riskScoreThreshold: z.number().min(0).max(1).default(0.35),
});

export type PolicyRuleInput = z.infer<typeof PolicyRuleSchema>;
