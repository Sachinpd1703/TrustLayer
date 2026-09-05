import { z } from "zod";

// 1. Beneficiary Employee Identity Schema
export const BeneficiarySchema = z.object({
  employeeEmail: z.string().email("Valid employee corporate email required"),
  employeeName: z.string().optional(),
  employeeId: z.string().optional(),
  departmentCode: z.string().optional(),
  workspaceId: z.string().optional(),
  licenseType: z.string().optional(),
});

export type BeneficiaryInput = z.infer<typeof BeneficiarySchema>;

// 2. Agent Payment Proposal Schema
export const ProposePaymentSchema = z.object({
  agentId: z.string().min(2, "Agent ID is required"),
  intent: z.string().min(3, "Declared intent is required"),
  reasoningText: z.string().optional(),
  reasoningHash: z.string().regex(/^sha256:[a-f0-9]{64}$/i, "Must be a valid SHA-256 hash formatted as sha256:..."),
  beneficiary: BeneficiarySchema.optional(),
  orderPayload: z.object({
    amountPaise: z.number().int().positive("Amount must be positive in paise"),
    currency: z.string().default("INR"),
    merchantId: z.string().min(2, "Target Merchant ID is required"),
    sku: z.string().optional(),
    category: z.string().default("General_SaaS"),
    mccCode: z.string().optional().default("5734"),
    issueVirtualCard: z.boolean().optional().default(false),
    receipt: z.string().optional(),
    notes: z.record(z.string()).optional(),
  }),
});

export type ProposePaymentInput = z.infer<typeof ProposePaymentSchema>;

// 3. Human Approval Decision Schema
export const ApprovalDecisionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  approverEmail: z.string().email("Valid approver email required"),
  decisionNotes: z.string().optional(),
  isSecondApprover: z.boolean().optional().default(false),
});

export type ApprovalDecisionInput = z.infer<typeof ApprovalDecisionSchema>;

// 4. Agent Registration & Provisioning Schema
export const RegisterAgentSchema = z.object({
  agentId: z.string().min(3, "Agent ID must be at least 3 characters"),
  name: z.string().min(2, "Agent Name is required"),
  description: z.string().optional(),
  publicKey: z.string().optional(),
  role: z.string().default("BUYER_AGENT"),
  ownerEmail: z.string().email("Valid owner email required"),
  departmentId: z.string().optional(),
  maxPerOrderCap: z.number().int().positive().default(500000),     // in paise (₹5,000)
  dailySpendCap: z.number().int().positive().default(2000000),      // in paise (₹20,000)
  monthlyBudgetCap: z.number().int().positive().default(10000000),  // in paise (₹1,00,000)
  generateToken: z.boolean().default(true),
});

export type RegisterAgentInput = z.infer<typeof RegisterAgentSchema>;

// 5. Multi-Tier Policy Configuration Schema
export const PolicyRuleSchema = z.object({
  name: z.string().min(3, "Policy name must be at least 3 characters"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  departmentId: z.string().optional(),
  tier1MaxOrderPaise: z.number().int().positive().default(500000),    // <= ₹5,000 (Auto-allow)
  tier2ThresholdPaise: z.number().int().positive().default(2500000),  // <= ₹25,000 (Single manager)
  tier3ThresholdPaise: z.number().int().positive().default(10000000), // <= ₹1,00,000 (Dual custody)
  hardCeilingPaise: z.number().int().positive().default(10000000),    // > ₹1,00,000 (Hard deny)
  dailySpendLimitPaise: z.number().int().positive().default(2000000), // ₹20,000 rolling 24h
  allowedCurrencies: z.array(z.string()).default(["INR"]),
  allowedMccs: z.array(z.string()).default(["5734", "7372", "4816", "7011", "4511"]),
  blockedMccs: z.array(z.string()).default(["6051", "7995", "4829"]),
  allowedMerchants: z.array(z.string()).default([
    "mid_slack_01",
    "mid_figma_01",
    "mid_aws_01",
    "mid_github_01",
    "mid_cloudflare_01",
    "mid_taj_hotels",
    "mid_indigo_air",
  ]),
  enforceWorkingHours: z.boolean().default(false),
  workingDays: z.array(z.string()).default(["MON", "TUE", "WED", "THU", "FRI"]),
  startHourUtc: z.number().min(0).max(23).default(3),
  endHourUtc: z.number().min(0).max(23).default(14),
  riskScoreThreshold: z.number().min(0).max(1).default(0.35),
});

export type PolicyRuleInput = z.infer<typeof PolicyRuleSchema>;

// 6. Webhook Integration Schema
export const WebhookIntegrationSchema = z.object({
  channel: z.enum(["TELEGRAM", "WHATSAPP", "SLACK", "CUSTOM_HTTP"]),
  name: z.string().min(2),
  webhookUrl: z.string().url("Must be a valid URL"),
  channelId: z.string().optional(),
  secretToken: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type WebhookIntegrationInput = z.infer<typeof WebhookIntegrationSchema>;
